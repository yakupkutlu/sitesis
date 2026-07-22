export type PaymentDistributionItem = {
  apartmentId: string;
  amountKurus: number;
};

function getUniqueIds(ids: string[]) {
  return Array.from(new Set(ids));
}

export function findInvalidExemptApartments(
  scopedApartmentIds: string[],
  exemptApartmentIds: string[]
) {
  const scopedApartmentIdSet = new Set(scopedApartmentIds);

  return getUniqueIds(exemptApartmentIds).filter(
    (apartmentId) => !scopedApartmentIdSet.has(apartmentId)
  );
}

export function excludeExemptApartments(
  scopedApartmentIds: string[],
  exemptApartmentIds: string[]
) {
  const exemptApartmentIdSet = new Set(exemptApartmentIds);

  return getUniqueIds(scopedApartmentIds).filter(
    (apartmentId) => !exemptApartmentIdSet.has(apartmentId)
  );
}

export function distributeAmountToApartments(
  totalAmountKurus: number,
  apartmentIds: string[]
): PaymentDistributionItem[] {
  if (!Number.isInteger(totalAmountKurus) || totalAmountKurus <= 0) {
    throw new Error("Toplam ödeme tutarı pozitif bir kuruş değeri olmalıdır.");
  }

  const uniqueApartmentIds = getUniqueIds(apartmentIds);

  if (uniqueApartmentIds.length === 0) {
    throw new Error("Ödeme dağıtımı için en az bir daire bulunmalıdır.");
  }

  const baseAmountKurus = Math.floor(
    totalAmountKurus / uniqueApartmentIds.length
  );
  const remainderKurus =
    totalAmountKurus % uniqueApartmentIds.length;

  return uniqueApartmentIds.map((apartmentId, index) => ({
    apartmentId,
    amountKurus:
      baseAmountKurus + (index < remainderKurus ? 1 : 0),
  }));
}
