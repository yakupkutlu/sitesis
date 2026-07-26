import { type Prisma } from "../generated/prisma/client.js";


export type AutomaticBalancePayment = {
  transactionId: string;
  paymentAllocationId: string;
  paymentBatchId: string;
  paymentTitle: string;
  amountKurus: number;
  remainingDebtAfterKurus: number;
  paymentStatusAfter: "PARTIAL" | "PAID";
  balanceAfterKurus: number;
};

export type BalanceDistributionResult = {
  creditedAmountKurus: number;
  distributedAmountKurus: number;
  remainingBalanceKurus: number;
  automaticPayments: AutomaticBalancePayment[];
};

function getPaymentState(
  totalAmountKurus: number,
  paidAmountKurus: number,
): {
  status: "PENDING" | "PARTIAL" | "PAID";
  remainingAmountKurus: number;
} {
  const safeTotal = Math.max(0, totalAmountKurus);
  const safePaid = Math.max(0, paidAmountKurus);
  const remainingAmountKurus = Math.max(safeTotal - safePaid, 0);

  const status =
    safePaid <= 0
      ? ("PENDING" as const)
      : safePaid < safeTotal
        ? ("PARTIAL" as const)
        : ("PAID" as const);

  return {
    status,
    remainingAmountKurus,
  };
}

async function ensureAndLockBalanceAccount(
  transaction: Prisma.TransactionClient,
  apartmentId: string,
) {
  await transaction.apartmentBalanceAccount.upsert({
    where: {
      apartmentId,
    },
    create: {
      apartmentId,
    },
    update: {},
  });

  await transaction.$queryRaw<Array<{ id: string }>>`
    SELECT "id"
    FROM "ApartmentBalanceAccount"
    WHERE "apartmentId" = ${apartmentId}
    FOR UPDATE
  `;

  return transaction.apartmentBalanceAccount.findUniqueOrThrow({
    where: {
      apartmentId,
    },
  });
}

async function lockExistingBalanceAccount(
  transaction: Prisma.TransactionClient,
  apartmentId: string,
) {
  const existingAccount = await transaction.apartmentBalanceAccount.findUnique({
    where: {
      apartmentId,
    },
    select: {
      id: true,
      availableAmountKurus: true,
    },
  });

  if (!existingAccount || existingAccount.availableAmountKurus <= 0) {
    return null;
  }

  await transaction.$queryRaw<Array<{ id: string }>>`
    SELECT "id"
    FROM "ApartmentBalanceAccount"
    WHERE "apartmentId" = ${apartmentId}
    FOR UPDATE
  `;

  return transaction.apartmentBalanceAccount.findUnique({
    where: {
      apartmentId,
    },
  });
}

async function applyBalanceAmountToAllocation(
  transaction: Prisma.TransactionClient,
  params: {
    balanceAccountId: string;
    paymentAllocationId: string;
    amountKurus: number;
    idempotencyKey: string;
    createdByUserId?: string;
    description: string;
  },
): Promise<AutomaticBalancePayment | null> {
  const safeAmountKurus = Math.max(0, Math.round(params.amountKurus));

  if (safeAmountKurus <= 0) {
    return null;
  }

  const existingTransaction =
    await transaction.apartmentBalanceTransaction.findUnique({
      where: {
        idempotencyKey: params.idempotencyKey,
      },
      select: {
        id: true,
      },
    });

  if (existingTransaction) {
    return null;
  }

  await transaction.$queryRaw<Array<{ id: string }>>`
    SELECT "id"
    FROM "PaymentAllocation"
    WHERE "id" = ${params.paymentAllocationId}
    FOR UPDATE
  `;

  const allocation = await transaction.paymentAllocation.findUnique({
    where: {
      id: params.paymentAllocationId,
    },
    select: {
      id: true,
      apartmentId: true,
      paymentBatchId: true,
      amountKurus: true,
      paidAmountKurus: true,
      status: true,
      paymentBatch: {
        select: {
          title: true,
        },
      },
      receipts: {
        where: {
          status: "PENDING",
        },
        select: {
          id: true,
        },
        take: 1,
      },
    },
  });

  if (
    !allocation ||
    allocation.status === "PAID" ||
    allocation.status === "CANCELLED" ||
    allocation.receipts.length > 0
  ) {
    return null;
  }

  const remainingBeforeKurus = Math.max(
    allocation.amountKurus - allocation.paidAmountKurus,
    0,
  );
  const amountToApplyKurus = Math.min(safeAmountKurus, remainingBeforeKurus);

  if (amountToApplyKurus <= 0) {
    return null;
  }

  const account = await transaction.apartmentBalanceAccount.findUniqueOrThrow({
    where: {
      id: params.balanceAccountId,
    },
    select: {
      apartmentId: true,
      availableAmountKurus: true,
    },
  });

  if (account.apartmentId !== allocation.apartmentId) {
    throw new Error(
      "Bakiye hesabı ile ödeme kaydının dairesi eşleşmiyor.",
    );
  }

  if (account.availableAmountKurus < amountToApplyKurus) {
    return null;
  }

  const nextPaidAmountKurus =
    allocation.paidAmountKurus + amountToApplyKurus;
  const paymentState = getPaymentState(
    allocation.amountKurus,
    nextPaidAmountKurus,
  );

  await transaction.paymentAllocation.update({
    where: {
      id: allocation.id,
    },
    data: {
      paidAmountKurus: nextPaidAmountKurus,
      status: paymentState.status,
      paidAt: paymentState.status === "PAID" ? new Date() : null,
    },
  });

  const updatedAccount = await transaction.apartmentBalanceAccount.update({
    where: {
      id: params.balanceAccountId,
    },
    data: {
      availableAmountKurus: {
        decrement: amountToApplyKurus,
      },
    },
  });

  const balanceTransaction =
    await transaction.apartmentBalanceTransaction.create({
      data: {
        balanceAccountId: params.balanceAccountId,
        type: "DEBIT_TO_PAYMENT",
        amountKurus: amountToApplyKurus,
        balanceAfterKurus: updatedAccount.availableAmountKurus,
        remainingDebtAfterKurus: paymentState.remainingAmountKurus,
        paymentStatusAfter: paymentState.status,
        paymentAllocationId: allocation.id,
        idempotencyKey: params.idempotencyKey,
        description: params.description,
        createdByUserId: params.createdByUserId,
      },
    });

  return {
    transactionId: balanceTransaction.id,
    paymentAllocationId: allocation.id,
    paymentBatchId: allocation.paymentBatchId,
    paymentTitle: allocation.paymentBatch.title,
    amountKurus: amountToApplyKurus,
    remainingDebtAfterKurus: paymentState.remainingAmountKurus,
    paymentStatusAfter:
      paymentState.status === "PAID" ? "PAID" : "PARTIAL",
    balanceAfterKurus: updatedAccount.availableAmountKurus,
  };
}

export async function creditAndDistributeOverpayment(
  transaction: Prisma.TransactionClient,
  params: {
    apartmentId: string;
    sourcePaymentAllocationId: string;
    sourceReceiptId: string;
    overpaymentAmountKurus: number;
    createdByUserId?: string;
  },
): Promise<BalanceDistributionResult> {
  const overpaymentAmountKurus = Math.max(
    0,
    Math.round(params.overpaymentAmountKurus),
  );

  if (overpaymentAmountKurus <= 0) {
    return {
      creditedAmountKurus: 0,
      distributedAmountKurus: 0,
      remainingBalanceKurus: 0,
      automaticPayments: [],
    };
  }

  const existingCredit =
    await transaction.apartmentBalanceTransaction.findUnique({
      where: {
        sourceReceiptId: params.sourceReceiptId,
      },
      select: {
        id: true,
        balanceAfterKurus: true,
      },
    });

  if (existingCredit) {
    const existingAccount =
      await transaction.apartmentBalanceAccount.findUnique({
        where: {
          apartmentId: params.apartmentId,
        },
        select: {
          availableAmountKurus: true,
        },
      });

    return {
      creditedAmountKurus: 0,
      distributedAmountKurus: 0,
      remainingBalanceKurus:
        existingAccount?.availableAmountKurus ??
        existingCredit.balanceAfterKurus,
      automaticPayments: [],
    };
  }

  const account = await ensureAndLockBalanceAccount(
    transaction,
    params.apartmentId,
  );

  const creditedAccount = await transaction.apartmentBalanceAccount.update({
    where: {
      id: account.id,
    },
    data: {
      availableAmountKurus: {
        increment: overpaymentAmountKurus,
      },
    },
  });

  const creditTransaction =
    await transaction.apartmentBalanceTransaction.create({
      data: {
        balanceAccountId: account.id,
        type: "CREDIT_FROM_OVERPAYMENT",
        amountKurus: overpaymentAmountKurus,
        balanceAfterKurus: creditedAccount.availableAmountKurus,
        sourceReceiptId: params.sourceReceiptId,
        idempotencyKey: `OVERPAYMENT_CREDIT:${params.sourceReceiptId}`,
        description: "Onaylanan dekonttaki fazla ödeme daire bakiyesine eklendi.",
        createdByUserId: params.createdByUserId,
      },
    });

  const targetAllocations = await transaction.paymentAllocation.findMany({
    where: {
      apartmentId: params.apartmentId,
      id: {
        not: params.sourcePaymentAllocationId,
      },
      status: {
        in: ["PENDING", "PARTIAL"],
      },
      receipts: {
        none: {
          status: "PENDING",
        },
      },
    },
    select: {
      id: true,
      amountKurus: true,
      paidAmountKurus: true,
      paymentBatch: {
        select: {
          dueDate: true,
          createdAt: true,
        },
      },
    },
    orderBy: [
      {
        paymentBatch: {
          dueDate: "asc",
        },
      },
      {
        createdAt: "asc",
      },
      {
        id: "asc",
      },
    ],
  });

  let distributionBudgetKurus = overpaymentAmountKurus;
  const automaticPayments: AutomaticBalancePayment[] = [];

  for (const allocation of targetAllocations) {
    if (distributionBudgetKurus <= 0) {
      break;
    }

    const remainingDebtKurus = Math.max(
      allocation.amountKurus - allocation.paidAmountKurus,
      0,
    );

    if (remainingDebtKurus <= 0) {
      continue;
    }

    const appliedPayment = await applyBalanceAmountToAllocation(transaction, {
      balanceAccountId: account.id,
      paymentAllocationId: allocation.id,
      amountKurus: Math.min(distributionBudgetKurus, remainingDebtKurus),
      idempotencyKey:
        `AUTO_DISTRIBUTE:${creditTransaction.id}:${allocation.id}`,
      createdByUserId: params.createdByUserId,
      description:
        "Fazla ödeme bakiyesi açık borca otomatik olarak kullanıldı.",
    });

    if (!appliedPayment) {
      continue;
    }

    automaticPayments.push(appliedPayment);
    distributionBudgetKurus -= appliedPayment.amountKurus;
  }

  const finalAccount = await transaction.apartmentBalanceAccount.findUniqueOrThrow({
    where: {
      id: account.id,
    },
    select: {
      availableAmountKurus: true,
    },
  });

  const distributedAmountKurus = automaticPayments.reduce(
    (total, payment) => total + payment.amountKurus,
    0,
  );

  return {
    creditedAmountKurus: overpaymentAmountKurus,
    distributedAmountKurus,
    remainingBalanceKurus: finalAccount.availableAmountKurus,
    automaticPayments,
  };
}

export async function applyAvailableBalanceToNewAllocation(
  transaction: Prisma.TransactionClient,
  params: {
    apartmentId: string;
    paymentAllocationId: string;
    paymentBatchId: string;
    createdByUserId?: string;
  },
): Promise<AutomaticBalancePayment | null> {
  const account = await lockExistingBalanceAccount(
    transaction,
    params.apartmentId,
  );

  if (!account || account.availableAmountKurus <= 0) {
    return null;
  }

  return applyBalanceAmountToAllocation(transaction, {
    balanceAccountId: account.id,
    paymentAllocationId: params.paymentAllocationId,
    amountKurus: account.availableAmountKurus,
    idempotencyKey:
      `NEW_PAYMENT_ALLOCATION:${params.paymentBatchId}:${params.paymentAllocationId}`,
    createdByUserId: params.createdByUserId,
    description:
      "Dairede bulunan fazla bakiye yeni oluşturulan borca otomatik olarak kullanıldı.",
  });
}
