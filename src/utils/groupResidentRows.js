const currencyFormatter = new Intl.NumberFormat("tr-TR", {
  style: "currency",
  currency: "TRY",
});

function formatCurrencyFromKurus(value) {
  return currencyFormatter.format((Number(value) || 0) / 100);
}

function parseCurrencyToKurus(value) {
  if (typeof value !== "string") {
    return 0;
  }

  const normalized = value
    .replace(/[^\d,.-]/g, "")
    .replace(/\./g, "")
    .replace(",", ".");

  const amount = Number(normalized);

  return Number.isFinite(amount) ? Math.round(amount * 100) : 0;
}

function getPaymentAmounts(row) {
  const rawRecord = row?.rawRecord ?? row?.raw ?? {};
  const allocations = Array.isArray(
    rawRecord?.apartment?.paymentAllocations
  )
    ? rawRecord.apartment.paymentAllocations
    : [];

  if (allocations.length === 0) {
    return {
      totalDebtKurus: parseCurrencyToKurus(row?.totalDebt),
      paidAmountKurus: parseCurrencyToKurus(row?.paidAmount),
      remainingDebtKurus: parseCurrencyToKurus(row?.remainingDebt),
    };
  }

  return allocations.reduce(
    (totals, allocation) => {
      const amountKurus = Number(allocation?.amountKurus) || 0;

      totals.totalDebtKurus += amountKurus;

      if (allocation?.status === "PAID") {
        totals.paidAmountKurus += amountKurus;
      }

      if (allocation?.status === "PENDING") {
        totals.remainingDebtKurus += amountKurus;
      }

      return totals;
    },
    {
      totalDebtKurus: 0,
      paidAmountKurus: 0,
      remainingDebtKurus: 0,
    }
  );
}

function getAggregatePaymentStatus(rows) {
  const statuses = rows
    .map((row) => row?.paymentStatus)
    .filter(Boolean);

  if (statuses.length === 0) {
    return "-";
  }

  if (statuses.every((status) => status === "Ödendi")) {
    return "Ödendi";
  }

  if (statuses.some((status) => status === "Gecikmiş")) {
    return "Gecikmiş";
  }

  if (
    statuses.some(
      (status) =>
        status === "Ödendi" ||
        status === "Kısmi Ödeme" ||
        status === "Kısmi Ödendi"
    )
  ) {
    return "Kısmi Ödeme";
  }

  if (statuses.some((status) => status === "Dekont Bekliyor")) {
    return "Dekont Bekliyor";
  }

  return statuses.find((status) => status !== "-") ?? "-";
}

function getOwnerGroupKey(row) {
  const rawRecord = row?.rawRecord ?? row?.raw ?? {};
  const userId = row?.userId ?? rawRecord?.user?.id;

  return userId || row?.email || row?.id;
}

function getUniqueValues(rows, fieldName) {
  return Array.from(
    new Set(
      rows
        .map((row) => row?.[fieldName])
        .filter((value) => value && value !== "-")
    )
  );
}

function createOwnerGroup(rows, groupKey) {
  const firstRow = rows[0];

  if (rows.length <= 1) {
    return firstRow;
  }

  const totals = rows.reduce(
    (result, row) => {
      const amounts = getPaymentAmounts(row);

      result.totalDebtKurus += amounts.totalDebtKurus;
      result.paidAmountKurus += amounts.paidAmountKurus;
      result.remainingDebtKurus += amounts.remainingDebtKurus;

      return result;
    },
    {
      totalDebtKurus: 0,
      paidAmountKurus: 0,
      remainingDebtKurus: 0,
    }
  );

  const sites = getUniqueValues(rows, "site");
  const blocks = getUniqueValues(rows, "block");

  return {
    ...firstRow,
    id: `owner-group-${groupKey}`,
    isMultiApartmentOwner: true,
    apartmentCount: rows.length,
    apartmentRows: rows,
    statusReferenceId: firstRow.id,
    site: sites.length === 1 ? sites[0] : `${sites.length} Site`,
    block: blocks.length === 1 ? blocks[0] : `${blocks.length} Blok`,
    apartment: `${rows.length} Daire`,
    note: `${rows.length} daire bağlantısı`,
    totalDebt: formatCurrencyFromKurus(totals.totalDebtKurus),
    paidAmount: formatCurrencyFromKurus(totals.paidAmountKurus),
    remainingDebt: formatCurrencyFromKurus(totals.remainingDebtKurus),
    paymentStatus: getAggregatePaymentStatus(rows),
  };
}

export function groupResidentRows(rows = []) {
  const ownerGroups = new Map();
  const orderedEntries = [];

  rows.forEach((row) => {
    if (row?.role !== "Ev Sahibi") {
      orderedEntries.push({
        type: "single",
        row,
      });
      return;
    }

    const groupKey = getOwnerGroupKey(row);

    if (!ownerGroups.has(groupKey)) {
      ownerGroups.set(groupKey, []);
      orderedEntries.push({
        type: "owner",
        groupKey,
      });
    }

    ownerGroups.get(groupKey).push(row);
  });

  return orderedEntries.map((entry) => {
    if (entry.type === "single") {
      return entry.row;
    }

    return createOwnerGroup(
      ownerGroups.get(entry.groupKey) ?? [],
      entry.groupKey
    );
  });
}
