import fs from "node:fs/promises";
import path from "node:path";

import express, { type Request, type Response } from "express";
import { z } from "zod";

import prisma from "../db/prisma.js";
import { type Prisma } from "../generated/prisma/client.js";
import {
  requireAuth,
  requireRole,
  type AuthenticatedRequest,
} from "../middlewares/auth.middleware.js";
import {
  createExpensePaymentBatch,
  ensureExpenseScopeAccessible,
  getAccessibleExpense,
  getAccountingApartmentAccessWhere,
  getAccountingExpenseAccessWhere,
  queueExpenseDistributionNotifications,
} from "../services/accounting.service.js";
import { createAuditLog } from "../services/audit-log.service.js";
import {
  accountingDocumentFolder,
  accountingDocumentUpload,
} from "../uploads/accounting-document-upload.js";
import { asyncHandler } from "../utils/async-handler.js";
import { isAllowedDocumentFile } from "../utils/file-signature.js";
import { HttpError } from "../utils/http-error.js";
import {
  buildPaginationMeta,
  getPaginationParams,
} from "../utils/pagination.js";

const router = express.Router();

router.use(requireAuth);
router.use(requireRole("SUPER_ADMIN", "MANAGER"));

const expenseCategorySchema = z.enum([
  "ELEVATOR",
  "MAINTENANCE",
  "REPAIR",
  "CLEANING",
  "PERSONNEL",
  "UTILITIES",
  "INSURANCE",
  "TAX",
  "SECURITY",
  "LANDSCAPING",
  "OTHER",
]);

const emptyStringToUndefined = (value: unknown) =>
  value === "" || value === null ? undefined : value;

const optionalTextSchema = z.preprocess(
  emptyStringToUndefined,
  z.string().trim().min(1).max(1000).optional()
);

const optionalUuidSchema = z.preprocess(
  emptyStringToUndefined,
  z.string().uuid().optional()
);

const createExpenseSchema = z
  .object({
    title: z.string().trim().min(2).max(200),
    description: optionalTextSchema,
    category: expenseCategorySchema,
    amountKurus: z.coerce.number().int().positive().max(Number.MAX_SAFE_INTEGER),
    expenseDate: z.coerce.date(),
    vendorName: z.preprocess(
      emptyStringToUndefined,
      z.string().trim().min(2).max(200).optional()
    ),
    invoiceNumber: z.preprocess(
      emptyStringToUndefined,
      z.string().trim().min(1).max(100).optional()
    ),
    siteId: optionalUuidSchema,
    blockId: optionalUuidSchema,
  })
  .strict();

const updateExpenseSchema = z
  .object({
    title: z.string().trim().min(2).max(200).optional(),
    description: z.string().trim().max(1000).nullable().optional(),
    category: expenseCategorySchema.optional(),
    amountKurus: z.number().int().positive().max(Number.MAX_SAFE_INTEGER).optional(),
    expenseDate: z.coerce.date().optional(),
    vendorName: z.string().trim().max(200).nullable().optional(),
    invoiceNumber: z.string().trim().max(100).nullable().optional(),
    siteId: z.string().uuid().optional(),
    blockId: z.string().uuid().nullable().optional(),
  })
  .strict()
  .refine((data) => Object.values(data).some((value) => value !== undefined), {
    message: "En az bir alan gönderilmelidir.",
  });

const distributeExpenseSchema = z
  .object({
    title: z.string().trim().min(2).max(200).optional(),
    description: z.string().trim().max(1000).optional(),
    scopeType: z.enum(["SITE", "BLOCK", "APARTMENTS"]),
    siteId: z.string().uuid().optional(),
    blockId: z.string().uuid().optional(),
    apartmentIds: z.array(z.string().uuid()).optional(),
    exemptApartmentIds: z.array(z.string().uuid()).optional().default([]),
    dueDate: z.coerce.date(),
    sendSms: z.boolean().optional().default(false),
    sendEmail: z.boolean().optional().default(false),
  })
  .strict();

const cancelExpenseSchema = z.object({
  reason: z.string().trim().min(3).max(500),
});

const expenseParamsSchema = z.object({
  expenseId: z.string().uuid(),
});

const expenseDocumentParamsSchema = z.object({
  expenseId: z.string().uuid(),
  documentId: z.string().uuid(),
});

const expenseListFiltersSchema = z.object({
  status: z.enum(["ACTIVE", "CANCELLED"]).optional(),
  category: expenseCategorySchema.optional(),
  dateFrom: z.coerce.date().optional(),
  dateTo: z.coerce.date().optional(),
});

const incomeListFiltersSchema = z.object({
  status: z.enum(["ALL", "PENDING", "PAID"]).optional().default("ALL"),
  dateFrom: z.coerce.date().optional(),
  dateTo: z.coerce.date().optional(),
});

function getAuthenticatedUser(request: Request) {
  const authenticatedRequest = request as AuthenticatedRequest;

  if (!authenticatedRequest.user) {
    throw new HttpError(401, "Oturum bulunamadı.");
  }

  return authenticatedRequest.user;
}

function validateDateRange(dateFrom?: Date, dateTo?: Date) {
  if (dateFrom && dateTo && dateFrom > dateTo) {
    throw new HttpError(
      400,
      "Başlangıç tarihi bitiş tarihinden sonra olamaz."
    );
  }
}

function getUploadedFiles(request: Request) {
  return Array.isArray(request.files) ? request.files : [];
}

function normalizeOriginalFileName(fileName: string) {
  const baseName = path.basename(fileName).replace(/[\u0000-\u001f\u007f]/g, "");
  return baseName.trim().slice(0, 255) || "belge";
}

async function deleteUploadedFiles(files: Express.Multer.File[]) {
  await Promise.all(
    files.map(async (file) => {
      try {
        await fs.unlink(file.path);
      } catch (error) {
        console.error("Kullanılmayan muhasebe belgesi silinemedi:", error);
      }
    })
  );
}

async function validateUploadedFiles(files: Express.Multer.File[]) {
  if (files.length === 0) {
    throw new HttpError(400, "Gider için en az bir fatura veya belge yüklenmelidir.");
  }

  const validationResults = await Promise.all(
    files.map((file) => isAllowedDocumentFile(file.path, file.mimetype))
  );

  if (validationResults.some((isAllowed) => !isAllowed)) {
    throw new HttpError(
      400,
      "Yüklenen belgeler gerçek PDF, PNG, JPG veya WEBP formatında olmalıdır."
    );
  }
}

function buildDateWhere(
  field: "expenseDate" | "createdAt" | "paidAt",
  dateFrom?: Date,
  dateTo?: Date
) {
  if (!dateFrom && !dateTo) {
    return {};
  }

  return {
    [field]: {
      ...(dateFrom ? { gte: dateFrom } : {}),
      ...(dateTo ? { lte: dateTo } : {}),
    },
  };
}

function mapExpense(expense: {
  paymentBatch: null | {
    id: string;
    allocations: Array<{
      amountKurus: number;
      status: "PENDING" | "PAID" | "CANCELLED";
    }>;
    exemptions: Array<{ id: string }>;
  };
  documents: Array<unknown>;
  [key: string]: unknown;
}) {
  const allocations = expense.paymentBatch?.allocations ?? [];

  const paymentSummary = allocations.reduce(
    (summary, allocation) => {
      if (allocation.status !== "CANCELLED") {
        summary.expectedKurus += allocation.amountKurus;
      }

      if (allocation.status === "PAID") {
        summary.collectedKurus += allocation.amountKurus;
      }

      if (allocation.status === "PENDING") {
        summary.remainingKurus += allocation.amountKurus;
      }

      return summary;
    },
    {
      expectedKurus: 0,
      collectedKurus: 0,
      remainingKurus: 0,
    }
  );

  return {
    ...expense,
    documentCount: expense.documents.length,
    paymentSummary: {
      ...paymentSummary,
      allocationCount: allocations.length,
      exemptionCount: expense.paymentBatch?.exemptions.length ?? 0,
    },
  };
}

router.get(
  "/summary",
  asyncHandler(async (request: Request, response: Response) => {
    const user = getAuthenticatedUser(request);
    const filterResult = expenseListFiltersSchema.pick({
      dateFrom: true,
      dateTo: true,
    }).safeParse(request.query);

    if (!filterResult.success) {
      throw new HttpError(400, "Muhasebe tarih filtreleri geçersiz.");
    }

    const { dateFrom, dateTo } = filterResult.data;
    validateDateRange(dateFrom, dateTo);

    const [expenseAccessWhere, apartmentAccessWhere] = await Promise.all([
      getAccountingExpenseAccessWhere(user),
      getAccountingApartmentAccessWhere(user),
    ]);

    const allTimeExpenseWhere: Prisma.AccountingExpenseWhereInput = {
      status: "ACTIVE",
      AND: [expenseAccessWhere],
    };

    const allTimeAllocationWhere: Prisma.PaymentAllocationWhereInput = {
      apartment: apartmentAccessWhere,
      status: {
        in: ["PENDING", "PAID"],
      },
    };

    const periodExpenseWhere: Prisma.AccountingExpenseWhereInput = {
      ...allTimeExpenseWhere,
      ...buildDateWhere("expenseDate", dateFrom, dateTo),
    };

    const periodExpectedWhere: Prisma.PaymentAllocationWhereInput = {
      apartment: apartmentAccessWhere,
      status: {
        in: ["PENDING", "PAID"],
      },
      paymentBatch: buildDateWhere("createdAt", dateFrom, dateTo),
    };

    const periodCollectedWhere: Prisma.PaymentAllocationWhereInput = {
      apartment: apartmentAccessWhere,
      status: "PAID",
      ...buildDateWhere("paidAt", dateFrom, dateTo),
    };

    const periodPendingWhere: Prisma.PaymentAllocationWhereInput = {
      apartment: apartmentAccessWhere,
      status: "PENDING",
      paymentBatch: buildDateWhere("createdAt", dateFrom, dateTo),
    };

    const [
      allTimeExpenseAggregate,
      allTimeCollectedAggregate,
      allTimeExpectedAggregate,
      periodExpenseAggregate,
      periodExpectedAggregate,
      periodCollectedAggregate,
      periodPendingAggregate,
      activeExpenseCount,
      pendingAllocationCount,
    ] = await Promise.all([
      prisma.accountingExpense.aggregate({
        where: allTimeExpenseWhere,
        _sum: {
          amountKurus: true,
        },
      }),
      prisma.paymentAllocation.aggregate({
        where: {
          ...allTimeAllocationWhere,
          status: "PAID",
        },
        _sum: {
          amountKurus: true,
        },
      }),
      prisma.paymentAllocation.aggregate({
        where: allTimeAllocationWhere,
        _sum: {
          amountKurus: true,
        },
      }),
      prisma.accountingExpense.aggregate({
        where: periodExpenseWhere,
        _sum: {
          amountKurus: true,
        },
      }),
      prisma.paymentAllocation.aggregate({
        where: periodExpectedWhere,
        _sum: {
          amountKurus: true,
        },
      }),
      prisma.paymentAllocation.aggregate({
        where: periodCollectedWhere,
        _sum: {
          amountKurus: true,
        },
      }),
      prisma.paymentAllocation.aggregate({
        where: periodPendingWhere,
        _sum: {
          amountKurus: true,
        },
      }),
      prisma.accountingExpense.count({
        where: allTimeExpenseWhere,
      }),
      prisma.paymentAllocation.count({
        where: {
          apartment: apartmentAccessWhere,
          status: "PENDING",
        },
      }),
    ]);

    const totalExpenseKurus =
      allTimeExpenseAggregate._sum.amountKurus ?? 0;
    const totalCollectedIncomeKurus =
      allTimeCollectedAggregate._sum.amountKurus ?? 0;

    response.status(200).json({
      success: true,
      data: {
        cashBalanceKurus: totalCollectedIncomeKurus - totalExpenseKurus,
        totalCollectedIncomeKurus,
        totalExpectedIncomeKurus:
          allTimeExpectedAggregate._sum.amountKurus ?? 0,
        totalExpenseKurus,
        activeExpenseCount,
        pendingAllocationCount,
        period: {
          dateFrom: dateFrom?.toISOString() ?? null,
          dateTo: dateTo?.toISOString() ?? null,
          expectedIncomeKurus:
            periodExpectedAggregate._sum.amountKurus ?? 0,
          collectedIncomeKurus:
            periodCollectedAggregate._sum.amountKurus ?? 0,
          outstandingIncomeKurus:
            periodPendingAggregate._sum.amountKurus ?? 0,
          expenseKurus: periodExpenseAggregate._sum.amountKurus ?? 0,
        },
      },
    });
  })
);

router.get(
  "/income",
  asyncHandler(async (request: Request, response: Response) => {
    const user = getAuthenticatedUser(request);
    const paginationResult = getPaginationParams(request.query);
    const filterResult = incomeListFiltersSchema.safeParse(request.query);

    if (!paginationResult.success || !filterResult.success) {
      throw new HttpError(400, "Gelir listesi filtreleri geçersiz.");
    }

    const { status, dateFrom, dateTo } = filterResult.data;
    validateDateRange(dateFrom, dateTo);

    const apartmentAccessWhere = await getAccountingApartmentAccessWhere(user);

    const statusWhere: Prisma.PaymentAllocationWhereInput =
      status === "ALL"
        ? {
            status: {
              in: ["PENDING", "PAID"],
            },
          }
        : {
            status,
          };

    const searchWhere: Prisma.PaymentAllocationWhereInput =
      paginationResult.search
        ? {
            OR: [
              {
                paymentBatch: {
                  title: {
                    contains: paginationResult.search,
                    mode: "insensitive",
                  },
                },
              },
              {
                apartment: {
                  number: {
                    contains: paginationResult.search,
                    mode: "insensitive",
                  },
                },
              },
            ],
          }
        : {};

    const dateWhere: Prisma.PaymentAllocationWhereInput =
      status === "PAID"
        ? buildDateWhere("paidAt", dateFrom, dateTo)
        : {
            paymentBatch: buildDateWhere("createdAt", dateFrom, dateTo),
          };

    const where: Prisma.PaymentAllocationWhereInput = {
      apartment: apartmentAccessWhere,
      AND: [statusWhere, searchWhere, dateWhere],
    };

    const [allocations, totalCount] = await Promise.all([
      prisma.paymentAllocation.findMany({
        where,
        select: {
          id: true,
          amountKurus: true,
          status: true,
          paidAt: true,
          createdAt: true,
          paymentBatch: {
            select: {
              id: true,
              title: true,
              description: true,
              dueDate: true,
              createdAt: true,
              accountingExpense: {
                select: {
                  id: true,
                  title: true,
                },
              },
            },
          },
          apartment: {
            select: {
              id: true,
              number: true,
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
          },
          receipts: {
            where: {
              status: "APPROVED",
            },
            select: {
              id: true,
              originalFileName: true,
              reviewedAt: true,
            },
            take: 1,
            orderBy: {
              reviewedAt: "desc",
            },
          },
        },
        orderBy: [
          {
            paidAt: "desc",
          },
          {
            createdAt: "desc",
          },
        ],
        skip: paginationResult.skip,
        take: paginationResult.limit,
      }),
      prisma.paymentAllocation.count({ where }),
    ]);

    response.status(200).json({
      success: true,
      data: allocations,
      pagination: buildPaginationMeta({
        page: paginationResult.page,
        limit: paginationResult.limit,
        totalCount,
      }),
    });
  })
);

router.get(
  "/expenses",
  asyncHandler(async (request: Request, response: Response) => {
    const user = getAuthenticatedUser(request);
    const paginationResult = getPaginationParams(request.query);
    const filterResult = expenseListFiltersSchema.safeParse(request.query);

    if (!paginationResult.success || !filterResult.success) {
      throw new HttpError(400, "Gider listesi filtreleri geçersiz.");
    }

    const { status, category, dateFrom, dateTo } = filterResult.data;
    validateDateRange(dateFrom, dateTo);

    const accessWhere = await getAccountingExpenseAccessWhere(user);
    const searchWhere: Prisma.AccountingExpenseWhereInput =
      paginationResult.search
        ? {
            OR: [
              {
                title: {
                  contains: paginationResult.search,
                  mode: "insensitive",
                },
              },
              {
                description: {
                  contains: paginationResult.search,
                  mode: "insensitive",
                },
              },
              {
                vendorName: {
                  contains: paginationResult.search,
                  mode: "insensitive",
                },
              },
              {
                invoiceNumber: {
                  contains: paginationResult.search,
                  mode: "insensitive",
                },
              },
            ],
          }
        : {};

    const where: Prisma.AccountingExpenseWhereInput = {
      AND: [
        accessWhere,
        searchWhere,
        ...(status ? [{ status }] : []),
        ...(category ? [{ category }] : []),
        buildDateWhere("expenseDate", dateFrom, dateTo),
      ],
    };

    const [expenses, totalCount] = await Promise.all([
      prisma.accountingExpense.findMany({
        where,
        include: {
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
            },
          },
          createdByUser: {
            select: {
              id: true,
              fullName: true,
            },
          },
          documents: {
            select: {
              id: true,
            },
          },
          paymentBatch: {
            select: {
              id: true,
              allocations: {
                select: {
                  amountKurus: true,
                  status: true,
                },
              },
              exemptions: {
                select: {
                  id: true,
                },
              },
            },
          },
        },
        orderBy: {
          expenseDate: "desc",
        },
        skip: paginationResult.skip,
        take: paginationResult.limit,
      }),
      prisma.accountingExpense.count({ where }),
    ]);

    response.status(200).json({
      success: true,
      data: expenses.map(mapExpense),
      pagination: buildPaginationMeta({
        page: paginationResult.page,
        limit: paginationResult.limit,
        totalCount,
      }),
    });
  })
);

router.get(
  "/expenses/:expenseId",
  asyncHandler(async (request: Request, response: Response) => {
    const user = getAuthenticatedUser(request);
    const paramsResult = expenseParamsSchema.safeParse(request.params);

    if (!paramsResult.success) {
      throw new HttpError(400, "Gider kimliği geçersiz.");
    }

    const accessibleExpense = await getAccessibleExpense({
      user,
      expenseId: paramsResult.data.expenseId,
    });

    const expense = await prisma.accountingExpense.findUniqueOrThrow({
      where: {
        id: accessibleExpense.id,
      },
      include: {
        site: true,
        block: true,
        createdByUser: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },
        cancelledByUser: {
          select: {
            id: true,
            fullName: true,
          },
        },
        documents: {
          orderBy: {
            createdAt: "desc",
          },
        },
        paymentBatch: {
          include: {
            allocations: {
              include: {
                apartment: {
                  select: {
                    id: true,
                    number: true,
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
                },
              },
            },
            exemptions: {
              include: {
                apartment: {
                  select: {
                    id: true,
                    number: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    response.status(200).json({
      success: true,
      data: mapExpense(expense),
    });
  })
);

router.post(
  "/expenses",
  accountingDocumentUpload.array("documents", 5),
  asyncHandler(async (request: Request, response: Response) => {
    const user = getAuthenticatedUser(request);
    const files = getUploadedFiles(request);
    let keepFiles = false;

    try {
      const validationResult = createExpenseSchema.safeParse(request.body);

      if (!validationResult.success) {
        throw new HttpError(
          400,
          "Gönderilen gider bilgileri geçersiz.",
          validationResult.error.flatten().fieldErrors
        );
      }

      await validateUploadedFiles(files);

      const scope = await ensureExpenseScopeAccessible({
        user,
        siteId: validationResult.data.siteId,
        blockId: validationResult.data.blockId,
      });

      const expense = await prisma.$transaction(async (transaction) => {
        return transaction.accountingExpense.create({
          data: {
            title: validationResult.data.title,
            description: validationResult.data.description,
            category: validationResult.data.category,
            amountKurus: validationResult.data.amountKurus,
            expenseDate: validationResult.data.expenseDate,
            vendorName: validationResult.data.vendorName,
            invoiceNumber: validationResult.data.invoiceNumber,
            siteId: scope.siteId,
            blockId: scope.blockId,
            createdByUserId: user.id,
            documents: {
              create: files.map((file) => ({
                originalFileName: normalizeOriginalFileName(file.originalname),
                storedFileName: file.filename,
                mimeType: file.mimetype,
                sizeBytes: file.size,
                uploadedByUserId: user.id,
              })),
            },
          },
          include: {
            documents: true,
            site: true,
            block: true,
          },
        });
      });

      keepFiles = true;

      await createAuditLog({
        request,
        userId: user.id,
        action: "CREATE_ACCOUNTING_EXPENSE",
        entityType: "AccountingExpense",
        entityId: expense.id,
        metadata: {
          amountKurus: expense.amountKurus,
          category: expense.category,
          siteId: expense.siteId,
          blockId: expense.blockId,
          documentCount: expense.documents.length,
        },
      });

      response.status(201).json({
        success: true,
        message: "Gider kaydı ve faturaları güvenli şekilde oluşturuldu.",
        data: expense,
      });
    } finally {
      if (!keepFiles) {
        await deleteUploadedFiles(files);
      }
    }
  })
);

router.post(
  "/expenses/:expenseId/documents",
  accountingDocumentUpload.array("documents", 5),
  asyncHandler(async (request: Request, response: Response) => {
    const user = getAuthenticatedUser(request);
    const files = getUploadedFiles(request);
    let keepFiles = false;

    try {
      const paramsResult = expenseParamsSchema.safeParse(request.params);

      if (!paramsResult.success) {
        throw new HttpError(400, "Gider kimliği geçersiz.");
      }

      await validateUploadedFiles(files);

      const expense = await getAccessibleExpense({
        user,
        expenseId: paramsResult.data.expenseId,
      });

      if (expense.status !== "ACTIVE") {
        throw new HttpError(409, "İptal edilmiş gidere belge eklenemez.");
      }

      const existingDocumentCount =
        await prisma.accountingExpenseDocument.count({
          where: {
            expenseId: expense.id,
          },
        });

      if (existingDocumentCount + files.length > 10) {
        throw new HttpError(
          400,
          "Bir gider kaydına en fazla 10 belge bağlanabilir."
        );
      }

      const documents = await prisma.$transaction(
        files.map((file) =>
          prisma.accountingExpenseDocument.create({
            data: {
              expenseId: expense.id,
              originalFileName: normalizeOriginalFileName(file.originalname),
              storedFileName: file.filename,
              mimeType: file.mimetype,
              sizeBytes: file.size,
              uploadedByUserId: user.id,
            },
          })
        )
      );

      keepFiles = true;

      await createAuditLog({
        request,
        userId: user.id,
        action: "ADD_ACCOUNTING_EXPENSE_DOCUMENTS",
        entityType: "AccountingExpense",
        entityId: expense.id,
        metadata: {
          addedDocumentCount: documents.length,
        },
      });

      response.status(201).json({
        success: true,
        message: "Gider belgeleri başarıyla eklendi.",
        data: documents,
      });
    } finally {
      if (!keepFiles) {
        await deleteUploadedFiles(files);
      }
    }
  })
);

router.patch(
  "/expenses/:expenseId",
  asyncHandler(async (request: Request, response: Response) => {
    const user = getAuthenticatedUser(request);
    const paramsResult = expenseParamsSchema.safeParse(request.params);
    const bodyResult = updateExpenseSchema.safeParse(request.body);

    if (!paramsResult.success || !bodyResult.success) {
      throw new HttpError(400, "Gider güncelleme bilgileri geçersiz.");
    }

    const expense = await getAccessibleExpense({
      user,
      expenseId: paramsResult.data.expenseId,
    });

    if (expense.status !== "ACTIVE") {
      throw new HttpError(409, "İptal edilmiş gider güncellenemez.");
    }

    const protectedFinancialFields = [
      "category",
      "amountKurus",
      "expenseDate",
      "siteId",
      "blockId",
    ] as const;

    if (
      expense.paymentBatchId &&
      protectedFinancialFields.some(
        (field) => bodyResult.data[field] !== undefined
      )
    ) {
      throw new HttpError(
        409,
        "Sakinlere dağıtılmış giderin tutarı, kategorisi, tarihi veya kapsamı değiştirilemez."
      );
    }

    let nextSiteId = bodyResult.data.siteId ?? expense.siteId;
    let nextBlockId =
      bodyResult.data.blockId === undefined
        ? expense.blockId
        : bodyResult.data.blockId;

    if (
      bodyResult.data.siteId !== undefined ||
      bodyResult.data.blockId !== undefined
    ) {
      const scope = await ensureExpenseScopeAccessible({
        user,
        siteId: nextSiteId,
        blockId: nextBlockId ?? undefined,
      });
      nextSiteId = scope.siteId;
      nextBlockId = scope.blockId;
    }

    const updatedExpense = await prisma.accountingExpense.update({
      where: {
        id: expense.id,
      },
      data: {
        ...(bodyResult.data.title !== undefined
          ? { title: bodyResult.data.title }
          : {}),
        ...(bodyResult.data.description !== undefined
          ? { description: bodyResult.data.description }
          : {}),
        ...(bodyResult.data.category !== undefined
          ? { category: bodyResult.data.category }
          : {}),
        ...(bodyResult.data.amountKurus !== undefined
          ? { amountKurus: bodyResult.data.amountKurus }
          : {}),
        ...(bodyResult.data.expenseDate !== undefined
          ? { expenseDate: bodyResult.data.expenseDate }
          : {}),
        ...(bodyResult.data.vendorName !== undefined
          ? { vendorName: bodyResult.data.vendorName }
          : {}),
        ...(bodyResult.data.invoiceNumber !== undefined
          ? { invoiceNumber: bodyResult.data.invoiceNumber }
          : {}),
        ...(bodyResult.data.siteId !== undefined ||
        bodyResult.data.blockId !== undefined
          ? {
              siteId: nextSiteId,
              blockId: nextBlockId,
            }
          : {}),
      },
    });

    await createAuditLog({
      request,
      userId: user.id,
      action: "UPDATE_ACCOUNTING_EXPENSE",
      entityType: "AccountingExpense",
      entityId: expense.id,
      metadata: {
        changedFields: Object.keys(bodyResult.data),
      },
    });

    response.status(200).json({
      success: true,
      message: "Gider kaydı başarıyla güncellendi.",
      data: updatedExpense,
    });
  })
);

router.post(
  "/expenses/:expenseId/distribute",
  asyncHandler(async (request: Request, response: Response) => {
    const user = getAuthenticatedUser(request);
    const paramsResult = expenseParamsSchema.safeParse(request.params);
    const bodyResult = distributeExpenseSchema.safeParse(request.body);

    if (!paramsResult.success || !bodyResult.success) {
      throw new HttpError(
        400,
        "Gider dağıtım bilgileri geçersiz.",
        bodyResult.success
          ? undefined
          : bodyResult.error.flatten().fieldErrors
      );
    }

    const expense = await getAccessibleExpense({
      user,
      expenseId: paramsResult.data.expenseId,
    });

    const paymentBatch = await createExpensePaymentBatch({
      user,
      expense: {
        id: expense.id,
        title: expense.title,
        description: expense.description,
        amountKurus: expense.amountKurus,
        status: expense.status,
        siteId: expense.siteId,
        blockId: expense.blockId,
        paymentBatchId: expense.paymentBatchId,
      },
      input: bodyResult.data,
    });

    const notificationSummary = await queueExpenseDistributionNotifications({
      paymentBatch: {
        id: paymentBatch.id,
        title: paymentBatch.title,
        dueDate: paymentBatch.dueDate,
      },
      sendSms: bodyResult.data.sendSms,
      sendEmail: bodyResult.data.sendEmail,
      createdByUserId: user.id,
    });

    await createAuditLog({
      request,
      userId: user.id,
      action: "DISTRIBUTE_ACCOUNTING_EXPENSE",
      entityType: "AccountingExpense",
      entityId: expense.id,
      metadata: {
        paymentBatchId: paymentBatch.id,
        totalAmountKurus: expense.amountKurus,
        allocationCount: paymentBatch.allocations.length,
        exemptionCount: paymentBatch.exemptions.length,
        sendSms: bodyResult.data.sendSms,
        sendEmail: bodyResult.data.sendEmail,
        notificationSummary,
      },
    });

    response.status(201).json({
      success: true,
      message: notificationSummary.failed
        ? "Gider dairelere dağıtıldı ancak bazı bildirimler kuyruğa eklenemedi."
        : "Gider muaf daireler hariç diğer dairelere başarıyla dağıtıldı.",
      data: {
        paymentBatch,
        notificationSummary,
      },
    });
  })
);

router.patch(
  "/expenses/:expenseId/cancel",
  asyncHandler(async (request: Request, response: Response) => {
    const user = getAuthenticatedUser(request);
    const paramsResult = expenseParamsSchema.safeParse(request.params);
    const bodyResult = cancelExpenseSchema.safeParse(request.body);

    if (!paramsResult.success || !bodyResult.success) {
      throw new HttpError(400, "Gider iptal bilgileri geçersiz.");
    }

    const accessibleExpense = await getAccessibleExpense({
      user,
      expenseId: paramsResult.data.expenseId,
    });

    const expense = await prisma.accountingExpense.findUniqueOrThrow({
      where: {
        id: accessibleExpense.id,
      },
      include: {
        paymentBatch: {
          select: {
            id: true,
            allocations: {
              select: {
                id: true,
                status: true,
              },
            },
          },
        },
      },
    });

    if (expense.status === "CANCELLED") {
      throw new HttpError(409, "Bu gider zaten iptal edilmiş.");
    }

    const hasPaidAllocation = expense.paymentBatch?.allocations.some(
      (allocation) => allocation.status === "PAID"
    );

    if (hasPaidAllocation) {
      throw new HttpError(
        409,
        "Bu gidere bağlı ödenmiş tahsilatlar bulunduğu için gider iptal edilemez."
      );
    }

    const cancelledExpense = await prisma.$transaction(async (transaction) => {
      if (expense.paymentBatch?.id) {
        await transaction.paymentAllocation.updateMany({
          where: {
            paymentBatchId: expense.paymentBatch.id,
            status: "PENDING",
          },
          data: {
            status: "CANCELLED",
          },
        });
      }

      return transaction.accountingExpense.update({
        where: {
          id: expense.id,
        },
        data: {
          status: "CANCELLED",
          cancellationReason: bodyResult.data.reason,
          cancelledAt: new Date(),
          cancelledByUserId: user.id,
        },
      });
    });

    await createAuditLog({
      request,
      userId: user.id,
      action: "CANCEL_ACCOUNTING_EXPENSE",
      entityType: "AccountingExpense",
      entityId: expense.id,
      metadata: {
        reason: bodyResult.data.reason,
        paymentBatchId: expense.paymentBatch?.id ?? null,
      },
    });

    response.status(200).json({
      success: true,
      message: "Gider kaydı iptal edildi. Bekleyen bağlı ödemeler de iptal edildi.",
      data: cancelledExpense,
    });
  })
);

router.get(
  "/expenses/:expenseId/documents/:documentId/download",
  asyncHandler(async (request: Request, response: Response) => {
    const user = getAuthenticatedUser(request);
    const paramsResult = expenseDocumentParamsSchema.safeParse(request.params);

    if (!paramsResult.success) {
      throw new HttpError(400, "Belge kimliği geçersiz.");
    }

    await getAccessibleExpense({
      user,
      expenseId: paramsResult.data.expenseId,
    });

    const document = await prisma.accountingExpenseDocument.findFirst({
      where: {
        id: paramsResult.data.documentId,
        expenseId: paramsResult.data.expenseId,
      },
    });

    if (!document) {
      throw new HttpError(404, "Gider belgesi bulunamadı.");
    }

    const safeStoredFileName = path.basename(document.storedFileName);
    const filePath = path.resolve(accountingDocumentFolder, safeStoredFileName);
    const safeFolderPath = path.resolve(accountingDocumentFolder) + path.sep;

    if (!filePath.startsWith(safeFolderPath)) {
      throw new HttpError(400, "Geçersiz belge yolu.");
    }

    try {
      await fs.access(filePath);
    } catch {
      throw new HttpError(404, "Gider belgesi dosyası bulunamadı.");
    }

    response.setHeader("Content-Type", document.mimeType);
    response.setHeader("X-Content-Type-Options", "nosniff");
    response.setHeader("Cache-Control", "private, no-store");
    response.download(filePath, normalizeOriginalFileName(document.originalFileName));
  })
);

export default router;
