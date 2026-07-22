import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";

import express, { type Request, type Response } from "express";
import { z } from "zod";

import prisma from "../db/prisma.js";
import {
  requireAuth,
  requireRole,
  type AuthenticatedRequest,
} from "../middlewares/auth.middleware.js";
import { createAuditLog } from "../services/audit-log.service.js";
import {
  getManagerScope,
  hasManagerScope,
} from "../services/manager-scope.service.js";
import { type Prisma } from "../generated/prisma/client.js";
import { asyncHandler } from "../utils/async-handler.js";
import { HttpError } from "../utils/http-error.js";
import { buildPaginationMeta, getPaginationParams } from "../utils/pagination.js";
import { siteBlockImageUpload } from "../uploads/site-block-image-upload.js";
import { isAllowedImageFile } from "../utils/image-signature.js";
import { isValidIban, maskIban, normalizeIban } from "../utils/iban.js";

const router = express.Router();

router.use(requireAuth);

const createSiteSchema = z.object({
  name: z.string().trim().min(2),
  address: z.string().trim().min(2),
  description: z.string().trim().optional(),
  imageUrl: z.string().trim().url().optional(),
  hasElevator: z.boolean().optional().default(false),
  systems: z.array(z.string().trim().min(1)).optional().default([]),
  isActive: z.boolean().optional().default(true),
});

const optionalManagerIdSchema = z.string().uuid().optional();

const createSiteWithStructureSchema = createSiteSchema
  .extend({
    siteManagerId: optionalManagerIdSchema,
    blocks: z
      .array(
        z.object({
          name: z.string().trim().min(1).max(100),
          description: z.string().trim().max(500).optional(),
          apartmentCount: z.number().int().min(1).max(1000),
          managerId: optionalManagerIdSchema,
        })
      )
      .min(1)
      .max(100),
  })
  .superRefine((data, context) => {
    const normalizedBlockNames = new Set<string>();
    let totalApartmentCount = 0;

    data.blocks.forEach((block, index) => {
      const normalizedName = block.name.toLocaleLowerCase("tr-TR");

      if (normalizedBlockNames.has(normalizedName)) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["blocks", index, "name"],
          message: "Aynı isimle birden fazla blok/apartman eklenemez.",
        });
      }

      if (
        data.siteManagerId &&
        block.managerId &&
        data.siteManagerId === block.managerId
      ) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["blocks", index, "managerId"],
          message:
            "Site genel yöneticisi aynı bloğa ayrıca atanamaz. Genel yönetici tüm siteyi görebilir.",
        });
      }

      normalizedBlockNames.add(normalizedName);
      totalApartmentCount += block.apartmentCount;
    });

    if (totalApartmentCount > 5000) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["blocks"],
        message: "Bir site için toplam daire sayısı en fazla 5000 olabilir.",
      });
    }
  });

const updateSiteSchema = z
  .object({
    name: z.string().trim().min(2).optional(),
    address: z.string().trim().min(2).optional(),
    description: z.string().trim().nullable().optional(),
    imageUrl: z.string().trim().url().nullable().optional(),
    hasElevator: z.boolean().optional(),
    systems: z.array(z.string().trim().min(1)).optional(),
    isActive: z.boolean().optional(),
  })
  .strict()
  .refine((data) => Object.values(data).some((value) => value !== undefined), {
    message: "En az bir alan gönderilmelidir.",
  });



const upsertManagerSiteBankAccountSchema = z
  .object({
    bankName: z.string().trim().min(2).max(120),
    branchName: z.string().trim().max(120).nullable().optional(),
    accountHolder: z.string().trim().min(2).max(160),
    accountNumber: z.string().trim().max(80).nullable().optional(),
    iban: z.string().trim().min(15).max(42),
    currency: z.enum(["TRY", "EUR", "USD"]).optional().default("TRY"),
  })
  .strict()
  .superRefine((data, context) => {
    if (!isValidIban(data.iban)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["iban"],
        message: "IBAN bilgisi geçerli değildir.",
      });
    }
  });

const superAdminBankAccountQuerySchema = z
  .object({
    managerId: z.string().uuid().optional(),
  })
  .strict();

const managerSiteBankAccountSelect = {
  id: true,
  managerId: true,
  siteId: true,
  bankName: true,
  branchName: true,
  accountHolder: true,
  accountNumber: true,
  iban: true,
  currency: true,
  createdAt: true,
  updatedAt: true,
} as const;

function getRequiredParam(request: Request, paramName: string) {
  const paramValue = request.params[paramName];

  if (typeof paramValue !== "string" || paramValue.trim().length === 0) {
    throw new HttpError(400, "Site id bilgisi zorunludur.");
  }

  return paramValue;
}


function normalizeNullableText(value: string | null | undefined) {
  if (value === undefined || value === null) {
    return null;
  }

  const normalizedValue = value.trim();

  return normalizedValue.length > 0 ? normalizedValue : null;
}

function maskAccountNumber(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  const compactValue = value.replace(/\s+/g, "");

  if (compactValue.length <= 4) {
    return compactValue;
  }

  return `${"*".repeat(Math.max(0, compactValue.length - 4))}${compactValue.slice(-4)}`;
}


async function ensureManagerCanUseSiteBankAccount(params: {
  managerId: string;
  siteId: string;
}) {
  const managerScope = await getManagerScope(params.managerId);

  if (!hasManagerScope(managerScope)) {
    throw new HttpError(
      403,
      "Bu yöneticiye atanmış aktif bir site veya blok bulunamadı."
    );
  }

  if (managerScope.siteIds.includes(params.siteId)) {
    return;
  }

  if (managerScope.blockIds.length > 0) {
    const accessibleBlock = await prisma.block.findFirst({
      where: {
        id: {
          in: managerScope.blockIds,
        },
        siteId: params.siteId,
      },
      select: {
        id: true,
      },
    });

    if (accessibleBlock) {
      return;
    }
  }

  throw new HttpError(
    403,
    "Aktif çalışma alanınız bu siteye ait değildir."
  );
}

async function ensureManagerHasAssignmentInSite(params: {
  managerId: string;
  siteId: string;
}) {
  const assignment = await prisma.managerAssignment.findFirst({
    where: {
      managerId: params.managerId,
      OR: [
        {
          scopeType: "SITE",
          siteId: params.siteId,
        },
        {
          scopeType: "BLOCK",
          block: {
            siteId: params.siteId,
          },
        },
      ],
    },
    select: {
      id: true,
    },
  });

  if (!assignment) {
    throw new HttpError(
      404,
      "Bu yönetici için seçilen sitede görev kaydı bulunamadı."
    );
  }
}

async function deleteUploadedImage(file?: Express.Multer.File) {
  if (!file) {
    return;
  }

  try {
    await fs.unlink(file.path);
  } catch (error) {
    console.error("Yüklenen görsel dosyası silinemedi:", error);
  }
}

function buildSiteBlockImageUrl(fileName: string) {
  return "/uploads/site-block-images/" + fileName;
}

async function deleteStoredSiteBlockImage(imageUrl?: string | null) {
  if (!imageUrl || !imageUrl.startsWith("/uploads/site-block-images/")) {
    return;
  }

  const storedFileName = path.basename(imageUrl);

  try {
    await fs.unlink(
      path.join(process.cwd(), "uploads", "site-block-images", storedFileName)
    );
  } catch {
    // Eski görsel dosyası bulunamazsa işlemi durdurmayalım.
  }
}

function getSiteBlockImageContentType(imageUrl: string) {
  const fileExtension = path.extname(imageUrl).toLowerCase();

  if (fileExtension === ".png") {
    return "image/png";
  }

  if (fileExtension === ".jpg" || fileExtension === ".jpeg") {
    return "image/jpeg";
  }

  if (fileExtension === ".webp") {
    return "image/webp";
  }

  throw new HttpError(400, "Görsel dosya türü desteklenmiyor.");
}

async function ensureUserCanAccessSiteImage(params: {
  user: AuthenticatedRequest["user"];
  siteId: string;
}) {
  if (!params.user) {
    throw new HttpError(401, "Oturum bulunamadı.");
  }

  if (params.user.role === "SUPER_ADMIN") {
    return;
  }

  if (params.user.role === "MANAGER") {
    const managerScope = await getManagerScope(params.user.id);

    if (!hasManagerScope(managerScope)) {
      throw new HttpError(
        403,
        "Bu yöneticiye atanmış bir site veya blok bulunamadı."
      );
    }

    if (managerScope.siteIds.includes(params.siteId)) {
      return;
    }

    if (managerScope.blockIds.length > 0) {
      const accessibleBlock = await prisma.block.findFirst({
        where: {
          id: {
            in: managerScope.blockIds,
          },
          siteId: params.siteId,
        },
        select: {
          id: true,
        },
      });

      if (accessibleBlock) {
        return;
      }
    }
  }

  throw new HttpError(403, "Bu site görselini görüntüleme yetkiniz yok.");
}


router.get(
  "/my-bank-account",
  requireRole("RESIDENT"),
  asyncHandler(async (request: Request, response: Response) => {
    const authenticatedRequest = request as AuthenticatedRequest;

    if (!authenticatedRequest.user) {
      throw new HttpError(401, "Oturum bulunamadı.");
    }

    const selectedApartment =
      authenticatedRequest.user.selectedApartment?.apartment;

    if (!selectedApartment) {
      throw new HttpError(
        409,
        "Banka bilgilerini görmek için aktif daire seçmelisiniz."
      );
    }

    const blockId = selectedApartment.block.id;
    const site = selectedApartment.block.site;

    const managerSelect = {
      id: true,
      fullName: true,
      email: true,
    } as const;

    const blockAssignments = await prisma.managerAssignment.findMany({
      where: {
        scopeType: "BLOCK",
        blockId,
        manager: {
          role: "MANAGER",
          status: "ACTIVE",
        },
      },
      select: {
        manager: {
          select: managerSelect,
        },
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    const blockManagerMap = new Map(
      blockAssignments.map((assignment) => [
        assignment.manager.id,
        assignment.manager,
      ])
    );

    let responsibleManagers = Array.from(blockManagerMap.values());
    let responsibilityLevel: "BLOCK" | "SITE" = "BLOCK";

    /*
     * Blok yöneticisi varsa önceliklidir. Blok yöneticisi yoksa
     * site genel yöneticisine geçilir.
     */
    if (responsibleManagers.length === 0) {
      responsibilityLevel = "SITE";

      const siteAssignments = await prisma.managerAssignment.findMany({
        where: {
          scopeType: "SITE",
          siteId: site.id,
          manager: {
            role: "MANAGER",
            status: "ACTIVE",
          },
        },
        select: {
          manager: {
            select: managerSelect,
          },
        },
        orderBy: {
          createdAt: "asc",
        },
      });

      responsibleManagers = Array.from(
        new Map(
          siteAssignments.map((assignment) => [
            assignment.manager.id,
            assignment.manager,
          ])
        ).values()
      );
    }

    const baseData = {
      apartment: {
        id: selectedApartment.id,
        number: selectedApartment.number,
      },
      block: {
        id: selectedApartment.block.id,
        name: selectedApartment.block.name,
      },
      site: {
        id: site.id,
        name: site.name,
      },
      responsibilityLevel,
    };

    if (responsibleManagers.length === 0) {
      response.status(200).json({
        success: true,
        data: {
          ...baseData,
          status: "MANAGER_NOT_ASSIGNED",
          isConfigured: false,
          manager: null,
          bankAccount: null,
        },
      });
      return;
    }

    if (responsibleManagers.length > 1) {
      response.status(200).json({
        success: true,
        data: {
          ...baseData,
          status: "MULTIPLE_MANAGERS",
          isConfigured: false,
          manager: null,
          managers: responsibleManagers,
          bankAccount: null,
        },
      });
      return;
    }

    const responsibleManager = responsibleManagers[0];

    const bankAccount = await prisma.managerSiteBankAccount.findUnique({
      where: {
        managerId_siteId: {
          managerId: responsibleManager.id,
          siteId: site.id,
        },
      },
      select: managerSiteBankAccountSelect,
    });

    response.status(200).json({
      success: true,
      data: {
        ...baseData,
        status: bankAccount
          ? "CONFIGURED"
          : "BANK_ACCOUNT_MISSING",
        isConfigured: Boolean(bankAccount),
        manager: responsibleManager,
        bankAccount,
      },
    });
  })
);

router.get(
  "/bank-accounts/overview",
  requireRole("SUPER_ADMIN"),
  asyncHandler(async (_request: Request, response: Response) => {
    const assignments = await prisma.managerAssignment.findMany({
      where: {
        manager: {
          role: "MANAGER",
        },
      },
      select: {
        managerId: true,
        scopeType: true,
        manager: {
          select: {
            id: true,
            fullName: true,
            email: true,
            status: true,
          },
        },
        site: {
          select: {
            id: true,
            name: true,
          },
        },
        block: {
          select: {
            id: true,
            name: true,
            site: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    type OverviewRow = {
      manager: {
        id: string;
        fullName: string;
        email: string;
        status: "ACTIVE" | "PASSIVE";
      };
      site: {
        id: string;
        name: string;
      };
      hasSiteScope: boolean;
      blocks: Map<string, string>;
    };

    const overviewMap = new Map<string, OverviewRow>();

    for (const assignment of assignments) {
      const site =
        assignment.scopeType === "SITE"
          ? assignment.site
          : assignment.block?.site;

      if (!site) {
        continue;
      }

      const mapKey = `${assignment.managerId}:${site.id}`;
      const currentRow = overviewMap.get(mapKey) ?? {
        manager: assignment.manager,
        site,
        hasSiteScope: false,
        blocks: new Map<string, string>(),
      };

      if (assignment.scopeType === "SITE") {
        currentRow.hasSiteScope = true;
      }

      if (assignment.scopeType === "BLOCK" && assignment.block) {
        currentRow.blocks.set(
          assignment.block.id,
          assignment.block.name
        );
      }

      overviewMap.set(mapKey, currentRow);
    }

    const overviewRows = Array.from(overviewMap.entries());

    const bankAccounts =
      overviewRows.length > 0
        ? await prisma.managerSiteBankAccount.findMany({
            where: {
              OR: overviewRows.map(([, row]) => ({
                managerId: row.manager.id,
                siteId: row.site.id,
              })),
            },
            select: managerSiteBankAccountSelect,
          })
        : [];

    const bankAccountMap = new Map(
      bankAccounts.map((bankAccount) => [
        `${bankAccount.managerId}:${bankAccount.siteId}`,
        bankAccount,
      ])
    );

    const data = overviewRows
      .map(([mapKey, row]) => {
        const blockNames = Array.from(row.blocks.values()).sort((left, right) =>
          left.localeCompare(right, "tr-TR")
        );

        return {
          manager: row.manager,
          site: row.site,
          responsibleAreas: row.hasSiteScope
            ? ["Tüm Site"]
            : blockNames,
          isConfigured: bankAccountMap.has(mapKey),
          bankAccount: bankAccountMap.get(mapKey) ?? null,
        };
      })
      .sort((left, right) => {
        const siteComparison = left.site.name.localeCompare(
          right.site.name,
          "tr-TR"
        );

        if (siteComparison !== 0) {
          return siteComparison;
        }

        return left.manager.fullName.localeCompare(
          right.manager.fullName,
          "tr-TR"
        );
      });

    response.status(200).json({
      success: true,
      data,
    });
  })
);

router.get(
  "/:siteId/bank-account",
  requireRole("SUPER_ADMIN", "MANAGER"),
  asyncHandler(async (request: Request, response: Response) => {
    const authenticatedRequest = request as AuthenticatedRequest;

    if (!authenticatedRequest.user) {
      throw new HttpError(401, "Oturum bulunamadı.");
    }

    const siteId = getRequiredParam(request, "siteId");

    const site = await prisma.site.findUnique({
      where: {
        id: siteId,
      },
      select: {
        id: true,
        name: true,
      },
    });

    if (!site) {
      throw new HttpError(404, "Site bulunamadı.");
    }

    let managerId = authenticatedRequest.user.id;

    if (authenticatedRequest.user.role === "MANAGER") {
      await ensureManagerCanUseSiteBankAccount({
        managerId,
        siteId,
      });
    } else {
      const queryResult = superAdminBankAccountQuerySchema.safeParse({
        managerId: request.query.managerId,
      });

      if (!queryResult.success) {
        throw new HttpError(
          400,
          "Yönetici seçimi geçersiz.",
          queryResult.error.flatten().fieldErrors
        );
      }

      if (!queryResult.data.managerId) {
        const managerCount = await prisma.managerAssignment.findMany({
          where: {
            OR: [
              {
                scopeType: "SITE",
                siteId,
              },
              {
                scopeType: "BLOCK",
                block: {
                  siteId,
                },
              },
            ],
          },
          distinct: ["managerId"],
          select: {
            managerId: true,
          },
          take: 2,
        });

        response.status(200).json({
          success: true,
          data: {
            site,
            requiresManagerSelection: managerCount.length > 0,
            managerCount: managerCount.length,
            isConfigured: false,
            bankAccount: null,
          },
        });
        return;
      }

      managerId = queryResult.data.managerId;

      await ensureManagerHasAssignmentInSite({
        managerId,
        siteId,
      });
    }

    const manager = await prisma.user.findUnique({
      where: {
        id: managerId,
      },
      select: {
        id: true,
        fullName: true,
        email: true,
        status: true,
      },
    });

    if (!manager || manager.status !== "ACTIVE") {
      throw new HttpError(404, "Aktif yönetici bulunamadı.");
    }

    const bankAccount = await prisma.managerSiteBankAccount.findUnique({
      where: {
        managerId_siteId: {
          managerId,
          siteId,
        },
      },
      select: managerSiteBankAccountSelect,
    });

    response.status(200).json({
      success: true,
      data: {
        manager,
        site,
        isConfigured: Boolean(bankAccount),
        bankAccount,
      },
    });
  })
);

router.put(
  "/:siteId/bank-account",
  requireRole("MANAGER"),
  asyncHandler(async (request: Request, response: Response) => {
    const authenticatedRequest = request as AuthenticatedRequest;

    if (!authenticatedRequest.user) {
      throw new HttpError(401, "Oturum bulunamadı.");
    }

    const managerId = authenticatedRequest.user.id;
    const siteId = getRequiredParam(request, "siteId");

    await ensureManagerCanUseSiteBankAccount({
      managerId,
      siteId,
    });

    const validationResult =
      upsertManagerSiteBankAccountSchema.safeParse(request.body);

    if (!validationResult.success) {
      throw new HttpError(
        400,
        "Gönderilen banka bilgileri geçersiz.",
        validationResult.error.flatten().fieldErrors
      );
    }

    const [targetSite, manager, previousBankAccount] = await Promise.all([
      prisma.site.findUnique({
        where: {
          id: siteId,
        },
        select: {
          id: true,
          name: true,
        },
      }),
      prisma.user.findUnique({
        where: {
          id: managerId,
        },
        select: {
          id: true,
          fullName: true,
          email: true,
        },
      }),
      prisma.managerSiteBankAccount.findUnique({
        where: {
          managerId_siteId: {
            managerId,
            siteId,
          },
        },
        select: managerSiteBankAccountSelect,
      }),
    ]);

    if (!targetSite) {
      throw new HttpError(404, "Site bulunamadı.");
    }

    if (!manager) {
      throw new HttpError(404, "Yönetici bulunamadı.");
    }

    const {
      bankName,
      branchName,
      accountHolder,
      accountNumber,
      iban,
      currency,
    } = validationResult.data;

    const normalizedIban = normalizeIban(iban);
    const normalizedBranchName = normalizeNullableText(branchName);
    const normalizedAccountNumber = normalizeNullableText(accountNumber);

    const bankAccount = await prisma.managerSiteBankAccount.upsert({
      where: {
        managerId_siteId: {
          managerId,
          siteId,
        },
      },
      create: {
        managerId,
        siteId,
        bankName,
        branchName: normalizedBranchName,
        accountHolder,
        accountNumber: normalizedAccountNumber,
        iban: normalizedIban,
        currency,
      },
      update: {
        bankName,
        branchName: normalizedBranchName,
        accountHolder,
        accountNumber: normalizedAccountNumber,
        iban: normalizedIban,
        currency,
      },
      select: managerSiteBankAccountSelect,
    });

    await createAuditLog({
      request,
      userId: managerId,
      action: previousBankAccount
        ? "UPDATE_MANAGER_SITE_BANK_ACCOUNT"
        : "CREATE_MANAGER_SITE_BANK_ACCOUNT",
      entityType: "ManagerSiteBankAccount",
      entityId: bankAccount.id,
      metadata: {
        managerId,
        managerName: manager.fullName,
        siteId: targetSite.id,
        siteName: targetSite.name,
        previous: previousBankAccount
          ? {
              bankName: previousBankAccount.bankName,
              branchName: previousBankAccount.branchName,
              accountHolder: previousBankAccount.accountHolder,
              accountNumber: maskAccountNumber(
                previousBankAccount.accountNumber
              ),
              iban: maskIban(previousBankAccount.iban),
              currency: previousBankAccount.currency,
            }
          : null,
        current: {
          bankName: bankAccount.bankName,
          branchName: bankAccount.branchName,
          accountHolder: bankAccount.accountHolder,
          accountNumber: maskAccountNumber(bankAccount.accountNumber),
          iban: maskIban(bankAccount.iban),
          currency: bankAccount.currency,
        },
      },
    });

    response.status(previousBankAccount ? 200 : 201).json({
      success: true,
      message: previousBankAccount
        ? "Yönetici banka bilgileri başarıyla güncellendi."
        : "Yönetici banka bilgileri başarıyla oluşturuldu.",
      data: {
        manager,
        site: targetSite,
        isConfigured: true,
        bankAccount,
      },
    });
  })
);

router.get(
  "/:siteId/image",
  asyncHandler(async (request: Request, response: Response) => {
    const authenticatedRequest = request as AuthenticatedRequest;
    const siteId = getRequiredParam(request, "siteId");

    const site = await prisma.site.findUnique({
      where: {
        id: siteId,
      },
      select: {
        id: true,
        imageUrl: true,
      },
    });

    if (!site) {
      throw new HttpError(404, "Site bulunamadı.");
    }

    await ensureUserCanAccessSiteImage({
      user: authenticatedRequest.user,
      siteId,
    });

    if (!site.imageUrl) {
      throw new HttpError(404, "Site görseli bulunamadı.");
    }

    const imageContentType = getSiteBlockImageContentType(site.imageUrl);
    const imageFilePath = path.join(
      process.cwd(),
      "uploads",
      "site-block-images",
      path.basename(site.imageUrl)
    );

    try {
      const imageBuffer = await fs.readFile(imageFilePath);

      response.setHeader("Content-Type", imageContentType);
      response.status(200).send(imageBuffer);
    } catch {
      throw new HttpError(404, "Site görsel dosyası bulunamadı.");
    }
  })
);

router.get(
  "/",
  requireRole("SUPER_ADMIN", "MANAGER"),
  asyncHandler(async (request: Request, response: Response) => {
    const authenticatedRequest = request as AuthenticatedRequest;

    if (!authenticatedRequest.user) {
      throw new HttpError(401, "Oturum bulunamadı.");
    }

    const paginationParams = getPaginationParams(request.query);

    if (!paginationParams.success) {
      throw new HttpError(
        400,
        "Sayfalama bilgileri geçersiz.",
        paginationParams.errors
      );
    }

    let whereCondition: Prisma.SiteWhereInput = paginationParams.search
      ? {
          OR: [
            {
              name: {
                contains: paginationParams.search,
                mode: "insensitive",
              },
            },
            {
              address: {
                contains: paginationParams.search,
                mode: "insensitive",
              },
            },
            {
              description: {
                contains: paginationParams.search,
                mode: "insensitive",
              },
            },
          ],
        }
      : {};

    if (authenticatedRequest.user.role === "MANAGER") {
      const managerScope = await getManagerScope(authenticatedRequest.user.id);

      if (!hasManagerScope(managerScope)) {
        throw new HttpError(
          403,
          "Bu yöneticiye atanmış bir site veya blok bulunamadı."
        );
      }

      const managerFilters: Prisma.SiteWhereInput[] = [];

      if (managerScope.siteIds.length > 0) {
        managerFilters.push({
          id: {
            in: managerScope.siteIds,
          },
        });
      }

      if (managerScope.blockIds.length > 0) {
        managerFilters.push({
          blocks: {
            some: {
              id: {
                in: managerScope.blockIds,
              },
            },
          },
        });
      }

      whereCondition = {
        AND: [
          whereCondition,
          {
            OR: managerFilters,
          },
        ],
      };
    }

    const [sites, totalCount] = await Promise.all([
      prisma.site.findMany({
        where: whereCondition,
        include: {
          blocks: {
            select: {
              id: true,
              name: true,
              description: true,
              createdAt: true,
              updatedAt: true,
              _count: {
                select: {
                  apartments: true,
                },
              },
            },
            orderBy: {
              createdAt: "asc",
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
        skip: paginationParams.skip,
        take: paginationParams.limit,
      }),
      prisma.site.count({
        where: whereCondition,
      }),
    ]);

    response.status(200).json({
      success: true,
      data: sites,
      pagination: buildPaginationMeta({
        page: paginationParams.page,
        limit: paginationParams.limit,
        totalCount,
      }),
    });
  })
);

router.post(
  "/with-structure",
  requireRole("SUPER_ADMIN"),
  asyncHandler(async (request: Request, response: Response) => {
    const authenticatedRequest = request as AuthenticatedRequest;

    if (!authenticatedRequest.user) {
      throw new HttpError(401, "Oturum bulunamadı.");
    }

    const validationResult = createSiteWithStructureSchema.safeParse(
      request.body
    );

    if (!validationResult.success) {
      throw new HttpError(
        400,
        "Gönderilen site, blok, daire veya yönetici bilgileri geçersiz.",
        validationResult.error.flatten().fieldErrors
      );
    }

    const {
      name,
      address,
      description,
      imageUrl,
      hasElevator,
      systems,
      isActive,
      siteManagerId,
      blocks,
    } = validationResult.data;

    const requestedManagerIds = Array.from(
      new Set(
        [siteManagerId, ...blocks.map((block) => block.managerId)].filter(
          (managerId): managerId is string => Boolean(managerId)
        )
      )
    );

    const site = await prisma.$transaction(async (transaction) => {
      if (requestedManagerIds.length > 0) {
        const validManagers = await transaction.user.findMany({
          where: {
            id: {
              in: requestedManagerIds,
            },
            role: "MANAGER",
            status: "ACTIVE",
          },
          select: {
            id: true,
          },
        });

        if (validManagers.length !== requestedManagerIds.length) {
          throw new HttpError(
            400,
            "Seçilen yöneticilerden biri bulunamadı, pasif veya MANAGER rolünde değil."
          );
        }
      }

      const createdSite = await transaction.site.create({
        data: {
          name,
          address,
          description,
          imageUrl,
          hasElevator,
          systems,
          isActive,
        },
      });

      if (siteManagerId) {
        await transaction.managerAssignment.create({
          data: {
            managerId: siteManagerId,
            scopeType: "SITE",
            siteId: createdSite.id,
          },
        });
      }

      for (const blockInput of blocks) {
        const createdBlock = await transaction.block.create({
          data: {
            siteId: createdSite.id,
            name: blockInput.name,
            description: blockInput.description,
          },
        });

        const apartmentRows = Array.from(
          { length: blockInput.apartmentCount },
          (_, index) => {
            const apartmentNumber = index + 1;

            return {
              blockId: createdBlock.id,
              number: String(apartmentNumber),
              floor: Math.ceil(apartmentNumber / 4),
            };
          }
        );

        await transaction.apartment.createMany({
          data: apartmentRows,
        });

        if (blockInput.managerId) {
          await transaction.managerAssignment.create({
            data: {
              managerId: blockInput.managerId,
              scopeType: "BLOCK",
              blockId: createdBlock.id,
            },
          });
        }
      }

      for (const managerId of requestedManagerIds) {
        const managerAssignments =
          await transaction.managerAssignment.findMany({
            where: {
              managerId,
            },
            select: {
              id: true,
            },
            orderBy: {
              createdAt: "asc",
            },
            take: 2,
          });

        const [onlyAssignment] = managerAssignments;

        if (managerAssignments.length === 1 && onlyAssignment) {
          await transaction.user.update({
            where: {
              id: managerId,
            },
            data: {
              activeManagerAssignmentId: onlyAssignment.id,
            },
          });
        }
      }

      return transaction.site.findUniqueOrThrow({
        where: {
          id: createdSite.id,
        },
        include: {
          blocks: {
            select: {
              id: true,
              name: true,
              description: true,
              createdAt: true,
              updatedAt: true,
              _count: {
                select: {
                  apartments: true,
                },
              },
              managerAssignments: {
                include: {
                  manager: {
                    select: {
                      id: true,
                      fullName: true,
                      email: true,
                    },
                  },
                },
              },
            },
            orderBy: {
              createdAt: "asc",
            },
          },
          managerAssignments: {
            where: {
              scopeType: "SITE",
            },
            include: {
              manager: {
                select: {
                  id: true,
                  fullName: true,
                  email: true,
                },
              },
            },
          },
        },
      });
    });

    const totalApartmentCount = blocks.reduce(
      (total, block) => total + block.apartmentCount,
      0
    );

    await createAuditLog({
      request,
      userId: authenticatedRequest.user.id,
      action: "CREATE_SITE_WITH_STRUCTURE",
      entityType: "Site",
      entityId: site.id,
      metadata: {
        name: site.name,
        address: site.address,
        siteManagerId: siteManagerId ?? null,
        blockCount: blocks.length,
        totalApartmentCount,
        blocks: blocks.map((block) => ({
          name: block.name,
          apartmentCount: block.apartmentCount,
          managerId: block.managerId ?? null,
        })),
      },
    });

    response.status(201).json({
      success: true,
      message:
        "Site, bloklar, daireler ve yönetici atamaları başarıyla oluşturuldu.",
      data: site,
    });
  })
);

router.post(
  "/",
  requireRole("SUPER_ADMIN"),
  asyncHandler(async (request: Request, response: Response) => {
    const authenticatedRequest = request as AuthenticatedRequest;

    if (!authenticatedRequest.user) {
      throw new HttpError(401, "Oturum bulunamadı.");
    }

    const validationResult = createSiteSchema.safeParse(request.body);

    if (!validationResult.success) {
      throw new HttpError(
        400,
        "Gönderilen site bilgileri geçersiz.",
        validationResult.error.flatten().fieldErrors
      );
    }

    const {
      name,
      address,
      description,
      imageUrl,
      hasElevator,
      systems,
      isActive,
    } = validationResult.data;

    const site = await prisma.site.create({
      data: {
        name,
        address,
        description,
        imageUrl,
        hasElevator,
        systems,
        isActive,
      },
    });

    await createAuditLog({
      request,
      userId: authenticatedRequest.user.id,
      action: "CREATE_SITE",
      entityType: "Site",
      entityId: site.id,
      metadata: {
        name: site.name,
        address: site.address,
        hasElevator: site.hasElevator,
        systems: site.systems,
        isActive: site.isActive,
      },
    });

    response.status(201).json({
      success: true,
      message: "Site başarıyla oluşturuldu.",
      data: site,
    });
  })
);

router.patch(
  "/:siteId/image",
  requireRole("SUPER_ADMIN"),
  siteBlockImageUpload.single("image"),
  asyncHandler(async (request: Request, response: Response) => {
    const authenticatedRequest = request as AuthenticatedRequest;

    if (!authenticatedRequest.user) {
      await deleteUploadedImage(request.file);
      throw new HttpError(401, "Oturum bulunamadı.");
    }

    const siteId = getRequiredParam(request, "siteId");

    const targetSite = await prisma.site.findUnique({
      where: {
        id: siteId,
      },
      select: {
        id: true,
        imageUrl: true,
      },
    });

    if (!targetSite) {
      await deleteUploadedImage(request.file);
      throw new HttpError(404, "Site bulunamadı.");
    }

    if (!request.file) {
      throw new HttpError(400, "Site görseli zorunludur.");
    }

    const isAllowedFile = await isAllowedImageFile(
      request.file.path,
      request.file.mimetype
    );

    if (!isAllowedFile) {
      await deleteUploadedImage(request.file);
      throw new HttpError(
        400,
        "Site görseli gerçek PNG, JPG veya WEBP formatında olmalıdır."
      );
    }

    const imageUrl = buildSiteBlockImageUrl(request.file.filename);

    const updatedSite = await prisma.site.update({
      where: {
        id: siteId,
      },
      data: {
        imageUrl,
      },
    });

    await deleteStoredSiteBlockImage(targetSite.imageUrl);

    await createAuditLog({
      request,
      userId: authenticatedRequest.user.id,
      action: "UPDATE_SITE_IMAGE",
      entityType: "Site",
      entityId: updatedSite.id,
      metadata: {
        previousImageUrl: targetSite.imageUrl,
        currentImageUrl: updatedSite.imageUrl,
        originalFileName: request.file.originalname,
        mimeType: request.file.mimetype,
        sizeBytes: request.file.size,
      },
    });

    response.status(200).json({
      success: true,
      message: "Site görseli başarıyla güncellendi.",
      data: updatedSite,
    });
  })
);

router.patch(
  "/:siteId",
  requireRole("SUPER_ADMIN"),
  asyncHandler(async (request: Request, response: Response) => {
    const authenticatedRequest = request as AuthenticatedRequest;

    if (!authenticatedRequest.user) {
      throw new HttpError(401, "Oturum bulunamadı.");
    }

    const siteId = getRequiredParam(request, "siteId");

    const validationResult = updateSiteSchema.safeParse(request.body);

    if (!validationResult.success) {
      throw new HttpError(
        400,
        "Gönderilen site güncelleme bilgileri geçersiz.",
        validationResult.error.flatten().fieldErrors
      );
    }

    const targetSite = await prisma.site.findUnique({
      where: {
        id: siteId,
      },
    });

    if (!targetSite) {
      throw new HttpError(404, "Site bulunamadı.");
    }

    const {
      name,
      address,
      description,
      imageUrl,
      hasElevator,
      systems,
      isActive,
    } = validationResult.data;

    const updateData: Prisma.SiteUpdateInput = {};

    if (name !== undefined) {
      updateData.name = name;
    }

    if (address !== undefined) {
      updateData.address = address;
    }

    if (description !== undefined) {
      updateData.description =
        description && description.length > 0 ? description : null;
    }

    if (imageUrl !== undefined) {
      updateData.imageUrl = imageUrl && imageUrl.length > 0 ? imageUrl : null;
    }

    if (hasElevator !== undefined) {
      updateData.hasElevator = hasElevator;
    }

    if (systems !== undefined) {
      updateData.systems = systems;
    }

    if (isActive !== undefined) {
      updateData.isActive = isActive;
    }

    const updatedSite = await prisma.site.update({
      where: {
        id: siteId,
      },
      data: updateData,
    });

    await createAuditLog({
      request,
      userId: authenticatedRequest.user.id,
      action: "UPDATE_SITE",
      entityType: "Site",
      entityId: updatedSite.id,
      metadata: {
        previous: {
          name: targetSite.name,
          address: targetSite.address,
          description: targetSite.description,
          imageUrl: targetSite.imageUrl,
          hasElevator: targetSite.hasElevator,
          systems: targetSite.systems,
          isActive: targetSite.isActive,
        },
        current: {
          name: updatedSite.name,
          address: updatedSite.address,
          description: updatedSite.description,
          imageUrl: updatedSite.imageUrl,
          hasElevator: updatedSite.hasElevator,
          systems: updatedSite.systems,
          isActive: updatedSite.isActive,
        },
      },
    });

    response.status(200).json({
      success: true,
      message: "Site başarıyla güncellendi.",
      data: updatedSite,
    });
  })
);

export default router;

