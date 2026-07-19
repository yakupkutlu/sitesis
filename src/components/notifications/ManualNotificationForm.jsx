import { useEffect, useMemo, useState } from "react";
import {
  CheckSquare,
  Mail,
  MessageSquare,
  Plus,
  Search,
  Send,
  Square,
  Users,
  X,
} from "lucide-react";

import {
  sendManualEmail,
  sendManualSms,
} from "../../api/manualNotificationsApi";
import { getUsers } from "../../api/usersApi";

const PAGE_LIMIT = 100;
const MAX_RECIPIENT_COUNT = 100;
const INTERNATIONAL_PHONE_PATTERN = /^\+[1-9]\d{7,14}$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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

const roleLabelMap = {
  MANAGER: "Yönetici",
  RESIDENT: "Sakin",
};

function getDataArray(result) {
  const data = result?.data ?? result;

  if (Array.isArray(data)) {
    return data;
  }

  if (Array.isArray(data?.items)) {
    return data.items;
  }

  if (Array.isArray(data?.users)) {
    return data.users;
  }

  return [];
}

function getPagination(result) {
  return result?.pagination ?? result?.data?.pagination ?? null;
}

async function getAllUsersByRole(role) {
  const userMap = new Map();
  let page = 1;

  while (true) {
    const result = await getUsers({
      role,
      status: "ACTIVE",
      page,
      limit: PAGE_LIMIT,
    });

    const pageUsers = getDataArray(result);
    const previousSize = userMap.size;

    for (const user of pageUsers) {
      if (user?.id) {
        userMap.set(user.id, user);
      }
    }

    const pagination = getPagination(result);
    const totalPages = Number(pagination?.totalPages ?? 0);

    if (pageUsers.length === 0) {
      break;
    }

    if (totalPages > 0) {
      if (page >= totalPages) {
        break;
      }
    } else if (pageUsers.length < PAGE_LIMIT) {
      break;
    }

    if (userMap.size === previousSize) {
      break;
    }

    page += 1;
  }

  return Array.from(userMap.values());
}

function normalizeDirectRecipient(value, isEmail) {
  return isEmail ? value.trim().toLowerCase() : value.trim();
}

function validateDirectRecipient(value, isEmail) {
  const normalizedValue = normalizeDirectRecipient(value, isEmail);

  if (!normalizedValue) {
    return {
      isValid: false,
      message: isEmail
        ? "E-posta adresi girilmelidir."
        : "Telefon numarası girilmelidir.",
    };
  }

  if (isEmail) {
    if (!EMAIL_PATTERN.test(normalizedValue)) {
      return {
        isValid: false,
        message: "Geçerli bir e-posta adresi girilmelidir.",
      };
    }

    return { isValid: true, value: normalizedValue };
  }

  if (!INTERNATIONAL_PHONE_PATTERN.test(normalizedValue)) {
    return {
      isValid: false,
      message: "Telefon numarası + ülke kodu ile 8-15 rakam olmalıdır. Örnek: +905XXXXXXXXX veya +963XXXXXXXXX.",
    };
  }

  return { isValid: true, value: normalizedValue };
}

function sanitizeLocalPhoneInput(value) {
  return String(value ?? "")
    .replace(/\D/g, "")
    .slice(0, 15);
}

function sanitizeCountryCodeInput(value) {
  const digits = String(value ?? "")
    .replace(/\D/g, "")
    .slice(0, 3);

  return digits ? `+${digits}` : "";
}

function buildInternationalPhoneNumber(countryCode, localNumber) {
  const normalizedCountryCode = String(countryCode ?? "").trim();
  const normalizedLocalNumber = sanitizeLocalPhoneInput(localNumber);

  if (!/^\+[1-9]\d{0,2}$/.test(normalizedCountryCode)) {
    return {
      isValid: false,
      message: "Geçerli bir ülke kodu seçilmelidir.",
    };
  }

  if (!normalizedLocalNumber) {
    return {
      isValid: false,
      message: "Telefon numarası girilmelidir.",
    };
  }

  const internationalNumber =
    `${normalizedCountryCode}${normalizedLocalNumber}`;

  if (!INTERNATIONAL_PHONE_PATTERN.test(internationalNumber)) {
    return {
      isValid: false,
      message:
        "Ülke kodu ile birlikte telefon numarası toplam 8-15 rakam olmalıdır.",
    };
  }

  return {
    isValid: true,
    value: internationalNumber,
  };
}

function getUserContact(user, channel) {
  return channel === "EMAIL" ? user?.email?.trim() : user?.phone?.trim();
}

function getSuccessMessage(channel, summary) {
  const channelLabel = channel === "EMAIL" ? "E-posta" : "SMS";
  const sent = Number(summary?.sent ?? 0);
  const failed = Number(summary?.failed ?? 0);
  const skipped = Number(summary?.skipped ?? 0);
  const pending = Number(summary?.pending ?? 0);

  return `${channelLabel} işlemi tamamlandı. Gönderildi: ${sent}, Hatalı: ${failed}, Atlandı: ${skipped}, Bekliyor: ${pending}.`;
}

function ManualNotificationForm({ channel, onSent }) {
  const isEmail = channel === "EMAIL";
  const ChannelIcon = isEmail ? Mail : MessageSquare;
  const channelLabel = isEmail ? "E-posta" : "SMS";
  const directRecipientLabel = isEmail
    ? "Doğrudan E-posta Adresi"
    : "Doğrudan Telefon Numarası";

  const [users, setUsers] = useState([]);
  const [selectedUserIds, setSelectedUserIds] = useState([]);
  const [roleFilter, setRoleFilter] = useState("ALL");
  const [search, setSearch] = useState("");
  const [directRecipientInput, setDirectRecipientInput] = useState("");
  const [selectedCountryCode, setSelectedCountryCode] = useState("+90");
  const [customCountryCode, setCustomCountryCode] = useState("");
  const [directRecipients, setDirectRecipients] = useState([]);
  const [directRecipientError, setDirectRecipientError] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");

  const [isLoadingUsers, setIsLoadingUsers] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    let isCancelled = false;

    async function loadUsers() {
      try {
        const [managers, residents] = await Promise.all([
          getAllUsersByRole("MANAGER"),
          getAllUsersByRole("RESIDENT"),
        ]);

        if (isCancelled) {
          return;
        }

        const userMap = new Map();

        for (const user of [...managers, ...residents]) {
          if (user?.id) {
            userMap.set(user.id, user);
          }
        }

        setUsers(Array.from(userMap.values()));
        setErrorMessage("");
      } catch (error) {
        if (!isCancelled) {
          setErrorMessage(
            error?.message ?? "Alıcı kullanıcılar yüklenemedi."
          );
        }
      } finally {
        if (!isCancelled) {
          setIsLoadingUsers(false);
        }
      }
    }

    void loadUsers();

    return () => {
      isCancelled = true;
    };
  }, []);

  const filteredUsers = useMemo(() => {
    const normalizedSearch = search.toLocaleLowerCase("tr-TR").trim();

    return users.filter((user) => {
      if (roleFilter !== "ALL" && user.role !== roleFilter) {
        return false;
      }

      if (!normalizedSearch) {
        return true;
      }

      const searchableText = [
        user.fullName,
        user.email,
        user.phone,
        roleLabelMap[user.role],
      ]
        .filter(Boolean)
        .join(" ")
        .toLocaleLowerCase("tr-TR");

      return searchableText.includes(normalizedSearch);
    });
  }, [roleFilter, search, users]);

  const selectableVisibleUserIds = useMemo(
    () =>
      filteredUsers
        .filter((user) => Boolean(getUserContact(user, channel)))
        .map((user) => user.id),
    [channel, filteredUsers]
  );

  const selectedCount = selectedUserIds.length;
  const totalRecipientCount = selectedCount + directRecipients.length;

  const areAllVisibleSelected =
    selectableVisibleUserIds.length > 0 &&
    selectableVisibleUserIds.every((userId) =>
      selectedUserIds.includes(userId)
    );

  function handleUserToggle(userId) {
    setSelectedUserIds((current) => {
      if (current.includes(userId)) {
        return current.filter((id) => id !== userId);
      }

      if (current.length + directRecipients.length >= MAX_RECIPIENT_COUNT) {
        setErrorMessage(
          `Tek seferde en fazla ${MAX_RECIPIENT_COUNT} alıcı seçilebilir.`
        );
        return current;
      }

      setErrorMessage("");
      return [...current, userId];
    });
  }

  function handleVisibleUsersToggle() {
    setSelectedUserIds((current) => {
      if (areAllVisibleSelected) {
        return current.filter(
          (userId) => !selectableVisibleUserIds.includes(userId)
        );
      }

      const availableSlots = Math.max(
        0,
        MAX_RECIPIENT_COUNT - directRecipients.length
      );
      const mergedIds = new Set([...current, ...selectableVisibleUserIds]);

      return Array.from(mergedIds).slice(0, availableSlots);
    });
  }

  function handleDirectRecipientInputChange(event) {
    const nextValue = isEmail
      ? event.target.value
      : sanitizeLocalPhoneInput(event.target.value);

    setDirectRecipientInput(nextValue);
    setDirectRecipientError("");
  }

  function getDirectRecipientCandidate() {
    if (isEmail) {
      return validateDirectRecipient(directRecipientInput, true);
    }

    const countryCode =
      selectedCountryCode === "CUSTOM"
        ? customCountryCode
        : selectedCountryCode;

    return buildInternationalPhoneNumber(
      countryCode,
      directRecipientInput
    );
  }

  function addDirectRecipient() {
    const validationResult = getDirectRecipientCandidate();

    if (!validationResult.isValid) {
      setDirectRecipientError(validationResult.message);
      return false;
    }

    if (selectedUserIds.length + directRecipients.length >= MAX_RECIPIENT_COUNT) {
      setDirectRecipientError(
        `Tek seferde en fazla ${MAX_RECIPIENT_COUNT} alıcı eklenebilir.`
      );
      return false;
    }

    if (directRecipients.includes(validationResult.value)) {
      setDirectRecipientError("Bu alıcı zaten listeye eklenmiş.");
      return false;
    }

    setDirectRecipients((current) => [
      ...current,
      validationResult.value,
    ]);
    setDirectRecipientInput("");
    setDirectRecipientError("");
    return true;
  }

  function handleDirectRecipientKeyDown(event) {
    if (event.key === "Enter") {
      event.preventDefault();
      addDirectRecipient();
    }
  }

  function removeDirectRecipient(recipient) {
    setDirectRecipients((current) =>
      current.filter((item) => item !== recipient)
    );
    setDirectRecipientError("");
  }

  async function handleSubmit(event) {
    event.preventDefault();

    const trimmedMessage = message.trim();
    const trimmedSubject = subject.trim();
    let recipientsToSend = directRecipients;

    if (directRecipientInput.trim()) {
      const validationResult = getDirectRecipientCandidate();

      if (!validationResult.isValid) {
        setDirectRecipientError(validationResult.message);
        return;
      }

      recipientsToSend = [
        ...new Set([...directRecipients, validationResult.value]),
      ];
    }

    const requestedRecipientCount =
      selectedUserIds.length + recipientsToSend.length;

    if (requestedRecipientCount === 0) {
      setErrorMessage(
        "En az bir kullanıcı veya doğrudan alıcı seçilmelidir."
      );
      setSuccessMessage("");
      return;
    }

    if (requestedRecipientCount > MAX_RECIPIENT_COUNT) {
      setErrorMessage(
        `Tek seferde en fazla ${MAX_RECIPIENT_COUNT} alıcı seçilebilir.`
      );
      setSuccessMessage("");
      return;
    }

    if (isEmail && !trimmedSubject) {
      setErrorMessage("E-posta konusu zorunludur.");
      setSuccessMessage("");
      return;
    }

    if (!trimmedMessage) {
      setErrorMessage("Mesaj içeriği zorunludur.");
      setSuccessMessage("");
      return;
    }

    try {
      setIsSending(true);
      setErrorMessage("");
      setDirectRecipientError("");
      setSuccessMessage("");

      const result = isEmail
        ? await sendManualEmail({
            recipientUserIds: selectedUserIds,
            directRecipients: recipientsToSend,
            subject: trimmedSubject,
            message: trimmedMessage,
          })
        : await sendManualSms({
            recipientUserIds: selectedUserIds,
            directRecipients: recipientsToSend,
            message: trimmedMessage,
          });

      const responseData = result?.data ?? result;
      const summary = responseData?.summary;

      setSuccessMessage(getSuccessMessage(channel, summary));
      setMessage("");
      setSubject("");
      setDirectRecipientInput("");
      setDirectRecipients([]);
      setSelectedUserIds([]);

      onSent?.(responseData);
    } catch (error) {
      setErrorMessage(
        error?.message ?? `${channelLabel} gönderilemedi.`
      );
    } finally {
      setIsSending(false);
    }
  }

  return (
    <section className="notification-manual-card">
      <div className="notification-card-header">
        <div className="notification-card-title">
          <div className="notification-card-icon">
            <ChannelIcon size={22} />
          </div>

          <div>
            <span className="section-kicker">Manuel Gönderim</span>
            <h3>Yeni {channelLabel} Gönder</h3>
          </div>
        </div>

        <span className="notification-recipient-count">
          {totalRecipientCount} / {MAX_RECIPIENT_COUNT} alıcı
        </span>
      </div>

      <p className="notification-card-description">
        Aktif yönetici veya sakinleri seçebilir, ayrıca doğrudan alıcı
        bilgileri ekleyebilirsiniz.
      </p>

      {errorMessage && (
        <div className="login-error-message">
          <p>{errorMessage}</p>
        </div>
      )}

      {successMessage && (
        <div className="login-success-message">
          <p>{successMessage}</p>
        </div>
      )}

      <form className="notification-manual-form" onSubmit={handleSubmit}>
        <div className="notification-recipient-toolbar">
          <label className="notification-recipient-search">
            <Search size={17} />
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Ad, e-posta veya telefon ara..."
              disabled={isLoadingUsers || isSending}
            />
          </label>

          <select
            value={roleFilter}
            onChange={(event) => setRoleFilter(event.target.value)}
            disabled={isLoadingUsers || isSending}
          >
            <option value="ALL">Tüm kullanıcılar</option>
            <option value="MANAGER">Yöneticiler</option>
            <option value="RESIDENT">Sakinler</option>
          </select>

          <button
            type="button"
            className="secondary-form-button"
            onClick={handleVisibleUsersToggle}
            disabled={
              isLoadingUsers ||
              isSending ||
              selectableVisibleUserIds.length === 0
            }
          >
            {areAllVisibleSelected ? (
              <CheckSquare size={17} />
            ) : (
              <Square size={17} />
            )}
            Görünenleri Seç
          </button>
        </div>

        <div className="notification-recipient-list">
          {isLoadingUsers ? (
            <p>Alıcı kullanıcılar yükleniyor...</p>
          ) : filteredUsers.length === 0 ? (
            <p>Filtreye uygun kullanıcı bulunamadı.</p>
          ) : (
            filteredUsers.map((user) => {
              const contact = getUserContact(user, channel);
              const isSelected = selectedUserIds.includes(user.id);
              const isUnavailable = !contact;

              return (
                <label
                  className={`notification-recipient-item ${
                    isSelected ? "selected" : ""
                  } ${isUnavailable ? "unavailable" : ""}`}
                  key={user.id}
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => handleUserToggle(user.id)}
                    disabled={isUnavailable || isSending}
                  />

                  <span className="notification-recipient-avatar">
                    <Users size={17} />
                  </span>

                  <span className="notification-recipient-details">
                    <strong>{user.fullName}</strong>
                    <small>
                      {roleLabelMap[user.role] ?? user.role} ·{" "}
                      {contact || `${channelLabel} bilgisi bulunmuyor`}
                    </small>
                  </span>
                </label>
              );
            })
          )}
        </div>

        <div className="form-grid">
          <div className="full-width notification-direct-recipient-field">
            <label htmlFor={`direct-recipient-${channel}`}>
              {directRecipientLabel}
            </label>

            {isEmail ? (
              <div className="notification-direct-recipient-row">
                <input
                  id={`direct-recipient-${channel}`}
                  type="email"
                  inputMode="email"
                  autoComplete="off"
                  value={directRecipientInput}
                  onChange={handleDirectRecipientInputChange}
                  onKeyDown={handleDirectRecipientKeyDown}
                  placeholder="ornek@mail.com"
                  maxLength={254}
                  disabled={isSending}
                />

                <button
                  type="button"
                  className="secondary-form-button notification-add-recipient-button"
                  onClick={addDirectRecipient}
                  disabled={isSending || !directRecipientInput.trim()}
                >
                  <Plus size={17} />
                  Ekle
                </button>
              </div>
            ) : (
              <div className="notification-phone-recipient-row">
                <select
                  value={selectedCountryCode}
                  onChange={(event) => {
                    setSelectedCountryCode(event.target.value);
                    setDirectRecipientError("");
                  }}
                  disabled={isSending}
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
                    onChange={(event) => {
                      setCustomCountryCode(
                        sanitizeCountryCodeInput(event.target.value)
                      );
                      setDirectRecipientError("");
                    }}
                    placeholder="+000"
                    maxLength={4}
                    disabled={isSending}
                    aria-label="Özel ülke kodu"
                  />
                )}

                <input
                  id={`direct-recipient-${channel}`}
                  type="text"
                  inputMode="numeric"
                  autoComplete="off"
                  value={directRecipientInput}
                  onChange={handleDirectRecipientInputChange}
                  onKeyDown={handleDirectRecipientKeyDown}
                  placeholder="Telefon numarası"
                  maxLength={15}
                  disabled={isSending}
                />

                <button
                  type="button"
                  className="secondary-form-button notification-add-recipient-button"
                  onClick={addDirectRecipient}
                  disabled={
                    isSending ||
                    !directRecipientInput.trim() ||
                    (selectedCountryCode === "CUSTOM" &&
                      !customCountryCode.trim())
                  }
                >
                  <Plus size={17} />
                  Ekle
                </button>
              </div>
            )}

            {directRecipientError && (
              <small className="notification-direct-recipient-error">
                {directRecipientError}
              </small>
            )}

            <small>
              {isEmail
                ? "Her e-posta adresini ayrı ayrı ekleyin."
                : "Ülkeyi seçin, ardından telefon numarasını yalnızca rakam olarak girin. Numara, ülke koduyla birlikte uluslararası formata dönüştürülür."}
            </small>

            {directRecipients.length > 0 && (
              <div className="notification-direct-recipient-list">
                {directRecipients.map((recipient) => (
                  <span
                    className="notification-direct-recipient-chip"
                    key={recipient}
                  >
                    {recipient}
                    <button
                      type="button"
                      onClick={() => removeDirectRecipient(recipient)}
                      aria-label={`${recipient} alıcısını kaldır`}
                      disabled={isSending}
                    >
                      <X size={14} />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {isEmail && (
            <label className="full-width">
              Konu
              <input
                type="text"
                value={subject}
                onChange={(event) => setSubject(event.target.value)}
                maxLength={200}
                disabled={isSending}
                required
              />
            </label>
          )}

          <label className="full-width">
            Mesaj
            <textarea
              rows={7}
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              maxLength={5000}
              disabled={isSending}
              required
            />
            <small>{message.length} / 5000 karakter</small>
          </label>
        </div>

        <div className="notification-form-actions">
          <button
            type="submit"
            className="dashboard-action-button"
            disabled={isSending || isLoadingUsers}
          >
            <Send size={18} />
            {isSending ? "Gönderiliyor..." : `${channelLabel} Gönder`}
          </button>
        </div>
      </form>
    </section>
  );
}

export default ManualNotificationForm;