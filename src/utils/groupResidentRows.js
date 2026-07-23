function getResidentType(row) {
  const rawType = row?.residentType ?? row?.rawRecord?.type;

  if (rawType === "OWNER" || row?.role === "Ev Sahibi") {
    return "OWNER";
  }

  if (rawType === "TENANT" || row?.role === "Kiracı") {
    return "TENANT";
  }

  return rawType ?? null;
}

function apartmentHasTenant(row) {
  if (typeof row?.hasTenant === "boolean") {
    return row.hasTenant;
  }

  const residentLinks = Array.isArray(
    row?.rawRecord?.apartment?.residents
  )
    ? row.rawRecord.apartment.residents
    : [];

  return residentLinks.some(
    (residentLink) => residentLink?.type === "TENANT"
  );
}

function getOwnerGroupKey(row) {
  return (
    row?.userId ??
    row?.rawRecord?.userId ??
    row?.email ??
    row?.id
  );
}

function parseAmount(value) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  const normalizedValue = String(value ?? "")
    .replace(/\s/g, "")
    .replace(/TL|₺/gi, "")
    .replace(/\./g, "")
    .replace(",", ".")
    .replace(/[^\d.-]/g, "");

  const parsedValue = Number(normalizedValue);

  return Number.isFinite(parsedValue) ? parsedValue : 0;
}

function formatAmount(value) {
  const hasFraction = Math.abs(value % 1) > Number.EPSILON;

  return `${new Intl.NumberFormat("tr-TR", {
    minimumFractionDigits: hasFraction ? 2 : 0,
    maximumFractionDigits: 2,
  }).format(value)} TL`;
}

function sumAmount(rows, fieldName) {
  return formatAmount(
    rows.reduce(
      (total, row) => total + parseAmount(row?.[fieldName]),
      0
    )
  );
}

function getCombinedPaymentStatus(rows) {
  const statuses = [
    ...new Set(
      rows
        .map((row) => String(row?.paymentStatus ?? "").trim())
        .filter(Boolean)
    ),
  ];

  if (statuses.length === 0) {
    return "Yok";
  }

  if (statuses.length === 1) {
    return statuses[0];
  }

  const statusPriority = [
    "Gecikmiş",
    "Ödenmedi",
    "Kısmi",
    "Bekliyor",
    "Ödendi",
    "Yok",
  ];

  return (
    statusPriority.find((status) => statuses.includes(status)) ??
    "Karışık"
  );
}

function getSharedLocationLabel(rows, fieldName, multipleLabel) {
  const values = [
    ...new Set(
      rows
        .map((row) => row?.[fieldName])
        .filter((value) => value && value !== "-")
    ),
  ];

  if (values.length === 0) {
    return "-";
  }

  if (values.length === 1) {
    return values[0];
  }

  return `${values.length} ${multipleLabel}`;
}

function compareApartmentRows(firstRow, secondRow) {
  const firstText = [
    firstRow?.site,
    firstRow?.block,
    firstRow?.apartment,
  ]
    .filter(Boolean)
    .join(" ");

  const secondText = [
    secondRow?.site,
    secondRow?.block,
    secondRow?.apartment,
  ]
    .filter(Boolean)
    .join(" ");

  return firstText.localeCompare(secondText, "tr", {
    numeric: true,
    sensitivity: "base",
  });
}

function buildOwnerSummary(ownerRows, ownerKey) {
  const apartmentRows = [...ownerRows].sort(compareApartmentRows);
  const firstVacantApartment =
    apartmentRows.find((row) => !apartmentHasTenant(row)) ??
    apartmentRows[0];

  return {
    ...firstVacantApartment,
    id: `owner-summary-${ownerKey}`,
    isMultiApartmentOwner: true,
    apartmentCount: apartmentRows.length,
    vacantApartmentCount: apartmentRows.filter(
      (row) => !apartmentHasTenant(row)
    ).length,
    apartmentRows,
    site: getSharedLocationLabel(
      apartmentRows,
      "site",
      "Site"
    ),
    block: getSharedLocationLabel(
      apartmentRows,
      "block",
      "Blok"
    ),
    apartment: `${apartmentRows.length} Daire`,
    totalDebt: sumAmount(apartmentRows, "totalDebt"),
    paidAmount: sumAmount(apartmentRows, "paidAmount"),
    remainingDebt: sumAmount(apartmentRows, "remainingDebt"),
    paymentStatus: getCombinedPaymentStatus(apartmentRows),
  };
}

/*
 * Görüntüleme kuralları:
 * 1. Kiracı bağlantıları her zaman gösterilir.
 * 2. Kiracısı bulunan tek dairenin ev sahibi ayrıca gösterilmez.
 * 3. Ev sahibinin bütün daireleri kiradaysa ev sahibi tabloda gösterilmez.
 * 4. En az bir dairesi boşsa ev sahibi bir kez gösterilir.
 * 5. Birden fazla dairesi olan ev sahibinin ok altında tüm daireleri bulunur.
 */
export function groupResidentRows(rows = []) {
  const safeRows = Array.isArray(rows) ? rows.filter(Boolean) : [];
  const ownerGroups = new Map();

  for (const row of safeRows) {
    if (getResidentType(row) !== "OWNER") {
      continue;
    }

    const ownerKey = getOwnerGroupKey(row);
    const currentRows = ownerGroups.get(ownerKey) ?? [];

    currentRows.push(row);
    ownerGroups.set(ownerKey, currentRows);
  }

  const processedOwnerKeys = new Set();
  const visibleRows = [];

  for (const row of safeRows) {
    const residentType = getResidentType(row);

    if (residentType !== "OWNER") {
      visibleRows.push(row);
      continue;
    }

    const ownerKey = getOwnerGroupKey(row);

    if (processedOwnerKeys.has(ownerKey)) {
      continue;
    }

    processedOwnerKeys.add(ownerKey);

    const ownerRows = ownerGroups.get(ownerKey) ?? [row];
    const hasAtLeastOneVacantApartment = ownerRows.some(
      (ownerRow) => !apartmentHasTenant(ownerRow)
    );

    // Ev sahibinin bütün dairelerinde kiracı varsa kendisi listelenmez.
    if (!hasAtLeastOneVacantApartment) {
      continue;
    }

    if (ownerRows.length === 1) {
      visibleRows.push(ownerRows[0]);
      continue;
    }

    visibleRows.push(buildOwnerSummary(ownerRows, ownerKey));
  }

  return visibleRows;
}
