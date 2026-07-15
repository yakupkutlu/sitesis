import prisma from "../db/prisma.js";
import { type Prisma } from "../generated/prisma/client.js";
import { type AuthenticatedUser } from "../middlewares/auth.middleware.js";
import {
  queueEmailNotification,
  queueSmsNotification,
} from "./notification.service.js";
import {
  distributeAmountToApartments,
  excludeExemptApartments,
  findInvalidExemptApartments,
} from "./payment-distribution.service.js";
import { getManagerScope, hasManagerScope } from "./manager-scope.service.js";
import { HttpError } from "../utils/http-error.js";

export type AccountingUser = Pick<AuthenticatedUser, "id" | "role">;

export type ExpenseScope = {
  siteId: string;
  blockId: string | null;
};

export type ExpenseDistributionInput = {
  title?: string;
  description?: string;
  scopeType: "SITE" | "BLOCK" | "APARTMENTS";
  siteId?: string;
  blockId?: string;
  apartmentIds?: string[];
  exemptApartmentIds: string[];
  dueDate: Date;
  sendSms: boolean;
  sendEmail: boolean;
};

function uniqueIds(ids: string[] = []) {
  return Array.from(new Set(ids));
}

export async function getAccountingExpenseAccessWhere(
  user: AccountingUser
): Promise<Prisma.AccountingExpenseWhereInput> {
  if (user.role === "SUPER_ADMIN") {
    return {};
  }

  if (user.role !== "MANAGER") {
    throw new HttpError(403, "Ön muhasebe bölümüne erişim yetkiniz yok.");
  }

  const managerScope = await getManagerScope(user.id);

  if (!hasManagerScope(managerScope)) {
    throw new HttpError(
      403,
      "Bu yöneticiye atanmış aktif bir site veya blok bulunamadı."
    );
  }

  const filters: Prisma.AccountingExpenseWhereInput[] = [];

  if (managerScope.siteIds.length > 0) {
    filters.push({
      siteId: {
        in: managerScope.siteIds,
      },
    });
  }

  if (managerScope.blockIds.length > 0) {
    filters.push({
      blockId: {
        in: managerScope.blockIds,
      },
    });
  }

  return {
    OR: filters,
  };
}

export async function getAccountingApartmentAccessWhere(
  user: AccountingUser
): Promise<Prisma.ApartmentWhereInput> {
  if (user.role === "SUPER_ADMIN") {
    return {};
  }

  if (user.role !== "MANAGER") {
    throw new HttpError(403, "Ön muhasebe bölümüne erişim yetkiniz yok.");
  }

  const managerScope = await getManagerScope(user.id);

  if (!hasManagerScope(managerScope)) {
    throw new HttpError(
      403,
      "Bu yöneticiye atanmış aktif bir site veya blok bulunamadı."
    );
  }

  return {
    OR: [
      {
        blockId: {
          in: managerScope.blockIds,
        },
      },
      {
        block: {
          siteId: {
            in: managerScope.siteIds,
          },
        },
      },
    ],
  };
}

export async function ensureExpenseScopeAccessible(params: {
  user: AccountingUser;
  siteId?: string;
  blockId?: string;
}): Promise<ExpenseScope> {
  let resolvedSiteId = params.siteId;
  let resolvedBlockId: string | null = params.blockId ?? null;

  if (resolvedBlockId) {
    const block = await prisma.block.findUnique({
      where: {
        id: resolvedBlockId,
      },
      select: {
        id: true,
        siteId: true,
      },
    });

    if (!block) {
      throw new HttpError(404, "Blok/Apartman bulunamadı.");
    }

    if (resolvedSiteId && resolvedSiteId !== block.siteId) {
      throw new HttpError(400, "Seçilen blok belirtilen siteye ait değildir.");
    }

    resolvedSiteId = block.siteId;
  }

  if (!resolvedSiteId) {
    throw new HttpError(400, "Gider için site seçimi zorunludur.");
  }

  const site = await prisma.site.findUnique({
    where: {
      id: resolvedSiteId,
    },
    select: {
      id: true,
      isActive: true,
    },
  });

  if (!site) {
    throw new HttpError(404, "Site bulunamadı.");
  }

  if (!site.isActive) {
    throw new HttpError(400, "Pasif site için gider kaydı oluşturulamaz.");
  }

  if (params.user.role === "SUPER_ADMIN") {
    return {
      siteId: resolvedSiteId,
      blockId: resolvedBlockId,
    };
  }

  const managerScope = await getManagerScope(params.user.id);

  if (!hasManagerScope(managerScope)) {
    throw new HttpError(
      403,
      "Bu yöneticiye atanmış aktif bir site veya blok bulunamadı."
    );
  }

  if (resolvedBlockId) {
    const canAccessBlock =
      managerScope.blockIds.includes(resolvedBlockId) ||
      managerScope.siteIds.includes(resolvedSiteId);

    if (!canAccessBlock) {
      throw new HttpError(403, "Bu blok için gider oluşturma yetkiniz yok.");
    }
  } else if (!managerScope.siteIds.includes(resolvedSiteId)) {
    throw new HttpError(
      403,
      "Site geneli için gider oluşturma yetkiniz yok. Blok yetkisi olan yönetici yalnızca kendi bloğu için gider oluşturabilir."
    );
  }

  return {
    siteId: resolvedSiteId,
    blockId: resolvedBlockId,
  };
}

export async function getAccessibleExpense(params: {
  user: AccountingUser;
  expenseId: string;
}) {
  const accessWhere = await getAccountingExpenseAccessWhere(params.user);

  const expense = await prisma.accountingExpense.findFirst({
    where: {
      id: params.expenseId,
      AND: [accessWhere],
    },
  });

  if (!expense) {
    throw new HttpError(
      404,
      "Gider kaydı bulunamadı veya bu kayıt için yetkiniz yok."
    );
  }

  return expense;
}

async function resolveDistributionApartments(params: {
  user: AccountingUser;
  expense: {
    siteId: string;
    blockId: string | null;
  };
  input: ExpenseDistributionInput;
  expenseAmountKurus: number;
}) {
  const { expense, input } = params;
  let scopedApartmentIds: string[] = [];
  let paymentBatchSiteId: string | undefined;
  let paymentBatchBlockId: string | undefined;

  if (input.scopeType === "SITE") {
    const targetSiteId = input.siteId ?? expense.siteId;

    if (targetSiteId !== expense.siteId || expense.blockId) {
      throw new HttpError(
        400,
        "Bu gider yalnızca kayıtlı olduğu kapsam içinde dağıtılabilir."
      );
    }

    const apartments = await prisma.apartment.findMany({
      where: {
        block: {
          siteId: targetSiteId,
        },
      },
      select: {
        id: true,
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    scopedApartmentIds = apartments.map((apartment) => apartment.id);
    paymentBatchSiteId = targetSiteId;
  }

  if (input.scopeType === "BLOCK") {
    const targetBlockId = input.blockId ?? expense.blockId;

    if (!targetBlockId) {
      throw new HttpError(400, "Blok/Apartman seçimi zorunludur.");
    }

    const block = await prisma.block.findUnique({
      where: {
        id: targetBlockId,
      },
      select: {
        id: true,
        siteId: true,
      },
    });

    if (!block) {
      throw new HttpError(404, "Blok/Apartman bulunamadı.");
    }

    if (
      block.siteId !== expense.siteId ||
      (expense.blockId && expense.blockId !== block.id)
    ) {
      throw new HttpError(
        400,
        "Seçilen blok gider kaydının kapsamı dışında kalıyor."
      );
    }

    const apartments = await prisma.apartment.findMany({
      where: {
        blockId: block.id,
      },
      select: {
        id: true,
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    scopedApartmentIds = apartments.map((apartment) => apartment.id);
    paymentBatchSiteId = block.siteId;
    paymentBatchBlockId = block.id;
  }

  if (input.scopeType === "APARTMENTS") {
    const requestedApartmentIds = uniqueIds(input.apartmentIds);

    if (requestedApartmentIds.length === 0) {
      throw new HttpError(400, "En az bir daire seçilmelidir.");
    }

    const apartments = await prisma.apartment.findMany({
      where: {
        id: {
          in: requestedApartmentIds,
        },
      },
      select: {
        id: true,
        blockId: true,
        block: {
          select: {
            siteId: true,
          },
        },
      },
    });

    if (apartments.length !== requestedApartmentIds.length) {
      throw new HttpError(404, "Seçilen dairelerden bazıları bulunamadı.");
    }

    const outsideExpenseScope = apartments.some((apartment) => {
      if (apartment.block.siteId !== expense.siteId) {
        return true;
      }

      return Boolean(
        expense.blockId && apartment.blockId !== expense.blockId
      );
    });

    if (outsideExpenseScope) {
      throw new HttpError(
        400,
        "Seçilen dairelerden bazıları gider kaydının kapsamı dışında kalıyor."
      );
    }

    scopedApartmentIds = apartments.map((apartment) => apartment.id);
  }

  if (scopedApartmentIds.length === 0) {
    throw new HttpError(400, "Giderin dağıtılacağı daire bulunamadı.");
  }

  if (params.user.role === "MANAGER") {
    const accessWhere = await getAccountingApartmentAccessWhere(params.user);
    const accessibleApartmentCount = await prisma.apartment.count({
      where: {
        id: {
          in: scopedApartmentIds,
        },
        AND: [accessWhere],
      },
    });

    if (accessibleApartmentCount !== scopedApartmentIds.length) {
      throw new HttpError(
        403,
        "Seçilen dairelerden bazıları aktif yönetici çalışma alanınızın dışında."
      );
    }
  }

  const exemptApartmentIds = uniqueIds(input.exemptApartmentIds);
  const invalidExemptApartmentIds = findInvalidExemptApartments(
    scopedApartmentIds,
    exemptApartmentIds
  );

  if (invalidExemptApartmentIds.length > 0) {
    throw new HttpError(
      400,
      "Muaf seçilen dairelerden bazıları ödeme kapsamı içinde değil.",
      {
        exemptApartmentIds: invalidExemptApartmentIds,
      }
    );
  }

  const payableApartmentIds = excludeExemptApartments(
    scopedApartmentIds,
    exemptApartmentIds
  );

  if (payableApartmentIds.length === 0) {
    throw new HttpError(400, "Muaf olmayan en az bir daire bulunmalıdır.");
  }

  return {
    scopedApartmentIds,
    exemptApartmentIds,
    paymentBatchSiteId,
    paymentBatchBlockId,
    distributions: distributeAmountToApartments(
      params.expenseAmountKurus,
      payableApartmentIds
    ),
  };
}

function formatKurusAsTry(amountKurus: number) {
  return (amountKurus / 100).toLocaleString("tr-TR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

async function getPaymentBatchRecipients(paymentBatchId: string) {
  const allocations = await prisma.paymentAllocation.findMany({
    where: {
      paymentBatchId,
      status: "PENDING",
    },
    select: {
      amountKurus: true,
      apartment: {
        select: {
          number: true,
          residents: {
            where: {
              user: {
                status: "ACTIVE",
              },
            },
            select: {
              user: {
                select: {
                  id: true,
                  email: true,
                  phone: true,
                },
              },
            },
          },
        },
      },
    },
  });

  const recipientMap = new Map<
    string,
    {
      id: string;
      email: string;
      phone: string | null;
      amountKurus: number;
      apartmentNumbers: string[];
    }
  >();

  for (const allocation of allocations) {
    for (const resident of allocation.apartment.residents) {
      const existingRecipient = recipientMap.get(resident.user.id);

      if (existingRecipient) {
        existingRecipient.amountKurus += allocation.amountKurus;
        existingRecipient.apartmentNumbers.push(allocation.apartment.number);
        continue;
      }

      recipientMap.set(resident.user.id, {
        id: resident.user.id,
        email: resident.user.email,
        phone: resident.user.phone,
        amountKurus: allocation.amountKurus,
        apartmentNumbers: [allocation.apartment.number],
      });
    }
  }

  return Array.from(recipientMap.values());
}

export async function queueExpenseDistributionNotifications(params: {
  paymentBatch: {
    id: string;
    title: string;
    dueDate: Date;
  };
  sendSms: boolean;
  sendEmail: boolean;
  createdByUserId: string;
}) {
  const summary = {
    recipientCount: 0,
    emailNotificationCount: 0,
    smsNotificationCount: 0,
    failed: false,
  };

  if (!params.sendSms && !params.sendEmail) {
    return summary;
  }

  try {
    const recipients = await getPaymentBatchRecipients(params.paymentBatch.id);
    summary.recipientCount = recipients.length;

    const notificationJobs: Promise<unknown>[] = [];

    for (const recipient of recipients) {
      const message =
        `Yeni ödeme oluşturuldu: ${params.paymentBatch.title}. ` +
        `Daire: ${recipient.apartmentNumbers.join(", ")}. ` +
        `Tutar: ${formatKurusAsTry(recipient.amountKurus)} TL. ` +
        `Son ödeme tarihi: ${params.paymentBatch.dueDate
          .toISOString()
          .slice(0, 10)}.`;

      const metadata = {
        purpose: "ACCOUNTING_EXPENSE_DISTRIBUTION",
        paymentBatchId: params.paymentBatch.id,
        apartmentNumbers: recipient.apartmentNumbers,
        totalAmountKurus: recipient.amountKurus,
        dueDate: params.paymentBatch.dueDate.toISOString(),
      };

      if (params.sendEmail && recipient.email) {
        summary.emailNotificationCount += 1;
        notificationJobs.push(
          queueEmailNotification({
            recipientUserId: recipient.id,
            recipientEmail: recipient.email,
            subject: params.paymentBatch.title,
            message,
            sourceType: "PAYMENT_BATCH",
            entityType: "PaymentBatch",
            entityId: params.paymentBatch.id,
            metadata,
            createdByUserId: params.createdByUserId,
          })
        );
      }

      if (params.sendSms && recipient.phone) {
        summary.smsNotificationCount += 1;
        notificationJobs.push(
          queueSmsNotification({
            recipientUserId: recipient.id,
            recipientPhone: recipient.phone,
            message,
            sourceType: "PAYMENT_BATCH",
            entityType: "PaymentBatch",
            entityId: params.paymentBatch.id,
            metadata,
            createdByUserId: params.createdByUserId,
          })
        );
      }
    }

    await Promise.all(notificationJobs);
  } catch (error) {
    summary.failed = true;
    console.error("Gider dağıtım bildirimleri kuyruğa eklenemedi:", error);
  }

  return summary;
}

export async function createExpensePaymentBatch(params: {
  user: AccountingUser;
  expense: {
    id: string;
    title: string;
    description: string | null;
    amountKurus: number;
    status: "ACTIVE" | "CANCELLED";
    siteId: string;
    blockId: string | null;
    paymentBatchId: string | null;
  };
  input: ExpenseDistributionInput;
}) {
  if (params.expense.status !== "ACTIVE") {
    throw new HttpError(409, "İptal edilmiş gider dağıtılamaz.");
  }

  if (params.expense.paymentBatchId) {
    throw new HttpError(409, "Bu gider daha önce sakinlere dağıtılmış.");
  }

  const distribution = await resolveDistributionApartments({
    user: params.user,
    expense: {
      siteId: params.expense.siteId,
      blockId: params.expense.blockId,
    },
    input: params.input,
    expenseAmountKurus: params.expense.amountKurus,
  });

  return prisma.$transaction(async (transaction) => {
    const paymentBatch = await transaction.paymentBatch.create({
      data: {
        title: params.input.title?.trim() || `Gider Paylaşımı: ${params.expense.title}`,
        description:
          params.input.description?.trim() || params.expense.description,
        totalAmountKurus: params.expense.amountKurus,
        scopeType: params.input.scopeType,
        dueDate: params.input.dueDate,
        siteId: distribution.paymentBatchSiteId,
        blockId: distribution.paymentBatchBlockId,
        exemptions: {
          create: distribution.exemptApartmentIds.map((apartmentId) => ({
            apartmentId,
          })),
        },
        allocations: {
          create: distribution.distributions.map((item) => ({
            apartmentId: item.apartmentId,
            amountKurus: item.amountKurus,
          })),
        },
      },
      include: {
        allocations: true,
        exemptions: true,
      },
    });

    const linkResult = await transaction.accountingExpense.updateMany({
      where: {
        id: params.expense.id,
        status: "ACTIVE",
        paymentBatchId: null,
      },
      data: {
        paymentBatchId: paymentBatch.id,
      },
    });

    if (linkResult.count !== 1) {
      throw new HttpError(
        409,
        "Bu gider başka bir işlem tarafından daha önce dağıtılmış."
      );
    }

    return paymentBatch;
  });
}
