import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  BarChart3,
  Bell,
  BrainCircuit,
  Building2,
  CheckCircle2,
  Landmark,
  Mail,
  MessageSquareText,
  Search,
  Settings,
  UserRound,
  Users,
} from "lucide-react";

import {
  getManagerSiteBankAccountsOverview,
} from "../../api/sitesApi";
import { useAuth } from "../../hooks/useAuth";
import DashboardLayout from "../../layouts/DashboardLayout";


const superAdminNavItems = [
  { label: "Panel", path: "/super-admin/dashboard", icon: BarChart3 },
  {
    label: "Site / Apartmanlar",
    path: "/super-admin/buildings",
    icon: Building2,
  },
  { label: "Yöneticiler", path: "/super-admin/managers", icon: Users },
  {
    label: "Kullanıcılar / Sakinler",
    path: "/super-admin/users",
    icon: UserRound,
  },
  {
    label: "Duyurular",
    path: "/super-admin/announcements",
    icon: Bell,
  },
  {
    label: "İletişim Mesajları",
    path: "/super-admin/contact-messages",
    icon: MessageSquareText,
  },
  {
    label: "AI API Ayarları",
    path: "/super-admin/ai-settings",
    icon: BrainCircuit,
  },
  {
    label: "SMS / E-posta",
    path: "/super-admin/notifications",
    icon: Mail,
  },
  {
    label: "Genel Ayarlar",
    path: "/super-admin/settings",
    icon: Settings,
  },
];

function formatIban(value) {
  const compactValue = String(value ?? "")
    .replace(/\s+/g, "")
    .toUpperCase();

  return compactValue.match(/.{1,4}/g)?.join(" ") ?? "-";
}

function getOverviewRows(result) {
  const data = result?.data ?? result;

  return Array.isArray(data) ? data : [];
}

function BankAccountPage() {
  const { user } = useAuth();

  const [rows, setRows] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  const isDarkMode = (
    localStorage.getItem("superAdminThemeMode") ?? ""
  )
    .toLocaleLowerCase("tr-TR")
    .includes("koyu");

  useEffect(() => {
    let isMounted = true;

    async function loadOverview() {
      try {
        setIsLoading(true);
        setErrorMessage("");

        const result = await getManagerSiteBankAccountsOverview();
        const overviewRows = getOverviewRows(result);

        if (isMounted) {
          setRows(overviewRows);
        }
      } catch (error) {
        if (isMounted) {
          setErrorMessage(
            error?.message ??
              "Yönetici banka bilgileri alınamadı."
          );
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadOverview();

    return () => {
      isMounted = false;
    };
  }, []);

  const filteredRows = useMemo(() => {
    const normalizedSearch = searchTerm
      .trim()
      .toLocaleLowerCase("tr-TR");

    return rows.filter((row) => {
      const matchesStatus =
        statusFilter === "ALL" ||
        (statusFilter === "CONFIGURED" && row.isConfigured) ||
        (statusFilter === "MISSING" && !row.isConfigured);

      if (!matchesStatus) {
        return false;
      }

      if (!normalizedSearch) {
        return true;
      }

      const searchableText = [
        row.manager?.fullName,
        row.manager?.email,
        row.site?.name,
        ...(row.responsibleAreas ?? []),
        row.bankAccount?.bankName,
        row.bankAccount?.accountHolder,
        row.bankAccount?.iban,
      ]
        .filter(Boolean)
        .join(" ")
        .toLocaleLowerCase("tr-TR");

      return searchableText.includes(normalizedSearch);
    });
  }, [rows, searchTerm, statusFilter]);

  const configuredCount = rows.filter(
    (row) => row.isConfigured
  ).length;
  const missingCount = rows.length - configuredCount;

  return (
    <DashboardLayout
      roleTitle="Banka Bilgileri"
      roleBadge="Süper Admin"
      userName={user?.fullName ?? "Süper Admin"}
      navItems={superAdminNavItems}
      theme="super-admin"
      isDarkMode={isDarkMode}
      helpTitle="Yönetici Banka Hesapları"
      helpContent={
        <div className="bank-help-content">
          <p>
            Her satır bir yönetici ile bir site arasındaki banka hesabını
            gösterir.
          </p>
          <p>
            Süper Admin yalnızca görüntüleyebilir. Hesap ekleme ve
            güncelleme işlemlerini ilgili yönetici yapar.
          </p>
        </div>
      }
    >
      <div className="dashboard-page-header">
        <div>
          <span className="section-kicker">
            Yönetici Ödeme Hesapları
          </span>
          <h2>Banka Bilgileri</h2>
          <p>
            Yöneticilerin siteler için kaydettiği banka hesaplarını ve
            sorumlu oldukları alanları görüntüleyin.
          </p>
        </div>
      </div>

      {errorMessage && (
        <div className="login-error-message">
          <p>{errorMessage}</p>
        </div>
      )}

      <section className="bank-overview-summary">
        <article className="dashboard-panel">
          <span className="bank-overview-summary-icon">
            <Landmark size={21} />
          </span>
          <div>
            <span>Toplam Yönetici + Site</span>
            <strong>{rows.length}</strong>
          </div>
        </article>

        <article className="dashboard-panel">
          <span className="bank-overview-summary-icon success">
            <CheckCircle2 size={21} />
          </span>
          <div>
            <span>IBAN Tanımlı</span>
            <strong>{configuredCount}</strong>
          </div>
        </article>

        <article className="dashboard-panel">
          <span className="bank-overview-summary-icon warning">
            <AlertTriangle size={21} />
          </span>
          <div>
            <span>IBAN Eksik</span>
            <strong>{missingCount}</strong>
          </div>
        </article>
      </section>

      <section className="dashboard-panel bank-overview-panel">
        <div className="bank-overview-toolbar">
          <div className="bank-overview-search">
            <Search size={18} />
            <input
              type="search"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Yönetici, site, blok veya IBAN ara..."
            />
          </div>

          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
            aria-label="IBAN durumuna göre filtrele"
          >
            <option value="ALL">Tüm Durumlar</option>
            <option value="CONFIGURED">IBAN Tanımlı</option>
            <option value="MISSING">IBAN Eksik</option>
          </select>
        </div>

        {isLoading ? (
          <div className="bank-overview-empty">
            Banka bilgileri yükleniyor...
          </div>
        ) : filteredRows.length === 0 ? (
          <div className="bank-overview-empty">
            Arama veya filtreye uygun kayıt bulunamadı.
          </div>
        ) : (
          <div className="bank-overview-table-wrapper">
            <table className="bank-overview-table">
              <thead>
                <tr>
                  <th>Yönetici</th>
                  <th>Site</th>
                  <th>Sorumlu Alanlar</th>
                  <th>Banka</th>
                  <th>Hesap Sahibi</th>
                  <th>IBAN</th>
                  <th>Durum</th>
                </tr>
              </thead>

              <tbody>
                {filteredRows.map((row) => (
                  <tr
                    key={`${row.manager?.id}:${row.site?.id}`}
                  >
                    <td>
                      <div className="bank-overview-manager">
                        <strong>
                          {row.manager?.fullName ?? "-"}
                        </strong>
                        <span>{row.manager?.email ?? "-"}</span>
                      </div>
                    </td>

                    <td>
                      <strong>{row.site?.name ?? "-"}</strong>
                    </td>

                    <td>
                      <div className="bank-overview-areas">
                        {(row.responsibleAreas ?? []).length > 0
                          ? row.responsibleAreas.map((area) => (
                              <span key={area}>{area}</span>
                            ))
                          : "-"}
                      </div>
                    </td>

                    <td>
                      {row.bankAccount?.bankName ?? "-"}
                    </td>

                    <td>
                      {row.bankAccount?.accountHolder ?? "-"}
                    </td>

                    <td>
                      <span className="bank-overview-iban">
                        {row.isConfigured
                          ? formatIban(row.bankAccount?.iban)
                          : "-"}
                      </span>
                    </td>

                    <td>
                      <span
                        className={`bank-overview-status ${
                          row.isConfigured
                            ? "configured"
                            : "missing"
                        }`}
                      >
                        {row.isConfigured ? (
                          <CheckCircle2 size={16} />
                        ) : (
                          <AlertTriangle size={16} />
                        )}
                        {row.isConfigured
                          ? "Tanımlı"
                          : "Eksik"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </DashboardLayout>
  );
}

export default BankAccountPage;
