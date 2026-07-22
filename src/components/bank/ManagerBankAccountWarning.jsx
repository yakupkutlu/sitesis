import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, ArrowRight, Landmark } from "lucide-react";
import { Link } from "react-router-dom";

import { getSiteBankAccount } from "../../api/sitesApi";

function getAssignmentSite(activeAssignment) {
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

function ManagerBankAccountWarning({ activeAssignment }) {
  const site = useMemo(
    () => getAssignmentSite(activeAssignment),
    [activeAssignment]
  );

  const [status, setStatus] = useState("idle");

  useEffect(() => {
    if (!site?.id) {
      return undefined;
    }

    let isMounted = true;

    async function checkBankAccount() {
      try {
        setStatus("loading");

        const result = await getSiteBankAccount(site.id);
        const data = result?.data ?? result;

        if (!isMounted) {
          return;
        }

        setStatus(data?.isConfigured ? "configured" : "missing");
      } catch {
        if (isMounted) {
          setStatus("error");
        }
      }
    }

    checkBankAccount();

    return () => {
      isMounted = false;
    };
  }, [site?.id]);

  if (status !== "missing" || !site) {
    return null;
  }

  return (
    <section className="manager-bank-account-warning" role="alert">
      <span className="manager-bank-account-warning-icon">
        <AlertTriangle size={23} />
      </span>

      <div className="manager-bank-account-warning-content">
        <div>
          <span className="section-kicker">Eksik Ayar</span>
          <strong>{site.name} için IBAN bilgisi girilmemiş</strong>
          <p>
            Sakinlerin doğru hesaba ödeme yapabilmesi ve dekontların kontrol
            edilebilmesi için banka bilgilerini tamamlayın.
          </p>
        </div>

        <Link
          to="/manager/bank-account"
          className="manager-bank-account-warning-link"
        >
          <Landmark size={18} />
          Banka Bilgilerini Gir
          <ArrowRight size={17} />
        </Link>
      </div>
    </section>
  );
}

export default ManagerBankAccountWarning;
