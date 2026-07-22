import { useEffect, useState } from "react";
import {
  AlertTriangle,
  Building2,
  Check,
  Copy,
  Landmark,
  UserRound,
} from "lucide-react";

import { getMyBankAccount } from "../../api/sitesApi";


function formatIban(value) {
  const compactValue = String(value ?? "")
    .replace(/\s+/g, "")
    .toUpperCase();

  return compactValue.match(/.{1,4}/g)?.join(" ") ?? "-";
}

function getWarningContent(status, data) {
  if (status === "MANAGER_NOT_ASSIGNED") {
    return {
      title: "Ödeme sorumlusu yönetici bulunamadı",
      description:
        `${data?.block?.name ?? "Bu blok"} için ödeme hesabından sorumlu yönetici atanmamış. Lütfen site yönetimiyle iletişime geçin.`,
    };
  }

  if (status === "MULTIPLE_MANAGERS") {
    return {
      title: "Ödeme sorumlusu net değil",
      description:
        `${data?.block?.name ?? "Bu blok"} için birden fazla sorumlu yönetici bulundu. Doğru IBAN gösterilebilmesi için Süper Admin yönetici atamasını düzenlemelidir.`,
    };
  }

  return {
    title: "IBAN bilgisi henüz girilmemiş",
    description:
      `${data?.manager?.fullName ?? "Sorumlu yönetici"} bu site için banka bilgilerini henüz kaydetmemiş.`,
  };
}

function ResidentBankAccountCard({ selectedApartmentId }) {
  const [bankData, setBankData] = useState(null);
  const [status, setStatus] = useState("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [isCopied, setIsCopied] = useState(false);

  useEffect(() => {
    if (!selectedApartmentId) {
      return undefined;
    }

    let isMounted = true;

    async function loadBankAccount() {
      try {
        setStatus("loading");
        setErrorMessage("");
        setIsCopied(false);

        const result = await getMyBankAccount();
        const data = result?.data ?? result;

        if (!isMounted) {
          return;
        }

        setBankData(data ?? null);
        setStatus(data?.status ?? "BANK_ACCOUNT_MISSING");
      } catch (error) {
        if (isMounted) {
          setBankData(null);
          setStatus("error");
          setErrorMessage(
            error?.message ?? "Banka bilgileri alınamadı."
          );
        }
      }
    }

    loadBankAccount();

    return () => {
      isMounted = false;
    };
  }, [selectedApartmentId]);

  async function handleCopyIban() {
    const iban = bankData?.bankAccount?.iban;

    if (!iban) {
      return;
    }

    try {
      await navigator.clipboard.writeText(iban);
      setIsCopied(true);

      window.setTimeout(() => {
        setIsCopied(false);
      }, 1800);
    } catch {
      setErrorMessage("IBAN panoya kopyalanamadı.");
    }
  }

  if (!selectedApartmentId) {
    return null;
  }

  if (status === "loading" || status === "idle") {
    return (
      <section className="dashboard-panel resident-bank-card loading">
        <Landmark size={22} />
        <span>Banka bilgileri yükleniyor...</span>
      </section>
    );
  }

  if (status === "error") {
    return (
      <section className="resident-bank-warning" role="alert">
        <AlertTriangle size={22} />
        <div>
          <strong>Banka bilgileri alınamadı</strong>
          <span>{errorMessage}</span>
        </div>
      </section>
    );
  }

  if (status !== "CONFIGURED" || !bankData?.bankAccount) {
    const warningContent = getWarningContent(status, bankData);

    return (
      <section className="resident-bank-warning" role="status">
        <AlertTriangle size={22} />

        <div>
          <strong>{warningContent.title}</strong>
          <span>{warningContent.description}</span>
        </div>
      </section>
    );
  }

  const bankAccount = bankData.bankAccount;

  return (
    <section className="dashboard-panel resident-bank-card">
      <div className="resident-bank-card-header">
        <div className="resident-bank-card-title">
          <span className="resident-bank-icon">
            <Landmark size={22} />
          </span>

          <div>
            <span className="section-kicker">Ödeme Yapılacak Hesap</span>
            <h3>Yönetici Banka Bilgileri</h3>
          </div>
        </div>

        <div className="resident-bank-location">
          <Building2 size={17} />
          <span>
            {bankData.site?.name ?? "Site"} /{" "}
            {bankData.block?.name ?? "Blok"} / Daire{" "}
            {bankData.apartment?.number ?? "-"}
          </span>
        </div>
      </div>

      <div className="resident-bank-details">
        <div>
          <span>Sorumlu Yönetici</span>
          <strong>
            <UserRound size={16} />
            {bankData.manager?.fullName ?? "-"}
          </strong>
        </div>

        <div>
          <span>Banka</span>
          <strong>{bankAccount.bankName ?? "-"}</strong>
        </div>

        <div>
          <span>Şube</span>
          <strong>{bankAccount.branchName ?? "-"}</strong>
        </div>

        <div>
          <span>Hesap Sahibi</span>
          <strong>{bankAccount.accountHolder ?? "-"}</strong>
        </div>

        <div>
          <span>Hesap Numarası</span>
          <strong>{bankAccount.accountNumber ?? "-"}</strong>
        </div>

        <div>
          <span>Para Birimi</span>
          <strong>{bankAccount.currency ?? "TRY"}</strong>
        </div>
      </div>

      <div className="resident-bank-iban-row">
        <div>
          <span>IBAN</span>
          <strong>{formatIban(bankAccount.iban)}</strong>
        </div>

        <button
          type="button"
          onClick={handleCopyIban}
          className={isCopied ? "copied" : ""}
        >
          {isCopied ? <Check size={17} /> : <Copy size={17} />}
          {isCopied ? "Kopyalandı" : "IBAN'ı Kopyala"}
        </button>
      </div>

      {errorMessage && (
        <p className="resident-bank-copy-error">{errorMessage}</p>
      )}
    </section>
  );
}

export default ResidentBankAccountCard;
