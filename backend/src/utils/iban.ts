export function normalizeIban(value: string) {
  return value.replace(/\s+/g, "").toUpperCase();
}

export function isValidIban(value: string) {
  const normalizedIban = normalizeIban(value);

  if (
    normalizedIban.length < 15 ||
    normalizedIban.length > 34 ||
    !/^[A-Z]{2}\d{2}[A-Z0-9]+$/.test(normalizedIban)
  ) {
    return false;
  }

  if (
    normalizedIban.startsWith("TR") &&
    normalizedIban.length !== 26
  ) {
    return false;
  }

  const rearrangedIban =
    normalizedIban.slice(4) + normalizedIban.slice(0, 4);

  let remainder = 0;

  for (const character of rearrangedIban) {
    const numericValue =
      character >= "0" && character <= "9"
        ? character
        : String(character.charCodeAt(0) - 55);

    for (const digit of numericValue) {
      remainder = (remainder * 10 + Number(digit)) % 97;
    }
  }

  return remainder === 1;
}

export function maskIban(value: string) {
  const normalizedIban = normalizeIban(value);

  if (normalizedIban.length <= 8) {
    return normalizedIban;
  }

  return `${normalizedIban.slice(0, 4)}${"*".repeat(
    normalizedIban.length - 8
  )}${normalizedIban.slice(-4)}`;
}
