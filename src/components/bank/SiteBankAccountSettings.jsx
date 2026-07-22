import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Building2,
  CheckCircle2,
  CreditCard,
  Landmark,
  Save,
} from "lucide-react";

import {
  getSiteBankAccount,
  saveSiteBankAccount,
} from "../../api/sitesApi";
import { useAuth } from "../../hooks/useAuth";
import { useManagerScope } from "../../hooks/useManagerScope";
import DashboardLayout from "../../layouts/DashboardLayout";


const emptyBankAccount = {
  bankName: "",
  branchName: "",
  accountHolder: "",
  accountNumber: "",
  iban: "",
  currency: "TRY",
};

function getManagerScopedSite(activeAssignment) {
  if (
    activeAssignment?.scopeType === "SITE" &&
    activeAssignment.site?.id
  ) {
    return {
      id: activeAssignment.site.id,
      name: activeAssignment.site.name ?? "Yetkili Site",
    };
  }

  if (
    activeAssignment?.scopeType === "BLOCK" &&
    activeAssignment.block?.site?.id
  ) {
    return {
      id: activeAssignment.block.site.id,
      name: activeAssignment.block.site.name ?? "Yetkili Site",
    };
  }

  return null;
}

function mapBankAccountToForm(bankAccount) {
  if (!bankAccount) {
    return emptyBankAccount;
  }

  return {
    bankName: bankAccount.bankName ?? "",
    branchName: bankAccount.branchName ?? "",
    accountHolder: bankAccount.accountHolder ?? "",
    accountNumber: bankAccount.accountNumber ?? "",
    iban: formatIban(bankAccount.iban ?? ""),
    currency: bankAccount.currency ?? "TRY",
  };
}

function compactIban(value) {
  const rawValue = String(value ?? "").toUpperCase();
  const numericPart = rawValue
    .replace(/^TR/, "")
    .replace(/\D/g, "")
    .slice(0, 24);

  return numericPart.length > 0 ? `TR${numericPart}` : "";
}

function formatIban(value) {
  const compactValue = compactIban(value);

  return compactValue.match(/.{1,4}/g)?.join(" ") ?? "";
}

function SiteBankAccountSettings({
  roleBadge,
  navItems,
  theme,
  themeStorageKey,
}) {
  const { user } = useAuth();
  const {
    activeAssignment,
    activeAssignmentId,
    activeAssignmentLabel,
  } = useManagerScope();

  const selectedSite = useMemo(
    () => getManagerScopedSite(activeAssignment),
    [activeAssignment]
  );

  const selectedSiteId = selectedSite?.id ?? "";

  const [formData, setFormData] = useState(emptyBankAccount);
  const [isConfigured, setIsConfigured] = useState(false);
  const [accountManager, setAccountManager] = useState(null);

  const [isLoadingBankAccount, setIsLoadingBankAccount] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const isDarkMode = (
    localStorage.getItem(themeStorageKey) ?? ""
  )
    .toLocaleLowerCase("tr-TR")
    .includes("koyu");

  useEffect(() => {
    if (!selectedSiteId) {
      return undefined;
    }

    let isMounted = true;

    async function loadBankAccount() {
      try {
        setIsLoadingBankAccount(true);
        setMessage("");
        setErrorMessage("");

        const result = await getSiteBankAccount(selectedSiteId);
        const responseData = result?.data ?? result;
        const bankAccount = responseData?.bankAccount ?? null;

        if (!isMounted) {
          return;
        }

        setAccountManager(responseData?.manager ?? null);
        setIsConfigured(Boolean(responseData?.isConfigured && bankAccount));
        setFormData(mapBankAccountToForm(bankAccount));
      } catch (error) {
        if (isMounted) {
          setAccountManager(null);
          setIsConfigured(false);
          setFormData(emptyBankAccount);
          setErrorMessage(
            error?.message ?? "Banka bilgileri alınamadı."
          );
        }
      } finally {
        if (isMounted) {
          setIsLoadingBankAccount(false);
        }
      }
    }

    loadBankAccount();

    return () => {
      isMounted = false;
    };
  }, [activeAssignmentId, selectedSiteId]);

  function handleInputChange(event) {
    const { name, value } = event.target;

    setFormData((currentData) => ({
      ...currentData,
      [name]: name === "iban" ? formatIban(value) : value,
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (!selectedSiteId) {
      setErrorMessage(
        "Aktif çalışma alanınıza bağlı bir site bulunamadı."
      );
      return;
    }

    if (formData.bankName.trim().length < 2) {
      setErrorMessage("Banka adı en az 2 karakter olmalıdır.");
      return;
    }

    if (formData.accountHolder.trim().length < 2) {
      setErrorMessage("Hesap sahibi bilgisi zorunludur.");
      return;
    }

    const normalizedIban = compactIban(formData.iban);

    if (normalizedIban.length !== 26) {
      setErrorMessage(
        "Türkiye IBAN'ı TR ile birlikte toplam 26 karakter olmalıdır."
      );
      return;
    }

    try {
      setIsSaving(true);
      setMessage("");
      setErrorMessage("");

      const result = await saveSiteBankAccount(selectedSiteId, {
        bankName: formData.bankName.trim(),
        branchName: formData.branchName.trim() || null,
        accountHolder: formData.accountHolder.trim(),
        accountNumber: formData.accountNumber.trim() || null,
        iban: normalizedIban,
        currency: formData.currency,
      });

      const responseData = result?.data ?? result;
      const savedBankAccount = responseData?.bankAccount ?? null;

      setAccountManager(responseData?.manager ?? accountManager);
      setFormData(mapBankAccountToForm(savedBankAccount));
      setIsConfigured(Boolean(savedBankAccount));
      setMessage(
        result?.message ??
          "Banka bilgileri başarıyla kaydedildi."
      );
    } catch (error) {
      setErrorMessage(
        error?.message ?? "Banka bilgileri kaydedilemedi."
      );
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <DashboardLayout
      roleTitle="Banka Bilgileri"
      roleBadge={roleBadge}
      userName={user?.fullName ?? roleBadge}
      navItems={navItems}
      theme={theme}
      isDarkMode={isDarkMode}
      helpTitle="Yönetici Banka Bilgileri"
      helpContent={
        <div className="bank-help-content">
          <p>
            Bu banka hesabı yönetici hesabınız ve aktif siteniz için
            kaydedilir.
          </p>
          <p>
            Aynı site içinde sorumlu olduğunuz bütün bloklar bu IBAN'ı
            kullanır. Başka bir siteye geçtiğinizde o site için ayrı hesap
            tanımlayabilirsiniz.
          </p>
        </div>
      }
    >
      <div className="dashboard-page-header">
        <div>
          <span className="section-kicker">Ödeme Hesabı Ayarları</span>
          <h2>Banka Bilgileri</h2>
          <p>
            Aktif siteniz için kendi resmi banka hesabınızı kaydedin. Aynı
            sitede yönettiğiniz tüm bloklar bu hesabı kullanır.
          </p>
        </div>

        <div
          className={`bank-configuration-badge ${
            isConfigured ? "configured" : "missing"
          }`}
        >
          {isConfigured ? (
            <CheckCircle2 size={18} />
          ) : (
            <AlertTriangle size={18} />
          )}
          {isConfigured ? "IBAN Tanımlı" : "IBAN Eksik"}
        </div>
      </div>

      {errorMessage && (
        <div className="login-error-message">
          <p>{errorMessage}</p>
        </div>
      )}

      {message && (
        <div className="login-success-message">
          <p>{message}</p>
        </div>
      )}

      {!selectedSite && (
        <div className="bank-missing-warning">
          <AlertTriangle size={22} />
          <div>
            <strong>Aktif çalışma alanına bağlı site bulunamadı.</strong>
            <span>
              Önce yönetici çalışma alanınızı seçmeniz gerekir.
            </span>
          </div>
        </div>
      )}

      {!isConfigured &&
        selectedSiteId &&
        !isLoadingBankAccount && (
          <div className="bank-missing-warning">
            <AlertTriangle size={22} />
            <div>
              <strong>
                {selectedSite?.name} için banka ve IBAN bilgisi
                girilmemiş.
              </strong>
              <span>
                Bu hesap aynı sitede sorumlu olduğunuz tüm bloklarda
                kullanılacaktır.
              </span>
            </div>
          </div>
        )}

      {selectedSite && (
        <div className="bank-site-ownership-note">
          <Building2 size={19} />
          <span>
            Hesap sahibi: <strong>{user?.fullName ?? "Yönetici"}</strong>.
            Site: <strong>{selectedSite.name}</strong>. Aktif çalışma alanı:
            {" "}
            <strong>
              {activeAssignmentLabel ?? selectedSite.name}
            </strong>.
          </span>
        </div>
      )}

      <div className="bank-settings-layout">
        <section className="dashboard-panel bank-settings-form-card">
          <div className="bank-section-heading">
            <span className="bank-section-icon">
              <Landmark size={22} />
            </span>

            <div>
              <span className="section-kicker">
                Yönetici + Site Hesabı
              </span>
              <h3>Hesap Bilgilerini Düzenle</h3>
            </div>
          </div>

          <div className="bank-active-site-card">
            <Building2 size={19} />
            <div>
              <span>Aktif Siteniz</span>
              <strong>
                {selectedSite?.name ?? "Site bulunamadı"}
              </strong>
            </div>
          </div>

          {isLoadingBankAccount ? (
            <div className="bank-form-loading">
              Banka bilgileri yükleniyor...
            </div>
          ) : (
            <form className="manager-form" onSubmit={handleSubmit}>
              <div className="form-grid">
                <label>
                  Banka Adı
                  <input
                    type="text"
                    name="bankName"
                    value={formData.bankName}
                    onChange={handleInputChange}
                    disabled={isSaving || !selectedSiteId}
                    placeholder="Örnek: Ziraat Bankası"
                    maxLength={120}
                    required
                  />
                </label>

                <label>
                  Şube Adı
                  <input
                    type="text"
                    name="branchName"
                    value={formData.branchName}
                    onChange={handleInputChange}
                    disabled={isSaving || !selectedSiteId}
                    placeholder="Örnek: Merkez Şubesi"
                    maxLength={120}
                  />
                </label>

                <label>
                  Hesap Sahibi
                  <input
                    type="text"
                    name="accountHolder"
                    value={formData.accountHolder}
                    onChange={handleInputChange}
                    disabled={isSaving || !selectedSiteId}
                    placeholder="Resmi hesap sahibi"
                    maxLength={160}
                    required
                  />
                </label>

                <label>
                  Hesap Numarası
                  <input
                    type="text"
                    name="accountNumber"
                    value={formData.accountNumber}
                    onChange={handleInputChange}
                    disabled={isSaving || !selectedSiteId}
                    placeholder="Varsa hesap numarası"
                    maxLength={80}
                  />
                </label>

                <label className="bank-iban-field">
                  IBAN
                  <input
                    type="text"
                    name="iban"
                    value={formData.iban}
                    onChange={handleInputChange}
                    onKeyDown={(event) => {
                      if (
                        /^[a-zA-Z]$/.test(event.key) &&
                        !event.ctrlKey &&
                        !event.metaKey
                      ) {
                        event.preventDefault();
                      }
                    }}
                    disabled={isSaving || !selectedSiteId}
                    placeholder="TR00 0000 0000 0000 0000 0000 00"
                    maxLength={32}
                    inputMode="numeric"
                    autoComplete="off"
                    required
                  />
                  <small>
                    TR kodu otomatik eklenir. Sonrasında yalnızca 24 rakam
                    girilebilir; Backend ayrıca matematiksel IBAN
                    doğrulaması yapar.
                  </small>
                </label>

                <label>
                  Para Birimi
                  <select
                    name="currency"
                    value={formData.currency}
                    onChange={handleInputChange}
                    disabled={isSaving || !selectedSiteId}
                  >
                    <option value="TRY">Türk Lirası (TRY)</option>
                    <option value="EUR">Euro (EUR)</option>
                    <option value="USD">Amerikan Doları (USD)</option>
                  </select>
                </label>
              </div>

              <div className="form-actions">
                <button
                  type="submit"
                  className="dashboard-action-button"
                  disabled={isSaving || !selectedSiteId}
                >
                  <Save size={18} />
                  {isSaving
                    ? "Kaydediliyor..."
                    : isConfigured
                      ? "Banka Bilgilerini Güncelle"
                      : "Banka Bilgilerini Kaydet"}
                </button>
              </div>
            </form>
          )}
        </section>

        <aside className="dashboard-panel bank-account-preview">
          <div className="bank-section-heading">
            <span className="bank-section-icon">
              <CreditCard size={22} />
            </span>

            <div>
              <span className="section-kicker">Ön İzleme</span>
              <h3>Sakinlerin Göreceği Bilgiler</h3>
            </div>
          </div>

          <div className="bank-preview-site">
            <Building2 size={18} />
            <span>{selectedSite?.name ?? "Site seçilmedi"}</span>
          </div>

          <dl className="bank-preview-list">
            <div>
              <dt>Yönetici</dt>
              <dd>
                {accountManager?.fullName ??
                  user?.fullName ??
                  "-"}
              </dd>
            </div>

            <div>
              <dt>Banka</dt>
              <dd>{formData.bankName || "-"}</dd>
            </div>

            <div>
              <dt>Şube</dt>
              <dd>{formData.branchName || "-"}</dd>
            </div>

            <div>
              <dt>Hesap Sahibi</dt>
              <dd>{formData.accountHolder || "-"}</dd>
            </div>

            <div>
              <dt>Hesap No</dt>
              <dd>{formData.accountNumber || "-"}</dd>
            </div>

            <div className="bank-preview-iban">
              <dt>IBAN</dt>
              <dd>{formData.iban || "-"}</dd>
            </div>

            <div>
              <dt>Para Birimi</dt>
              <dd>{formData.currency}</dd>
            </div>
          </dl>

          <p className="bank-preview-note">
            Bu IBAN yalnızca sizin bu sitede yönettiğiniz alanlar için
            kullanılacaktır.
          </p>
        </aside>
      </div>
    </DashboardLayout>
  );
}

export default SiteBankAccountSettings;
