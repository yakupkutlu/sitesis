import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  Clock,
  Info,
  RefreshCcw,
  XCircle,
} from "lucide-react";

import { getNotificationLogs } from "../../api/notificationLogsApi";

const PAGE_LIMIT = 10;

const initialPagination = {
  page: 1,
  limit: PAGE_LIMIT,
  totalCount: 0,
  totalPages: 1,
};

const statusLabelMap = {
  PENDING: "Bekliyor",
  SENT: "Gönderildi",
  FAILED: "Hatalı",
  SKIPPED: "Atlandı",
};

const sourceTypeLabelMap = {
  MANUAL: "Manuel",
  PAYMENT_BATCH: "Aidat / Ödeme",
  ANNOUNCEMENT: "Duyuru",
  RESIDENT_REQUEST: "Talep",
  SYSTEM: "Sistem",
};

const targetTypeLabelMap = {
  ALL: "Tüm Sistem",
  SITE: "Site",
  BLOCK: "Blok",
  APARTMENT: "Daire",
};

function getDataArray(result) {
  const data = result?.data ?? result;

  if (Array.isArray(data)) {
    return data;
  }

  if (Array.isArray(data?.items)) {
    return data.items;
  }

  if (Array.isArray(data?.notificationLogs)) {
    return data.notificationLogs;
  }

  return [];
}

function getPaginationMeta(result) {
  const pagination = result?.pagination ?? result?.data?.pagination;

  return {
    page: Number(pagination?.page) || 1,
    limit: Number(pagination?.limit) || PAGE_LIMIT,
    totalCount: Number(pagination?.totalCount) || 0,
    totalPages: Math.max(1, Number(pagination?.totalPages) || 1),
  };
}

function formatDateTime(value) {
  if (!value) {
    return "-";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return date.toLocaleString("tr-TR");
}

function getRecipientText(log) {
  const recipientName = log?.recipientUser?.fullName;

  const recipientValue =
    log?.channel === "EMAIL"
      ? log?.recipientEmail || log?.recipientUser?.email
      : log?.recipientPhone || log?.recipientUser?.phone;

  if (recipientName && recipientValue) {
    return `${recipientName} - ${recipientValue}`;
  }

  return recipientName || recipientValue || "-";
}

function getTargetText(log) {
  const targetType = log?.metadata?.targetType;

  if (!targetType) {
    return "-";
  }

  return targetTypeLabelMap[targetType] ?? targetType;
}

function getStatusIcon(status) {
  if (status === "SENT") {
    return CheckCircle2;
  }

  if (status === "FAILED") {
    return XCircle;
  }

  if (status === "SKIPPED") {
    return Info;
  }

  return Clock;
}

function getVisiblePageNumbers(currentPage, totalPages) {
  const pages = [];
  const startPage = Math.max(1, currentPage - 2);
  const endPage = Math.min(totalPages, currentPage + 2);

  for (let page = startPage; page <= endPage; page += 1) {
    pages.push(page);
  }

  return pages;
}

function NotificationLogsPanel({
  channel,
  title,
  description = "Gönderim sonuçlarını ve hata kayıtlarını inceleyebilirsiniz.",
}) {
  const [logs, setLogs] = useState([]);
  const [pagination, setPagination] = useState(initialPagination);

  const [filterForm, setFilterForm] = useState({
    status: "",
    search: "",
  });

  const [appliedFilters, setAppliedFilters] = useState({
    status: "",
    search: "",
  });

  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  const channelLabel = channel === "EMAIL" ? "E-posta" : "SMS";

  const fetchLogs = useCallback(
    async (page, filters) => {
      const result = await getNotificationLogs({
        page,
        limit: PAGE_LIMIT,
        channel,
        status: filters.status,
        search: filters.search,
      });

      return {
        logs: getDataArray(result),
        pagination: getPaginationMeta(result),
      };
    },
    [channel]
  );

  useEffect(() => {
    let isCancelled = false;

    async function loadInitialLogs() {
      try {
        const result = await fetchLogs(1, appliedFilters);

        if (isCancelled) {
          return;
        }

        setLogs(result.logs);
        setPagination(result.pagination);
        setErrorMessage("");
      } catch (error) {
        if (isCancelled) {
          return;
        }

        setErrorMessage(
          error?.message ?? `${channelLabel} kayıtları alınamadı.`
        );
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    }

    void loadInitialLogs();

    return () => {
      isCancelled = true;
    };
  }, [appliedFilters, channelLabel, fetchLogs]);

  const stats = useMemo(
    () => ({
      total: pagination.totalCount,
      sent: logs.filter((log) => log.status === "SENT").length,
      pending: logs.filter((log) => log.status === "PENDING").length,
      failed: logs.filter((log) => log.status === "FAILED").length,
      skipped: logs.filter((log) => log.status === "SKIPPED").length,
    }),
    [logs, pagination.totalCount]
  );

  const visiblePages = useMemo(
    () => getVisiblePageNumbers(pagination.page, pagination.totalPages),
    [pagination.page, pagination.totalPages]
  );

  async function loadLogsFromAction(page) {
    try {
      setIsLoading(true);
      setErrorMessage("");

      const result = await fetchLogs(page, appliedFilters);

      setLogs(result.logs);
      setPagination(result.pagination);
    } catch (error) {
      setErrorMessage(
        error?.message ?? `${channelLabel} kayıtları alınamadı.`
      );
    } finally {
      setIsLoading(false);
    }
  }

  function handleFilterChange(event) {
    const { name, value } = event.target;

    setFilterForm((current) => ({
      ...current,
      [name]: value,
    }));
  }

  function handleFilterSubmit(event) {
    event.preventDefault();

    setIsLoading(true);
    setErrorMessage("");

    setAppliedFilters({
      status: filterForm.status,
      search: filterForm.search.trim(),
    });
  }

  function handleRefresh() {
    void loadLogsFromAction(pagination.page);
  }

  return (
    <section className="dashboard-panel notification-log-panel">
      <div className="dashboard-panel-header">
        <div>
          <span className="section-kicker">Gönderim Kayıtları</span>
          <h3>{title ?? `${channelLabel} Gönderim Kayıtları`}</h3>
          <p>{description}</p>
        </div>

        <button
          type="button"
          className="secondary-form-button"
          onClick={handleRefresh}
          disabled={isLoading}
        >
          <RefreshCcw size={17} />
          {isLoading ? "Yenileniyor..." : "Yenile"}
        </button>
      </div>

      <div className="notification-log-stats-grid">
        <div>
          <span>Toplam Kayıt</span>
          <strong>{stats.total}</strong>
        </div>

        <div>
          <span>Bu Sayfada Gönderildi</span>
          <strong>{stats.sent}</strong>
        </div>

        <div>
          <span>Bu Sayfada Bekliyor</span>
          <strong>{stats.pending}</strong>
        </div>

        <div>
          <span>Bu Sayfada Hatalı</span>
          <strong>{stats.failed}</strong>
        </div>

        <div>
          <span>Bu Sayfada Atlandı</span>
          <strong>{stats.skipped}</strong>
        </div>
      </div>

      <form
        className="notification-log-filter-bar"
        onSubmit={handleFilterSubmit}
      >
        <input
          type="search"
          name="search"
          value={filterForm.search}
          onChange={handleFilterChange}
          placeholder="Alıcı, konu, mesaj veya hata ara..."
        />

        <select
          name="status"
          value={filterForm.status}
          onChange={handleFilterChange}
        >
          <option value="">Tüm durumlar</option>
          <option value="PENDING">Bekliyor</option>
          <option value="SENT">Gönderildi</option>
          <option value="FAILED">Hatalı</option>
          <option value="SKIPPED">Atlandı</option>
        </select>

        <button
          type="submit"
          className="dashboard-action-button"
          disabled={isLoading}
        >
          Filtrele
        </button>
      </form>

      {errorMessage && (
        <div className="login-error-message">
          <p>{errorMessage}</p>
        </div>
      )}

      {isLoading ? (
        <p>{channelLabel} kayıtları yükleniyor...</p>
      ) : logs.length === 0 ? (
        <p>Henüz {channelLabel.toLowerCase()} kaydı bulunmuyor.</p>
      ) : (
        <>
          <div className="notification-log-table-wrapper">
            <table className="notification-log-table">
              <thead>
                <tr>
                  <th>Durum</th>
                  <th>Alıcı</th>
                  <th>Hedef</th>
                  <th>Konu / Kaynak</th>
                  <th>Mesaj</th>
                  <th>Sonuç</th>
                  <th>Tarih</th>
                </tr>
              </thead>

              <tbody>
                {logs.map((log) => {
                  const StatusIcon = getStatusIcon(log.status);

                  return (
                    <tr key={log.id}>
                      <td>
                        <span
                          className={`notification-status-pill ${String(
                            log.status
                          ).toLowerCase()}`}
                        >
                          <StatusIcon size={14} />
                          {statusLabelMap[log.status] ?? log.status}
                        </span>
                      </td>

                      <td className="notification-recipient-cell">
                        {getRecipientText(log)}
                      </td>

                      <td>
                        <span className="notification-target-pill">
                          {getTargetText(log)}
                        </span>
                      </td>

                      <td>
                        <strong>{log.subject || "-"}</strong>

                        <span className="notification-source-text">
                          {sourceTypeLabelMap[log.sourceType] ??
                            log.sourceType ??
                            "-"}
                        </span>
                      </td>

                      <td>
                        <span className="notification-message-cell">
                          {log.message}
                        </span>
                      </td>

                      <td>
                        {log.errorMessage ? (
                          <span className="notification-error-text">
                            {log.errorMessage}
                          </span>
                        ) : (
                          <span className="notification-success-text">-</span>
                        )}
                      </td>

                      <td>{formatDateTime(log.createdAt)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="notification-pagination">
            <span>
              Sayfa {pagination.page} / {pagination.totalPages}
            </span>

            <div>
              <button
                type="button"
                onClick={() => {
                  void loadLogsFromAction(pagination.page - 1);
                }}
                disabled={isLoading || pagination.page <= 1}
              >
                Önceki
              </button>

              {visiblePages.map((page) => (
                <button
                  type="button"
                  key={page}
                  className={page === pagination.page ? "active" : ""}
                  onClick={() => {
                    void loadLogsFromAction(page);
                  }}
                  disabled={isLoading}
                >
                  {page}
                </button>
              ))}

              <button
                type="button"
                onClick={() => {
                  void loadLogsFromAction(pagination.page + 1);
                }}
                disabled={
                  isLoading || pagination.page >= pagination.totalPages
                }
              >
                Sonraki
              </button>
            </div>
          </div>
        </>
      )}
    </section>
  );
}

export default NotificationLogsPanel;