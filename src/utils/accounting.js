export const accountingExpenseCategoryLabels = {
  ELEVATOR: "Asansör",
  MAINTENANCE: "Bakım",
  REPAIR: "Onarım",
  CLEANING: "Temizlik",
  PERSONNEL: "Personel",
  UTILITIES: "Faturalar",
  INSURANCE: "Sigorta",
  TAX: "Vergi",
  SECURITY: "Güvenlik",
  LANDSCAPING: "Çevre Düzenleme",
  OTHER: "Diğer",
};

export function getDataArray(result) {
  const data = result?.data ?? result;

  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.expenses)) return data.expenses;
  if (Array.isArray(data?.income)) return data.income;
  if (Array.isArray(data?.apartments)) return data.apartments;

  return [];
}

export function formatKurus(value) {
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: "TRY",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format((Number(value) || 0) / 100);
}

export function formatDate(value) {
  if (!value) return "-";

  try {
    return new Date(value).toLocaleDateString("tr-TR");
  } catch {
    return "-";
  }
}

export function toInputDate(value) {
  if (!value) return "";

  try {
    return new Date(value).toISOString().slice(0, 10);
  } catch {
    return "";
  }
}

export function parseTryToKurus(value) {
  const normalizedValue = String(value ?? "")
    .trim()
    .replace(/\s/g, "")
    .replace(",", ".");

  const numberValue = Number(normalizedValue);

  if (!Number.isFinite(numberValue) || numberValue <= 0) {
    return null;
  }

  return Math.round(numberValue * 100);
}

export function getUniqueSites(apartments) {
  const siteMap = new Map();

  for (const apartment of apartments) {
    const site = apartment.block?.site;

    if (site?.id) {
      siteMap.set(site.id, {
        id: site.id,
        name: site.name,
      });
    }
  }

  return Array.from(siteMap.values()).sort((left, right) =>
    String(left.name ?? "").localeCompare(String(right.name ?? ""), "tr")
  );
}

export function getUniqueBlocks(apartments, siteId = "") {
  const blockMap = new Map();

  for (const apartment of apartments) {
    const block = apartment.block;

    if (!block?.id) continue;
    if (siteId && block.site?.id !== siteId) continue;

    blockMap.set(block.id, {
      id: block.id,
      name: block.name,
      siteId: block.site?.id,
      siteName: block.site?.name,
    });
  }

  return Array.from(blockMap.values()).sort((left, right) =>
    String(left.name ?? "").localeCompare(String(right.name ?? ""), "tr")
  );
}

export function getApartmentLabel(apartment) {
  return `${apartment.block?.site?.name ?? "Site"} / ${
    apartment.block?.name ?? "Blok"
  } / Daire ${apartment.number ?? "-"}`;
}

export function distributePreview(totalKurus, apartmentCount) {
  if (!Number.isInteger(totalKurus) || totalKurus <= 0 || apartmentCount <= 0) {
    return {
      baseKurus: 0,
      remainder: 0,
      minimumKurus: 0,
      maximumKurus: 0,
    };
  }

  const baseKurus = Math.floor(totalKurus / apartmentCount);
  const remainder = totalKurus % apartmentCount;

  return {
    baseKurus,
    remainder,
    minimumKurus: baseKurus,
    maximumKurus: baseKurus + (remainder > 0 ? 1 : 0),
  };
}
