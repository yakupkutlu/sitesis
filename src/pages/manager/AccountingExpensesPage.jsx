import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  Ban,
  Eye,
  Plus,
  Search,
  Send,
} from "lucide-react";

import {
  cancelAccountingExpense,
  getAccountingExpense,
  getAccountingExpenses,
} from "../../api/accountingApi";
import { getApartments } from "../../api/apartmentsApi";
import AccountingPagination from "../../components/accounting/AccountingPagination";
import ExpenseCreateForm from "../../components/accounting/ExpenseCreateForm";
import ExpenseDetailsModal from "../../components/accounting/ExpenseDetailsModal";
import ExpenseDistributionPanel from "../../components/accounting/ExpenseDistributionPanel";
import { managerNavItems } from "../../config/managerNavigation";
import { useAuth } from "../../hooks/useAuth";
import DashboardLayout from "../../layouts/DashboardLayout";
import {
  accountingExpenseCategoryLabels,
  formatDate,
  formatKurus,
  getDataArray,
} from "../../utils/accounting";

function AccountingExpensesPage() {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const [expenseTemplate, setExpenseTemplate] = useState(
    () => location.state?.expenseTemplate ?? null,
  );

  const [expenses, setExpenses] = useState([]);
  const [apartments, setApartments] = useState([]);
  const [selectedExpense, setSelectedExpense] = useState(null);
  const [distributionExpense, setDistributionExpense] = useState(null);
  const [showCreateForm, setShowCreateForm] = useState(
    () => Boolean(location.state?.expenseTemplate),
  );

  const [filters, setFilters] = useState({
    search: "",
    status: "ACTIVE",
    category: "",
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
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  async function loadExpenses() {
    const result = await getAccountingExpenses({
      ...appliedFilters,
      page,
      limit: 20,
    });

    setExpenses(getDataArray(result));
    setPagination({
      totalPages: Number(result?.pagination?.totalPages ?? 1),
      totalCount: Number(result?.pagination?.totalCount ?? 0),
    });
  }


  useEffect(() => {
    if (!location.state?.expenseTemplate) {
      return;
    }

    navigate(location.pathname, {
      replace: true,
      state: null,
    });
  }, [location.pathname, location.state, navigate]);

  useEffect(() => {
    let isMounted = true;

    async function loadPageData() {
      try {
        setIsLoading(true);
        setErrorMessage("");

        const [expenseResult, apartmentResult] = await Promise.all([
          getAccountingExpenses({
            ...appliedFilters,
            page,
            limit: 20,
          }),
          getApartments({
            page: 1,
            limit: 100,
          }),
        ]);

        if (!isMounted) return;

        setExpenses(getDataArray(expenseResult));
        setPagination({
          totalPages: Number(
            expenseResult?.pagination?.totalPages ?? 1
          ),
          totalCount: Number(
            expenseResult?.pagination?.totalCount ?? 0
          ),
        });
        setApartments(getDataArray(apartmentResult));
      } catch (error) {
        if (isMounted) {
          setErrorMessage(error?.message ?? "Gider kayıtları alınamadı.");
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadPageData();

    return () => {
      isMounted = false;
    };
  }, [appliedFilters, page]);

  const totalActiveExpenseKurus = useMemo(
    () =>
      expenses
        .filter((expense) => expense.status === "ACTIVE")
        .reduce(
          (total, expense) => total + Number(expense.amountKurus ?? 0),
          0
        ),
    [expenses]
  );

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

  async function openExpenseDetails(expenseId) {
    try {
      setIsSaving(true);
      setErrorMessage("");

      const result = await getAccountingExpense(expenseId);
      setSelectedExpense(result?.data ?? result ?? null);
    } catch (error) {
      setErrorMessage(error?.message ?? "Gider ayrıntısı alınamadı.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleCancelExpense(expense) {
    const reason = window.prompt(
      `${expense.title} giderini iptal etme nedenini yazın:`
    );

    if (reason === null) {
      return;
    }

    if (reason.trim().length < 3) {
      setErrorMessage("İptal nedeni en az 3 karakter olmalıdır.");
      return;
    }

    const isConfirmed = window.confirm(
      "Bu gideri iptal etmek istediğinizden emin misiniz? Bağlı bekleyen ödemeler de iptal edilecektir."
    );

    if (!isConfirmed) {
      return;
    }

    try {
      setIsSaving(true);
      setMessage("");
      setErrorMessage("");

      const result = await cancelAccountingExpense(
        expense.id,
        reason.trim()
      );

      await loadExpenses();
      setMessage(result?.message ?? "Gider iptal edildi.");
    } catch (error) {
      setErrorMessage(error?.message ?? "Gider iptal edilemedi.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleExpenseCreated(createdExpense, successMessage) {
    await loadExpenses();

    setMessage(
      successMessage ??
        "Gider kaydı oluşturuldu. Şimdi dairelere dağıtabilirsiniz."
    );
    setShowCreateForm(false);
    setExpenseTemplate(null);

    if (createdExpense?.id) {
      const detailResult = await getAccountingExpense(createdExpense.id);
      setDistributionExpense(
        detailResult?.data ?? detailResult ?? createdExpense
      );
    }
  }

  async function handleDistributionCompleted(successMessage) {
    await loadExpenses();
    setDistributionExpense(null);
    setMessage(
      successMessage ??
        "Gider muaf daireler hariç diğer dairelere dağıtıldı."
    );
  }

  return (
    <DashboardLayout
      roleTitle="Giderler"
      roleBadge="Yönetici"
      userName={user?.fullName ?? "Yönetici"}
      navItems={managerNavItems}
      theme="manager"
    >
      <div className="dashboard-page-header">
        <div>
          <span className="section-kicker">Gider Yönetimi</span>
          <h2>Giderler</h2>
          <p>
            Giderleri faturalarıyla kaydedin, muaf daireleri seçin ve kalan
            dairelere ödeme olarak dağıtın.
          </p>
        </div>

        <button
          type="button"
          className="dashboard-action-button"
          onClick={() => {
            const nextShowCreateForm = !showCreateForm;

            setShowCreateForm(nextShowCreateForm);
            setExpenseTemplate(null);
            setDistributionExpense(null);
            setMessage("");
            setErrorMessage("");
          }}
          disabled={isSaving}
        >
          <Plus size={18} />
          Yeni Gider
        </button>
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

      {showCreateForm && (
        <ExpenseCreateForm
          key={expenseTemplate?.templateKey ?? "manual-expense"}
          apartments={apartments}
          initialValues={expenseTemplate}
          onCreated={handleExpenseCreated}
          onCancel={() => {
            setShowCreateForm(false);
            setExpenseTemplate(null);
          }}
          isSaving={isSaving}
          setIsSaving={setIsSaving}
        />
      )}

      {distributionExpense && (
        <ExpenseDistributionPanel
          expense={distributionExpense}
          apartments={apartments}
          onCompleted={handleDistributionCompleted}
          onCancel={() => setDistributionExpense(null)}
          isSaving={isSaving}
          setIsSaving={setIsSaving}
        />
      )}

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
            placeholder="Gider, firma veya fatura no ara..."
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
            <option value="">Tümü</option>
            <option value="ACTIVE">Aktif</option>
            <option value="CANCELLED">İptal Edildi</option>
          </select>
        </label>

        <label>
          Kategori
          <select
            value={filters.category}
            onChange={(event) =>
              setFilters((current) => ({
                ...current,
                category: event.target.value,
              }))
            }
          >
            <option value="">Tümü</option>
            {Object.entries(accountingExpenseCategoryLabels).map(
              ([value, label]) => (
                <option value={value} key={value}>
                  {label}
                </option>
              )
            )}
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

      <div className="accounting-expense-page-summary">
        <span>
          <strong>{pagination.totalCount}</strong>
          gider kaydı
        </span>

        <span>
          Bu sayfadaki aktif gider:
          <strong>{formatKurus(totalActiveExpenseKurus)}</strong>
        </span>
      </div>

      <section className="accounting-table-card">
        {isLoading ? (
          <p className="accounting-empty-text">Giderler yükleniyor...</p>
        ) : expenses.length === 0 ? (
          <p className="accounting-empty-text">Gider kaydı bulunamadı.</p>
        ) : (
          <div className="accounting-table-scroll">
            <table className="accounting-table">
              <thead>
                <tr>
                  <th>Gider</th>
                  <th>Kapsam</th>
                  <th>Tutar</th>
                  <th>Tarih</th>
                  <th>Dağıtım</th>
                  <th>Durum</th>
                  <th>İşlemler</th>
                </tr>
              </thead>

              <tbody>
                {expenses.map((expense) => (
                  <tr key={expense.id}>
                    <td>
                      <strong>{expense.title}</strong>
                      <small>
                        {accountingExpenseCategoryLabels[
                          expense.category
                        ] ?? expense.category}
                        {expense.vendorName
                          ? ` · ${expense.vendorName}`
                          : ""}
                      </small>
                    </td>

                    <td>
                      {expense.site?.name ?? "Site"}
                      {expense.block?.name
                        ? ` / ${expense.block.name}`
                        : " / Tüm Site"}
                    </td>

                    <td>{formatKurus(expense.amountKurus)}</td>
                    <td>{formatDate(expense.expenseDate)}</td>

                    <td>
                      {expense.paymentBatch ? (
                        <span>
                          {expense.paymentSummary?.allocationCount ?? 0} ödeme
                          <small>
                            {expense.paymentSummary?.exemptionCount ?? 0} muaf
                          </small>
                        </span>
                      ) : (
                        "Dağıtılmadı"
                      )}
                    </td>

                    <td>
                      <span
                        className={`accounting-status accounting-status-${String(
                          expense.status
                        ).toLowerCase()}`}
                      >
                        {expense.status === "ACTIVE"
                          ? "Aktif"
                          : "İptal Edildi"}
                      </span>
                    </td>

                    <td>
                      <div className="accounting-row-actions">
                        <button
                          type="button"
                          onClick={() => openExpenseDetails(expense.id)}
                          disabled={isSaving}
                          title="Ayrıntıları görüntüle"
                        >
                          <Eye size={17} />
                        </button>

                        {expense.status === "ACTIVE" &&
                          !expense.paymentBatch && (
                            <button
                              type="button"
                              onClick={() => {
                                setDistributionExpense(expense);
                                setShowCreateForm(false);
                                window.scrollTo({
                                  top: 0,
                                  behavior: "smooth",
                                });
                              }}
                              disabled={isSaving}
                              title="Dairelere dağıt"
                            >
                              <Send size={17} />
                            </button>
                          )}

                        {expense.status === "ACTIVE" && (
                          <button
                            type="button"
                            className="danger"
                            onClick={() => handleCancelExpense(expense)}
                            disabled={isSaving}
                            title="Gideri iptal et"
                          >
                            <Ban size={17} />
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

        <AccountingPagination
          page={page}
          totalPages={pagination.totalPages}
          onPageChange={setPage}
          disabled={isLoading || isSaving}
        />
      </section>

      <ExpenseDetailsModal
        expense={selectedExpense}
        onClose={() => setSelectedExpense(null)}
        onError={setErrorMessage}
      />
    </DashboardLayout>
  );
}

export default AccountingExpensesPage;