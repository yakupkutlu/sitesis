export function formatMoneyFromKurus(value) {
  const amount = Number(value || 0) / 100;

  return `${amount.toLocaleString("tr-TR")} TL`;
}

function getPaymentAllocationsFromResidentRecord(record) {
  const apartment = record?.apartment ?? {};
  const user = record?.user ?? {};

  return [
    ...(record?.paymentAllocations ?? []),
    ...(user?.paymentAllocations ?? []),
    ...(apartment?.paymentAllocations ?? []),
  ];
}

export function buildPaymentSummary(record) {
  const allocations = getPaymentAllocationsFromResidentRecord(record).filter(
    (allocation) => allocation.status !== "CANCELLED"
  );

  const totalDebtKurus = allocations.reduce(
    (sum, allocation) => sum + Number(allocation.amountKurus || 0),
    0
  );

  const paidAmountKurus = allocations
    .filter((allocation) => allocation.status === "PAID")
    .reduce((sum, allocation) => sum + Number(allocation.amountKurus || 0), 0);

  const remainingDebtKurus = allocations
    .filter((allocation) => allocation.status !== "PAID")
    .reduce((sum, allocation) => sum + Number(allocation.amountKurus || 0), 0);

  let paymentStatus = "Yok";

  if (totalDebtKurus > 0 && remainingDebtKurus <= 0) {
    paymentStatus = "Ödendi";
  } else if (paidAmountKurus > 0 && remainingDebtKurus > 0) {
    paymentStatus = "Kısmi Ödeme";
  } else if (remainingDebtKurus > 0) {
    paymentStatus = "Bekliyor";
  }

  return {
    totalDebt: formatMoneyFromKurus(totalDebtKurus),
    paidAmount: formatMoneyFromKurus(paidAmountKurus),
    remainingDebt: formatMoneyFromKurus(remainingDebtKurus),
    paymentStatus,
  };
}
