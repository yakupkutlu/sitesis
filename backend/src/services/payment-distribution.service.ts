export function distributeAmountToApartments(
  totalAmountKurus: number,
  apartmentIds: string[]
) {
  if (totalAmountKurus <= 0) {
    throw new Error("Toplam tutar sıfırdan büyük olmalıdır.");
  }

  if (apartmentIds.length === 0) {
    throw new Error("Ödeme dağıtılacak daire bulunamadı.");
  }

  const baseAmount = Math.floor(totalAmountKurus / apartmentIds.length);
  const remainder = totalAmountKurus % apartmentIds.length;

  return apartmentIds.map((apartmentId, index) => {
    return {
      apartmentId,
      amountKurus: baseAmount + (index < remainder ? 1 : 0),
    };
  });
}

export function excludeExemptApartments(
  apartmentIds: string[],
  exemptApartmentIds: string[]
) {
  const exemptApartmentIdSet = new Set(exemptApartmentIds);

  return apartmentIds.filter((apartmentId) => {
    return !exemptApartmentIdSet.has(apartmentId);
  });
}

export function findInvalidExemptApartments(
  apartmentIds: string[],
  exemptApartmentIds: string[]
) {
  const apartmentIdSet = new Set(apartmentIds);

  return exemptApartmentIds.filter((apartmentId) => {
    return !apartmentIdSet.has(apartmentId);
  });
}