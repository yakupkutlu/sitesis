import { useEffect, useState } from "react";
import {
  Search,
} from "lucide-react";

import { getAccountingIncome } from "../../api/accountingApi";
import AccountingPagination from "../../components/accounting/AccountingPagination";
import { managerNavItems } from "../../config/managerNavigation";
import { useAuth } from "../../hooks/useAuth";
import DashboardLayout from "../../layouts/DashboardLayout";
import {
  formatDate,
  formatKurus,
  getDataArray,
} from "../../utils/accounting";

function AccountingIncomePage() {
  const { user } = useAuth();

  const [incomeRows, setIncomeRows] = useState([]);
  const [filters, setFilters] = useState({
    search: "",
    status: "ALL",
    dateFrom: "",
    dateTo: "",
  });
  const [appliedFilters, setAppliedFilters] = useState(filters);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({
    totalPages: 1,
    totalCount: 0,
  });

  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function loadIncome() {
      try {
        setIsLoading(true);
        setErrorMessage("");

        const result = await getAccountingIncome({
          ...appliedFilters,
          page,
          limit: 20,
        });

        if (!isMounted) return;

        setIncomeRows(getDataArray(result));
        setPagination({
          totalPages: Number(result?.pagination?.totalPages ?? 1),
          totalCount: Number(result?.pagination?.totalCount ?? 0),
        });
      } catch (error) {
        if (isMounted) {
          setErrorMessage(error?.message ?? "Gelir kayıtları alınamadı.");
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadIncome();

    return () => {
      isMounted = false;
    };
  }, [appliedFilters, page]);

  function applyFilters(event) {
    event.preventDefault();

    if (
      filters.dateFrom &&
      filters.dateTo &&
      filters.dateFrom > filters.dateTo
    ) {
      setErrorMessage(
        "Başlangıç tarihi bitiş tarihinden sonra olamaz."
      );
      return;
    }

    setPage(1);
    setAppliedFilters(filters);
  }

  return (
    <DashboardLayout
      roleTitle="Gelirler"
      roleBadge="Yönetici"
      userName={user?.fullName ?? "Yönetici"}
      navItems={managerNavItems}
      theme="manager"
    >
      <div className="dashboard-page-header">
        <div>
          <span className="section-kicker">Tahsilat Takibi</span>
          <h2>Gelirler</h2>
          <p>
            Aidat, ek ödeme ve gider paylaşımlarından doğan tahakkukları ve
            gerçek tahsilatları görüntüleyin.
          </p>
        </div>
      </div>

      <form className="accounting-filter-bar" onSubmit={applyFilters}>
        <label className="accounting-search-label">
          <Search size={17} />
          <input
            type="search"
            value={filters.search}
            onChange={(event) =>
              setFilters((current) => ({
                ...current,
                search: event.target.value,
              }))
            }
            placeholder="Ödeme veya daire ara..."
          />
        </label>

        <label>
          Durum
          <select
            value={filters.status}
            onChange={(event) =>
              setFilters((current) => ({
                ...current,
                status: event.target.value,
              }))
            }
          >
            <option value="ALL">Tümü</option>
            <option value="PENDING">Bekliyor</option>
            <option value="PAID">Ödendi</option>
          </select>
        </label>

        <label>
          Başlangıç
          <input
            type="date"
            value={filters.dateFrom}
            onChange={(event) =>
              setFilters((current) => ({
                ...current,
                dateFrom: event.target.value,
              }))
            }
          />
        </label>

        <label>
          Bitiş
          <input
            type="date"
            value={filters.dateTo}
            onChange={(event) =>
              setFilters((current) => ({
                ...current,
                dateTo: event.target.value,
              }))
            }
          />
        </label>

        <button type="submit" className="dashboard-action-button">
          Filtrele
        </button>
      </form>

      {errorMessage && (
        <div className="login-error-message">
          <p>{errorMessage}</p>
        </div>
      )}

      <section className="accounting-table-card">
        <div className="accounting-table-summary">
          <strong>{pagination.totalCount}</strong>
          <span>gelir / tahakkuk kaydı</span>
        </div>

        {isLoading ? (
          <p className="accounting-empty-text">Gelirler yükleniyor...</p>
        ) : incomeRows.length === 0 ? (
          <p className="accounting-empty-text">Gelir kaydı bulunamadı.</p>
        ) : (
          <div className="accounting-table-scroll">
            <table className="accounting-table">
              <thead>
                <tr>
                  <th>Ödeme</th>
                  <th>Daire</th>
                  <th>Kaynak</th>
                  <th>Tutar</th>
                  <th>Durum</th>
                  <th>Tarih</th>
                </tr>
              </thead>

              <tbody>
                {incomeRows.map((income) => (
                  <tr key={income.id}>
                    <td>
                      <strong>
                        {income.paymentBatch?.title ?? "Ödeme"}
                      </strong>
                      <small>
                        {income.paymentBatch?.description ?? "-"}
                      </small>
                    </td>

                    <td>
                      {income.apartment?.block?.site?.name ?? "Site"} /{" "}
                      {income.apartment?.block?.name ?? "Blok"} / Daire{" "}
                      {income.apartment?.number ?? "-"}
                    </td>

                    <td>
                      {income.paymentBatch?.accountingExpense
                        ? "Gider Paylaşımı"
                        : "Aidat / Ek Ödeme"}
                    </td>

                    <td>{formatKurus(income.amountKurus)}</td>

                    <td>
                      <span
                        className={`accounting-status accounting-status-${String(
                          income.status
                        ).toLowerCase()}`}
                      >
                        {income.status === "PAID" ? "Ödendi" : "Bekliyor"}
                      </span>
                    </td>

                    <td>
                      {formatDate(
                        income.status === "PAID"
                          ? income.paidAt
                          : income.paymentBatch?.createdAt
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <AccountingPagination
          page={page}
          totalPages={pagination.totalPages}
          onPageChange={setPage}
          disabled={isLoading}
        />
      </section>
    </DashboardLayout>
  );
}

export default AccountingIncomePage;
