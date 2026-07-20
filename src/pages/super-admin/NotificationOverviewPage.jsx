import { useEffect, useMemo, useState } from "react";
import {
  BarChart3,
  Bell,
  BrainCircuit,
  Building2,
  Mail,
  MessageSquareText,
  RefreshCw,
  Search,
  Settings,
  UserRound,
  Users,
} from "lucide-react";

import { getNotificationUsageSummary } from "../../api/notificationLogsApi";
import { useAuth } from "../../hooks/useAuth";
import DashboardLayout from "../../layouts/DashboardLayout";

const navItems = [
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

const roleLabels = {
  MANAGER: "Yönetici",
  SUPER_ADMIN: "Süper Admin",
};


function formatCount(value) {
  return Number(value ?? 0).toLocaleString("tr-TR");
}

function NotificationOverviewPage() {
  const { user } = useAuth();

  const [usageRows, setUsageRows] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("ALL");
  const [reloadVersion, setReloadVersion] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    let isCancelled = false;

    async function loadUsageSummary() {
      try {
        setIsLoading(true);
        setErrorMessage("");

        const result = await getNotificationUsageSummary();

        if (!isCancelled) {
          const data = result?.data ?? result;
          setUsageRows(Array.isArray(data) ? data : []);
        }
      } catch (error) {
        if (!isCancelled) {
          setErrorMessage(
            error?.message ?? "SMS ve e-posta kullanım bilgileri alınamadı."
          );
        }
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    }

    void loadUsageSummary();

    return () => {
      isCancelled = true;
    };
  }, [reloadVersion]);

  const filteredRows = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLocaleLowerCase("tr-TR");

    return usageRows.filter((row) => {
      const matchesRole = roleFilter === "ALL" || row.role === roleFilter;
      const searchableText = `${row.fullName ?? ""} ${row.email ?? ""}`
        .toLocaleLowerCase("tr-TR");
      const matchesSearch = searchableText.includes(normalizedSearch);

      return matchesRole && matchesSearch;
    });
  }, [usageRows, searchTerm, roleFilter]);


  return (
    <DashboardLayout
      roleTitle="Genel Durum"
      roleBadge="Süper Admin"
      userName={user?.fullName ?? "Süper Admin"}
      navItems={navItems}
      theme="super-admin"
    >
      <div className="dashboard-page-header">
        <div>
          <span className="section-kicker">Bildirim Kullanımı</span>
          <h2>SMS ve E-posta Genel Durumu</h2>
          <p>
            Yöneticilerin ve süper adminlerin başarılı SMS ve e-posta
            gönderim adetlerini karşılaştırın.
          </p>
        </div>

        <button
          type="button"
          className="dashboard-action-button"
          onClick={() => setReloadVersion((current) => current + 1)}
          disabled={isLoading}
        >
          <RefreshCw size={18} />
          {isLoading ? "Yenileniyor..." : "Yenile"}
        </button>
      </div>

      {errorMessage && (
        <div className="login-error-message">
          <p>{errorMessage}</p>
        </div>
      )}

      <section className="notification-usage-toolbar">
        <label className="notification-usage-search">
          <Search size={19} />
          <input
            type="search"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Gönderen adı veya e-posta ara"
          />
        </label>

        <label className="notification-usage-filter">
          <span>Rol</span>
          <select
            value={roleFilter}
            onChange={(event) => setRoleFilter(event.target.value)}
          >
            <option value="ALL">Tümü</option>
            <option value="MANAGER">Yönetici</option>
            <option value="SUPER_ADMIN">Süper Admin</option>
          </select>
        </label>

      </section>

      <div className="notification-usage-note">
        Yalnızca başarıyla gönderilmiş, <strong>SENT</strong> durumundaki
        kayıtlar kullanım adedine dahil edilir.
      </div>

      <section className="notification-usage-table-card">
        {isLoading ? (
          <p className="notification-usage-empty">
            Kullanım bilgileri yükleniyor...
          </p>
        ) : filteredRows.length === 0 ? (
          <p className="notification-usage-empty">
            Seçilen filtrelere uygun kullanıcı bulunamadı.
          </p>
        ) : (
          <div className="notification-usage-table-wrapper">
            <table className="notification-usage-table">
              <thead>
                <tr>
                  <th>Gönderen</th>
                  <th>Rol</th>
                  <th>Gönderilen SMS</th>
                  <th>Gönderilen E-posta</th>
                </tr>
              </thead>

              <tbody>
                {filteredRows.map((row) => (
                  <tr key={row.userId}>
                    <td>
                      <div className="notification-usage-user">
                        <strong>{row.fullName}</strong>
                        <span>{row.email}</span>
                      </div>
                    </td>
                    <td>
                      <span
                        className={`notification-usage-role ${
                          row.role === "SUPER_ADMIN"
                            ? "super-admin"
                            : "manager"
                        }`}
                      >
                        {roleLabels[row.role] ?? row.role}
                      </span>
                    </td>
                    <td>
                      <strong className="notification-usage-count sms">
                        {formatCount(row.smsCount)}
                      </strong>
                    </td>
                    <td>
                      <strong className="notification-usage-count email">
                        {formatCount(row.emailCount)}
                      </strong>
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

export default NotificationOverviewPage;
