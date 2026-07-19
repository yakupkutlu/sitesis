import { useMemo, useState } from "react";

const COUNTRY_OPTIONS = [
  { code: "+90", label: "Türkiye (+90)" },
  { code: "+963", label: "Suriye (+963)" },
  { code: "+964", label: "Irak (+964)" },
  { code: "+49", label: "Almanya (+49)" },
  { code: "+966", label: "Suudi Arabistan (+966)" },
  { code: "+962", label: "Ürdün (+962)" },
  { code: "+961", label: "Lübnan (+961)" },
  { code: "+971", label: "BAE (+971)" },
  { code: "+974", label: "Katar (+974)" },
  { code: "+965", label: "Kuveyt (+965)" },
  { code: "+33", label: "Fransa (+33)" },
  { code: "+31", label: "Hollanda (+31)" },
  { code: "+32", label: "Belçika (+32)" },
  { code: "+44", label: "Birleşik Krallık (+44)" },
  { code: "+1", label: "ABD / Kanada (+1)" },
  { code: "CUSTOM", label: "Diğer ülke kodu" },
];

const INTERNATIONAL_PHONE_PATTERN = /^\+[1-9]\d{7,14}$/;

function sanitizeDigits(value, maxLength = 15) {
  return String(value ?? "")
    .replace(/\D/g, "")
    .slice(0, maxLength);
}

function sanitizeCountryCode(value) {
  const digits = sanitizeDigits(value, 3);
  return digits ? `+${digits}` : "";
}

function getKnownCountryCodes() {
  return COUNTRY_OPTIONS
    .filter((country) => country.code !== "CUSTOM")
    .map((country) => country.code)
    .sort((left, right) => right.length - left.length);
}

function parseInternationalPhone(value) {
  const normalizedValue = String(value ?? "")
    .trim()
    .replace(/[\s()-]/g, "");

  if (!normalizedValue) {
    return {
      selectedCountryCode: "+90",
      customCountryCode: "",
      localNumber: "",
    };
  }

  const phoneWithPlus = normalizedValue.startsWith("00")
    ? `+${normalizedValue.slice(2)}`
    : normalizedValue.startsWith("+")
      ? normalizedValue
      : `+${normalizedValue}`;

  const knownCountryCode = getKnownCountryCodes().find((code) =>
    phoneWithPlus.startsWith(code)
  );

  if (knownCountryCode) {
    return {
      selectedCountryCode: knownCountryCode,
      customCountryCode: "",
      localNumber: sanitizeDigits(
        phoneWithPlus.slice(knownCountryCode.length)
      ),
    };
  }

  const digits = phoneWithPlus.replace(/\D/g, "");

  return {
    selectedCountryCode: "CUSTOM",
    customCountryCode: digits ? `+${digits.slice(0, 3)}` : "",
    localNumber: sanitizeDigits(digits.slice(3)),
  };
}

function buildInternationalPhone(countryCode, localNumber) {
  const normalizedCountryCode = String(countryCode ?? "").trim();
  const normalizedLocalNumber = sanitizeDigits(localNumber);

  if (!normalizedCountryCode || !normalizedLocalNumber) {
    return "";
  }

  return `${normalizedCountryCode}${normalizedLocalNumber}`;
}

function InternationalPhoneInput({
  name = "phone",
  value = "",
  onChange,
  disabled = false,
  required = false,
  label = "Telefon",
  helpText = "Ülkeyi seçin ve numarayı başındaki sıfır olmadan yazın.",
}) {
  const parsedPhone = useMemo(
    () => parseInternationalPhone(value),
    [value]
  );

  const [draftCountryCode, setDraftCountryCode] = useState(
    parsedPhone.selectedCountryCode
  );
  const [draftCustomCountryCode, setDraftCustomCountryCode] = useState(
    parsedPhone.customCountryCode
  );
  const [errorMessage, setErrorMessage] = useState("");

  const hasControlledPhoneValue = Boolean(String(value ?? "").trim());

  const selectedCountryCode = hasControlledPhoneValue
    ? parsedPhone.selectedCountryCode
    : draftCountryCode;

  const customCountryCode =
    hasControlledPhoneValue &&
    parsedPhone.selectedCountryCode === "CUSTOM"
      ? parsedPhone.customCountryCode
      : draftCustomCountryCode;

  const localNumber = parsedPhone.localNumber;

  function emitChange(countryCode, nextLocalNumber) {
    const nextValue = buildInternationalPhone(
      countryCode,
      nextLocalNumber
    );

    onChange?.({
      target: {
        name,
        value: nextValue,
      },
    });
  }

  function getActiveCountryCode(
    nextSelectedCountryCode = selectedCountryCode,
    nextCustomCountryCode = customCountryCode
  ) {
    return nextSelectedCountryCode === "CUSTOM"
      ? nextCustomCountryCode
      : nextSelectedCountryCode;
  }

  function handleCountryChange(event) {
    const nextSelectedCountryCode = event.target.value;

    setDraftCountryCode(nextSelectedCountryCode);
    setErrorMessage("");

    emitChange(
      getActiveCountryCode(
        nextSelectedCountryCode,
        draftCustomCountryCode
      ),
      localNumber
    );
  }

  function handleCustomCountryCodeChange(event) {
    const nextCustomCountryCode = sanitizeCountryCode(event.target.value);

    setDraftCustomCountryCode(nextCustomCountryCode);
    setErrorMessage("");

    emitChange(nextCustomCountryCode, localNumber);
  }

  function handleLocalNumberChange(event) {
    const activeCountryCode = getActiveCountryCode();
    const countryCodeDigitCount = activeCountryCode.replace(/\D/g, "").length;
    const maxLocalLength = Math.max(1, 15 - countryCodeDigitCount);
    const nextLocalNumber = sanitizeDigits(
      event.target.value,
      maxLocalLength
    );

    setErrorMessage("");
    emitChange(activeCountryCode, nextLocalNumber);
  }

  function validatePhone() {
    const activeCountryCode = getActiveCountryCode();
    const phoneValue = buildInternationalPhone(
      activeCountryCode,
      localNumber
    );

    if (!phoneValue) {
      setErrorMessage(
        required ? "Telefon numarası zorunludur." : ""
      );
      return !required;
    }

    if (!INTERNATIONAL_PHONE_PATTERN.test(phoneValue)) {
      setErrorMessage(
        "Telefon numarası ülke koduyla birlikte 8-15 rakam olmalıdır."
      );
      return false;
    }

    setErrorMessage("");
    return true;
  }

  return (
    <div className="international-phone-field">
      <label htmlFor={`${name}-local-number`}>{label}</label>

      <div
        className={`international-phone-row ${
          selectedCountryCode === "CUSTOM" ? "custom-code" : ""
        }`}
      >
        <select
          value={selectedCountryCode}
          onChange={handleCountryChange}
          disabled={disabled}
          aria-label="Ülke kodu"
        >
          {COUNTRY_OPTIONS.map((country) => (
            <option value={country.code} key={country.code}>
              {country.label}
            </option>
          ))}
        </select>

        {selectedCountryCode === "CUSTOM" && (
          <input
            type="text"
            inputMode="tel"
            autoComplete="off"
            value={customCountryCode}
            onChange={handleCustomCountryCodeChange}
            onBlur={validatePhone}
            placeholder="+000"
            maxLength={4}
            disabled={disabled}
            aria-label="Özel ülke kodu"
          />
        )}

        <input
          id={`${name}-local-number`}
          type="text"
          inputMode="numeric"
          autoComplete="tel-national"
          value={localNumber}
          onChange={handleLocalNumberChange}
          onBlur={validatePhone}
          placeholder="Telefon numarası"
          maxLength={15}
          disabled={disabled}
          required={required}
          aria-invalid={Boolean(errorMessage)}
        />
      </div>

      {errorMessage ? (
        <small className="international-phone-error">
          {errorMessage}
        </small>
      ) : (
        <small>{helpText}</small>
      )}
    </div>
  );
}

export default InternationalPhoneInput;
