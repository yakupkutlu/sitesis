import { useEffect, useMemo, useState } from "react";
import DashboardLayout from "../../layouts/DashboardLayout";
import {
  Archive,
  BarChart3,
  Bell,
  BrainCircuit,
  Building2,
  Eye,
  Mail,
  MessageSquareText,
  RefreshCcw,
  Settings,
  UserRound,
  Users,
} from "lucide-react";

import {
  getContactMessages,
  updateContactMessage,
} from "../../api/contactMessagesApi";
import { useAuth } from "../../context/AuthContext";

const navItems = [
  { label: "Panel", path: "/super-admin/dashboard", icon: BarChart3 },
  { label: "Site / Apartmanlar", path: "/super-admin/buildings", icon: Building2 },
  { label: "Yöneticiler", path: "/super-admin/managers", icon: Users },
  { label: "Kullanıcılar / Sakinler", path: "/super-admin/users", icon: UserRound },
  { label: "Duyurular", path: "/super-admin/announcements", icon: Bell },
  { label: "İletişim Mesajları", path: "/super-admin/contact-messages", icon: MessageSquareText },
  { label: "AI API Ayarları", path: "/super-admin/ai-settings", icon: BrainCircuit },
  { label: "SMS / E-posta", path: "/super-admin/notifications", icon: Mail },
  { label: "Genel Ayarlar", path: "/super-admin/settings", icon: Settings },
];

const statusLabelMap = {
  NEW: "Yeni",
  READ: "Okundu",
  ARCHIVED: "Arşivlendi",
};

function getDataArray(result) {
  const data = result?.data ?? result;

  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.items)) return data.items;

  return [];
}

function formatDateTime(value) {
  if (!value) return "-";

  try {
    return new Date(value).toLocaleString("tr-TR");
  } catch {
    return "-";
  }
}

function ContactMessagesPage() {
  const { user } = useAuth();

  const [messages, setMessages] = useState([]);
  const [filters, setFilters] = useState({
    status: "",
    search: "",
  });

  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  async function loadMessages(nextFilters = filters) {
    try {
      setErrorMessage("");
      setIsLoading(true);

      const result = await getContactMessages({
        page: 1,
        limit: 50,
        status: nextFilters.status,
        search: nextFilters.search,
      });

      setMessages(getDataArray(result));
    } catch (error) {
      setErrorMessage(error?.message ?? "İletişim mesajları alınamadı.");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    let isMounted = true;

    getContactMessages({
      page: 1,
      limit: 50,
    })
      .then((result) => {
        if (!isMounted) return;

        setMessages(getDataArray(result));
        setErrorMessage("");
      })
      .catch((error) => {
        if (!isMounted) return;

        setErrorMessage(error?.message ?? "İletişim mesajları alınamadı.");
      })
      .finally(() => {
        if (!isMounted) return;

        setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const stats = useMemo(
    () => ({
      total: messages.length,
      newCount: messages.filter((message) => message.status === "NEW").length,
      readCount: messages.filter((message) => message.status === "READ").length,
      archivedCount: messages.filter((message) => message.status === "ARCHIVED").length,
    }),
    [messages]
  );

  function handleFilterChange(event) {
    const { name, value } = event.target;

    setFilters((current) => ({
      ...current,
      [name]: value,
    }));
  }

  async function handleFilterSubmit(event) {
    event.preventDefault();
    await loadMessages(filters);
  }

  async function handleStatusUpdate(messageId, status) {
    try {
      setIsUpdating(true);
      setErrorMessage("");
      setSuccessMessage("");

      await updateContactMessage(messageId, { status });

      setMessages((current) =>
        current.map((message) =>
          message.id === messageId ? { ...message, status } : message
        )
      );

      setSuccessMessage("Mesaj durumu güncellendi.");
    } catch (error) {
      setErrorMessage(error?.message ?? "Mesaj durumu güncellenemedi.");
    } finally {
      setIsUpdating(false);
    }
  }

  return (
    <DashboardLayout
      roleTitle="İletişim Mesajları"
      roleBadge="Süper Admin"
      userName={user?.fullName ?? "Süper Admin"}
      navItems={navItems}
      theme="super-admin"
    >
      <div className="contact-messages-page">
        <div className="dashboard-page-header">
          <div>
            <span className="section-kicker">Gelen Kutusu</span>
            <h2>İletişim Mesajları</h2>
            <p>
              Ana sayfadaki iletişim formundan gelen mesajları buradan takip
              edebilirsiniz.
            </p>
          </div>

          <button
            type="button"
            className="dashboard-action-button secondary-action"
            onClick={() => loadMessages(filters)}
            disabled={isLoading}
          >
            <RefreshCcw size={18} />
            Yenile
          </button>
        </div>

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

        <section className="contact-messages-stats-grid">
          <article className="contact-message-stat-card">
            <span>Gösterilen Mesaj</span>
            <strong>{stats.total}</strong>
          </article>

          <article className="contact-message-stat-card">
            <span>Yeni</span>
            <strong>{stats.newCount}</strong>
          </article>

          <article className="contact-message-stat-card">
            <span>Okundu</span>
            <strong>{stats.readCount}</strong>
          </article>

          <article className="contact-message-stat-card">
            <span>Arşiv</span>
            <strong>{stats.archivedCount}</strong>
          </article>
        </section>

        <section className="contact-messages-panel">
          <div className="dashboard-panel-header">
            <div>
              <span className="section-kicker">Mesaj Listesi</span>
              <h3>Gelen İletişim Talepleri</h3>
            </div>
          </div>

          <form className="contact-messages-filter-bar" onSubmit={handleFilterSubmit}>
            <input
              type="search"
              name="search"
              value={filters.search}
              onChange={handleFilterChange}
              placeholder="Ad, e-posta, telefon veya mesaj ara..."
            />

            <select
              name="status"
              value={filters.status}
              onChange={handleFilterChange}
            >
              <option value="">Tüm durumlar</option>
              <option value="NEW">Yeni</option>
              <option value="READ">Okundu</option>
              <option value="ARCHIVED">Arşivlendi</option>
            </select>

            <button
              type="submit"
              className="dashboard-action-button"
              disabled={isLoading}
            >
              Filtrele
            </button>
          </form>

          {isLoading ? (
            <p>İletişim mesajları yükleniyor...</p>
          ) : messages.length === 0 ? (
            <p>Henüz iletişim mesajı bulunmuyor.</p>
          ) : (
            <div className="contact-messages-table-wrapper">
              <table className="contact-messages-table">
                <thead>
                  <tr>
                    <th>Durum</th>
                    <th>Ad Soyad</th>
                    <th>E-posta</th>
                    <th>Telefon</th>
                    <th>Mesaj</th>
                    <th>Tarih</th>
                    <th>İşlem</th>
                  </tr>
                </thead>

                <tbody>
                  {messages.map((message) => (
                    <tr key={message.id}>
                      <td>
                        <span className={`contact-status-pill ${message.status?.toLowerCase()}`}>
                          {statusLabelMap[message.status] ?? message.status}
                        </span>
                      </td>

                      <td>{message.fullName}</td>
                      <td>{message.email}</td>
                      <td>{message.phone || "-"}</td>
                      <td>{message.message}</td>
                      <td>{formatDateTime(message.createdAt)}</td>

                      <td>
                        <div className="contact-message-actions">
                          {message.status !== "READ" && (
                            <button
                              type="button"
                              className="contact-icon-button"
                              onClick={() => handleStatusUpdate(message.id, "READ")}
                              disabled={isUpdating}
                              title="Okundu yap"
                            >
                              <Eye size={17} />
                            </button>
                          )}

                          {message.status !== "ARCHIVED" && (
                            <button
                              type="button"
                              className="contact-icon-button warning"
                              onClick={() =>
                                handleStatusUpdate(message.id, "ARCHIVED")
                              }
                              disabled={isUpdating}
                              title="Arşivle"
                            >
                              <Archive size={17} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </DashboardLayout>
  );
}

export default ContactMessagesPage;
