import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  TrendingDown,
  TrendingUp,
} from "lucide-react";

import {
  getAccountingExpenses,
  getAccountingIncome,
  getAccountingSummary,
} from "../../api/accountingApi";
import AccountingSummaryCards from "../../components/accounting/AccountingSummaryCards";
import { managerNavItems } from "../../config/managerNavigation";
import { useAuth } from "../../hooks/useAuth";
import DashboardLayout from "../../layouts/DashboardLayout";
import {
  accountingExpenseCategoryLabels,
  formatDate,
  formatKurus,
  getDataArray,
} from "../../utils/accounting";

function AccountingOverviewPage() {
  const { user } = useAuth();

  const [summary, setSummary] = useState(null);
  const [recentIncome, setRecentIncome] = useState([]);
  const [recentExpenses, setRecentExpenses] = useState([]);
  const [dateFilters, setDateFilters] = useState({
    dateFrom: "",
    dateTo: "",
  });
  const [appliedFilters, setAppliedFilters] = useState({
    dateFrom: "",
    dateTo: "",
  });

  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function loadAccountingOverview() {
      try {
        setIsLoading(true);
        setErrorMessage("");

        const [summaryResult, incomeResult, expenseResult] = await Promise.all([
          getAccountingSummary(appliedFilters),
          getAccountingIncome({
            status: "PAID",
            page: 1,
            limit: 5,
            ...appliedFilters,
          }),
          getAccountingExpenses({
            status: "ACTIVE",
            page: 1,
            limit: 5,
            ...appliedFilters,
          }),
        ]);

        if (!isMounted) return;

        setSummary(summaryResult?.data ?? summaryResult ?? {});
        setRecentIncome(getDataArray(incomeResult));
        setRecentExpenses(getDataArray(expenseResult));
      } catch (error) {
        if (isMounted) {
          setErrorMessage(
            error?.message ?? "Muhasebe özeti alınamadı."
          );
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadAccountingOverview();

    return () => {
      isMounted = false;
    };
  }, [appliedFilters]);

  function applyDateFilters(event) {
    event.preventDefault();

    if (
      dateFilters.dateFrom &&
      dateFilters.dateTo &&
      dateFilters.dateFrom > dateFilters.dateTo
    ) {
      setErrorMessage(
        "Başlangıç tarihi bitiş tarihinden sonra olamaz."
      );
      return;
    }

    setAppliedFilters(dateFilters);
  }

  return (
    <DashboardLayout
      roleTitle="Kasa / Ön Muhasebe"
      roleBadge="Yönetici"
      userName={user?.fullName ?? "Yönetici"}
      navItems={managerNavItems}
      theme="manager"
    >
      <div className="dashboard-page-header">
        <div>
          <span className="section-kicker">Finansal Takip</span>
          <h2>Kasa / Ön Muhasebe</h2>
          <p>
            Gerçek tahsilatları, bekleyen alacakları ve giderleri tek ekrandan
            takip edin. Tahakkuk edilen fakat ödenmeyen tutarlar kasa
            bakiyesine eklenmez.
          </p>
        </div>
      </div>

      <form className="accounting-filter-bar" onSubmit={applyDateFilters}>
        <label>
          Başlangıç
          <input
            type="date"
            value={dateFilters.dateFrom}
            onChange={(event) =>
              setDateFilters((current) => ({
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
            value={dateFilters.dateTo}
            onChange={(event) =>
              setDateFilters((current) => ({
                ...current,
                dateTo: event.target.value,
              }))
            }
          />
        </label>

        <button type="submit" className="dashboard-action-button">
          Dönemi Uygula
        </button>

        <button
          type="button"
          className="secondary-form-button"
          onClick={() => {
            const emptyFilters = {
              dateFrom: "",
              dateTo: "",
            };

            setDateFilters(emptyFilters);
            setAppliedFilters(emptyFilters);
          }}
        >
          Temizle
        </button>
      </form>

      {errorMessage && (
        <div className="login-error-message">
          <p>{errorMessage}</p>
        </div>
      )}

      {isLoading ? (
        <div className="dashboard-panel">
          <p>Muhasebe bilgileri yükleniyor...</p>
        </div>
      ) : (
        <>
          <AccountingSummaryCards summary={summary} />

          <div className="accounting-period-panel">
            <h3>Seçili Dönem Özeti</h3>

            <div>
              <span>
                Beklenen Gelir
                <strong>
                  {formatKurus(summary?.period?.expectedIncomeKurus)}
                </strong>
              </span>

              <span>
                Tahsil Edilen
                <strong>
                  {formatKurus(summary?.period?.collectedIncomeKurus)}
                </strong>
              </span>

              <span>
                Kalan Alacak
                <strong>
                  {formatKurus(summary?.period?.outstandingIncomeKurus)}
                </strong>
              </span>

              <span>
                Gider
                <strong>
                  {formatKurus(summary?.period?.expenseKurus)}
                </strong>
              </span>
            </div>
          </div>

          <div className="accounting-overview-columns">
            <section className="accounting-list-card">
              <div className="accounting-list-card-header">
                <div>
                  <TrendingUp size={21} />
                  <h3>Son Tahsilatlar</h3>
                </div>

                <Link to="/manager/accounting/income">
                  Tümünü Gör <ArrowRight size={16} />
                </Link>
              </div>

              {recentIncome.length === 0 ? (
                <p className="accounting-empty-text">
                  Seçili dönemde tahsilat bulunmuyor.
                </p>
              ) : (
                <div className="accounting-compact-list">
                  {recentIncome.map((income) => (
                    <article key={income.id}>
                      <div>
                        <strong>
                          {income.paymentBatch?.title ?? "Ödeme"}
                        </strong>
                        <span>
                          {income.apartment?.block?.site?.name ?? "Site"} /{" "}
                          {income.apartment?.block?.name ?? "Blok"} / Daire{" "}
                          {income.apartment?.number ?? "-"}
                        </span>
                      </div>

                      <div>
                        <strong>{formatKurus(income.amountKurus)}</strong>
                        <span>{formatDate(income.paidAt)}</span>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </section>

            <section className="accounting-list-card">
              <div className="accounting-list-card-header">
                <div>
                  <TrendingDown size={21} />
                  <h3>Son Giderler</h3>
                </div>

                <Link to="/manager/accounting/expenses">
                  Tümünü Gör <ArrowRight size={16} />
                </Link>
              </div>

              {recentExpenses.length === 0 ? (
                <p className="accounting-empty-text">
                  Seçili dönemde gider bulunmuyor.
                </p>
              ) : (
                <div className="accounting-compact-list">
                  {recentExpenses.map((expense) => (
                    <article key={expense.id}>
                      <div>
                        <strong>{expense.title}</strong>
                        <span>
                          {accountingExpenseCategoryLabels[
                            expense.category
                          ] ?? expense.category}
                          {" · "}
                          {expense.block?.name ??
                            expense.site?.name ??
                            "Site"}
                        </span>
                      </div>

                      <div>
                        <strong>{formatKurus(expense.amountKurus)}</strong>
                        <span>{formatDate(expense.expenseDate)}</span>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </section>
          </div>
        </>
      )}
    </DashboardLayout>
  );
}

export default AccountingOverviewPage;
