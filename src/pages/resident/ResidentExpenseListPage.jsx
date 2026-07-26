import { useEffect, useMemo, useState } from "react";
import { Eye, FileText, Search, UploadCloud, X } from "lucide-react";
import { Link } from "react-router-dom";

import {
  getResidentAccountingExpense,
  getResidentAccountingExpenseDocumentBlob,
  getResidentAccountingExpenseDocumentViewUrl,
  getResidentAccountingExpenses,
} from "../../api/accountingApi";
import { residentNavItems } from "../../config/residentNavigation";
import { useAuth } from "../../hooks/useAuth";
import DashboardLayout from "../../layouts/DashboardLayout";
import {
  accountingExpenseCategoryLabels,
  formatDate,
  formatKurus,
  getDataArray,
} from "../../utils/accounting";

function normalizeText(value) {
  return String(value ?? "").toLocaleLowerCase("tr-TR").trim();
}

function formatFileSize(size) {
  const numericSize = Number(size) || 0;

  if (numericSize <= 0) {
    return "-";
  }

  if (numericSize < 1024 * 1024) {
    return `${Math.round(numericSize / 1024)} KB`;
  }

  return `${(numericSize / (1024 * 1024)).toFixed(1)} MB`;
}

function getScopeText(expense) {
  const siteName = expense.site?.name ?? "Site";

  return expense.block?.name
    ? `${siteName} / ${expense.block.name}`
    : `${siteName} / Tüm Site`;
}

function getDocumentPreviewType(documentItem) {
  const mimeType = String(documentItem?.mimeType ?? "").toLowerCase();
  const fileName = String(
    documentItem?.originalFileName ?? "",
  ).toLowerCase();

  if (
    mimeType === "application/pdf" ||
    fileName.endsWith(".pdf")
  ) {
    return "pdf";
  }

  if (
    mimeType.startsWith("image/") ||
    [".png", ".jpg", ".jpeg", ".webp"].some((extension) =>
      fileName.endsWith(extension),
    )
  ) {
    return "image";
  }

  return "other";
}

function isPastDueDate(value) {
  if (!value) return false;

  const dueDate = new Date(value);
  const today = new Date();

  dueDate.setHours(0, 0, 0, 0);
  today.setHours(0, 0, 0, 0);

  return dueDate < today;
}

function getAllocationPaymentSummary(allocation) {
  const amountKurus = Math.max(
    0,
    Number(allocation?.amountKurus) || 0,
  );
  const paidAmountKurus = Math.max(
    0,
    Number(allocation?.paidAmountKurus) || 0,
  );
  const remainingAmountKurus = Math.max(
    amountKurus - paidAmountKurus,
    0,
  );

  if (!allocation) {
    return {
      amountKurus,
      paidAmountKurus,
      remainingAmountKurus,
      statusText: "Dağıtılmadı",
      statusClass: "waiting",
    };
  }

  if (allocation.status === "CANCELLED") {
    return {
      amountKurus,
      paidAmountKurus,
      remainingAmountKurus: 0,
      statusText: "İptal Edildi",
      statusClass: "cancelled",
    };
  }

  if (
    allocation.status === "PAID" ||
    (amountKurus > 0 && paidAmountKurus >= amountKurus)
  ) {
    return {
      amountKurus,
      paidAmountKurus,
      remainingAmountKurus: 0,
      statusText: "Ödendi",
      statusClass: "paid",
    };
  }

  if (
    allocation.status === "PARTIAL" ||
    paidAmountKurus > 0
  ) {
    return {
      amountKurus,
      paidAmountKurus,
      remainingAmountKurus,
      statusText: "Kısmi Ödendi",
      statusClass: "partial",
    };
  }

  if (isPastDueDate(allocation.dueDate)) {
    return {
      amountKurus,
      paidAmountKurus,
      remainingAmountKurus,
      statusText: "Gecikti",
      statusClass: "late",
    };
  }

  return {
    amountKurus,
    paidAmountKurus,
    remainingAmountKurus,
    statusText: "Ödeme Bekliyor",
    statusClass: "waiting",
  };
}

function canUploadReceipt(allocation) {
  if (!allocation) {
    return false;
  }

  const remainingAmountKurus = Math.max(
    Number(allocation.amountKurus ?? 0) -
      Number(allocation.paidAmountKurus ?? 0),
    0,
  );

  return (
    allocation.status !== "PAID" &&
    allocation.status !== "CANCELLED" &&
    remainingAmountKurus > 0 &&
    !allocation.hasPendingReceipt
  );
}

function ExpenseDocumentPreview({
  expenseId,
  documentItem,
}) {
  const previewType = getDocumentPreviewType(documentItem);
  const previewKey = `${expenseId}:${documentItem.id}`;

  const [previewState, setPreviewState] = useState({
    key: "",
    url: "",
    error: "",
  });

  const isCurrentPreview = previewState.key === previewKey;
  const previewUrl = isCurrentPreview ? previewState.url : "";
  const previewError = isCurrentPreview
    ? previewState.error
    : "";
  const isPreviewLoading =
    previewType !== "other" && !isCurrentPreview;

  useEffect(() => {
    if (previewType === "other") {
      return undefined;
    }

    let isCancelled = false;
    let createdObjectUrl = "";

    async function loadDocumentPreview() {
      try {
        const fileBlob =
          await getResidentAccountingExpenseDocumentBlob({
            expenseId,
            documentId: documentItem.id,
          });

        if (isCancelled) {
          return;
        }

        createdObjectUrl = URL.createObjectURL(fileBlob);

        setPreviewState({
          key: previewKey,
          url: createdObjectUrl,
          error: "",
        });
      } catch (error) {
        if (isCancelled) {
          return;
        }

        setPreviewState({
          key: previewKey,
          url: "",
          error:
            error?.message ||
            "Belge önizlemesi yüklenemedi.",
        });
      }
    }

    void loadDocumentPreview();

    return () => {
      isCancelled = true;

      if (createdObjectUrl) {
        URL.revokeObjectURL(createdObjectUrl);
      }
    };
  }, [
    documentItem.id,
    expenseId,
    previewKey,
    previewType,
  ]);

  if (previewType === "other") {
    return (
      <div className="resident-expense-document-empty">
        <FileText size={24} />
        <p>
          Bu dosya türü sayfa içinde önizlenemiyor.
          Yukarıdaki bağlantıdan açabilirsiniz.
        </p>
      </div>
    );
  }

  if (isPreviewLoading) {
    return (
      <div className="resident-expense-document-empty">
        <p>Belge yükleniyor...</p>
      </div>
    );
  }

  if (previewError) {
    return (
      <div className="resident-expense-document-empty">
        <FileText size={24} />
        <p>{previewError}</p>
      </div>
    );
  }

  if (previewType === "image") {
    return (
      <div className="resident-expense-document-preview">
        <img
          src={previewUrl}
          alt={
            documentItem.originalFileName ||
            "Gider belgesi"
          }
        />
      </div>
    );
  }

  return (
    <div className="resident-expense-document-preview">
      <iframe
        src={previewUrl}
        title={
          documentItem.originalFileName ||
          "Gider PDF belgesi"
        }
      />
    </div>
  );
}

function ResidentExpenseListPage() {
  const { user, selectedApartmentId } = useAuth();

  const [expenses, setExpenses] = useState([]);
  const [selectedExpense, setSelectedExpense] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isDetailsLoading, setIsDetailsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    let isCancelled = false;

    async function loadExpenses() {
      try {
        setIsLoading(true);
        setErrorMessage("");
        setSelectedExpense(null);

        const result = await getResidentAccountingExpenses({
          page: 1,
          limit: 100,
        });

        if (!isCancelled) {
          setExpenses(getDataArray(result));
        }
      } catch (error) {
        if (!isCancelled) {
          setExpenses([]);
          setErrorMessage(
            error?.message ?? "Gider listesi alınamadı.",
          );
        }
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    }

    void loadExpenses();

    return () => {
      isCancelled = true;
    };
  }, [selectedApartmentId]);

  const filteredExpenses = useMemo(() => {
    const searchValue = normalizeText(searchTerm);

    return expenses.filter((expense) => {
      const searchableText = [
        expense.title,
        expense.description,
        expense.vendorName,
        expense.invoiceNumber,
        expense.site?.name,
        expense.block?.name,
        accountingExpenseCategoryLabels[expense.category],
      ]
        .join(" ")
        .toLocaleLowerCase("tr-TR");

      const matchesSearch = searchableText.includes(searchValue);
      const matchesCategory =
        !categoryFilter || expense.category === categoryFilter;

      return matchesSearch && matchesCategory;
    });
  }, [categoryFilter, expenses, searchTerm]);

  async function openDetails(expenseId) {
    try {
      setIsDetailsLoading(true);
      setErrorMessage("");

      const result = await getResidentAccountingExpense(expenseId);
      setSelectedExpense(result?.data ?? result ?? null);
    } catch (error) {
      setErrorMessage(
        error?.message ?? "Gider ayrıntısı alınamadı.",
      );
    } finally {
      setIsDetailsLoading(false);
    }
  }

  const selectedPaymentSummary = useMemo(
    () =>
      getAllocationPaymentSummary(
        selectedExpense?.paymentAllocation,
      ),
    [selectedExpense],
  );

  return (
    <DashboardLayout
      roleTitle="Gider Listesi"
      roleBadge="Sakin"
      userName={user?.fullName ?? "Sakin"}
      navItems={residentNavItems}
      theme="resident"
    >
      <div className="dashboard-page-header">
        <div>
          <span className="section-kicker">Gider Bilgilendirmesi</span>
          <h2>Gider Listesi</h2>
          <p>
            Yönetimin dairenize dağıttığı giderleri, ayrıntılarını ve
            faturalarını buradan yalnızca görüntüleyebilirsiniz.
          </p>
        </div>
      </div>

      {errorMessage && (
        <div className="login-error-message">
          <p>{errorMessage}</p>
        </div>
      )}

      <section className="accounting-filter-bar">
        <label className="accounting-search-label">
          <Search size={17} />
          <input
            type="search"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Gider, firma veya fatura no ara..."
          />
        </label>

        <label>
          Kategori
          <select
            value={categoryFilter}
            onChange={(event) =>
              setCategoryFilter(event.target.value)
            }
          >
            <option value="">Tümü</option>
            {Object.entries(accountingExpenseCategoryLabels).map(
              ([value, label]) => (
                <option value={value} key={value}>
                  {label}
                </option>
              ),
            )}
          </select>
        </label>
      </section>

      <section className="accounting-table-card">
        {isLoading ? (
          <p className="accounting-empty-text">
            Giderler yükleniyor...
          </p>
        ) : filteredExpenses.length === 0 ? (
          <p className="accounting-empty-text">
            Dairenize dağıtılmış gider bulunmuyor.
          </p>
        ) : (
          <div className="accounting-table-scroll">
            <table className="accounting-table resident-expense-table">
              <thead>
                <tr>
                  <th>Gider</th>
                  <th>Kategori</th>
                  <th>Kapsam</th>
                  <th>Toplam Tutar</th>
                  <th>Daire Payı</th>
                  <th>Ödenen</th>
                  <th>Kalan</th>
                  <th>Tarih</th>
                  <th>Durum</th>
                  <th>İşlem</th>
                </tr>
              </thead>

              <tbody>
                {filteredExpenses.map((expense) => {
                  const allocation = expense.paymentAllocation;
                  const paymentSummary =
                    getAllocationPaymentSummary(allocation);

                  return (
                    <tr key={expense.id}>
                      <td>
                        <strong>{expense.title}</strong>
                        <small>
                          {expense.vendorName || "Firma bilgisi yok"}
                        </small>
                      </td>
                      <td>
                        {accountingExpenseCategoryLabels[
                          expense.category
                        ] ?? expense.category}
                      </td>
                      <td>{getScopeText(expense)}</td>
                      <td>{formatKurus(expense.amountKurus)}</td>
                      <td>
                        {formatKurus(paymentSummary.amountKurus)}
                      </td>
                      <td>
                        {formatKurus(
                          paymentSummary.paidAmountKurus,
                        )}
                      </td>
                      <td>
                        {formatKurus(
                          paymentSummary.remainingAmountKurus,
                        )}
                      </td>
                      <td>{formatDate(expense.expenseDate)}</td>
                      <td>
                        <span
                          className={`resident-payment-status-badge ${paymentSummary.statusClass}`}
                        >
                          {paymentSummary.statusText}
                        </span>
                      </td>
                      <td>
                        <div className="accounting-row-actions">
                          <button
                            type="button"
                            onClick={() => openDetails(expense.id)}
                            disabled={isDetailsLoading}
                            title="Ayrıntıları görüntüle"
                          >
                            <Eye size={17} />
                          </button>

                          {canUploadReceipt(allocation) && (
                            <Link
                              to="/resident/receipts"
                              state={{
                                paymentAllocationId: allocation.id,
                              }}
                              title="Dekont Yükle"
                            >
                              <UploadCloud size={17} />
                            </Link>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {selectedExpense && (
        <div className="modal-overlay">
          <section className="details-modal">
            <div className="modal-header">
              <div>
                <span className="section-kicker">Gider Detayı</span>
                <h3>{selectedExpense.title}</h3>
              </div>

              <button
                type="button"
                className="modal-close-button"
                onClick={() => setSelectedExpense(null)}
                aria-label="Gider detay penceresini kapat"
              >
                <X size={20} />
              </button>
            </div>

            <div className="details-list">
              <div>
                <span>Kategori</span>
                <strong>
                  {accountingExpenseCategoryLabels[
                    selectedExpense.category
                  ] ?? selectedExpense.category}
                </strong>
              </div>

              <div>
                <span>Toplam Tutar</span>
                <strong>
                  {formatKurus(selectedExpense.amountKurus)}
                </strong>
              </div>

              <div>
                <span>Gider Tarihi</span>
                <strong>
                  {formatDate(selectedExpense.expenseDate)}
                </strong>
              </div>

              <div>
                <span>Kapsam</span>
                <strong>{getScopeText(selectedExpense)}</strong>
              </div>

              <div>
                <span>Firma / Tedarikçi</span>
                <strong>
                  {selectedExpense.vendorName || "-"}
                </strong>
              </div>

              <div>
                <span>Fatura Numarası</span>
                <strong>
                  {selectedExpense.invoiceNumber || "-"}
                </strong>
              </div>

              <div>
                <span>Daire Payı</span>
                <strong>
                  {formatKurus(
                    selectedPaymentSummary.amountKurus,
                  )}
                </strong>
              </div>

              <div>
                <span>Ödenen</span>
                <strong>
                  {formatKurus(
                    selectedPaymentSummary.paidAmountKurus,
                  )}
                </strong>
              </div>

              <div>
                <span>Kalan</span>
                <strong>
                  {formatKurus(
                    selectedPaymentSummary.remainingAmountKurus,
                  )}
                </strong>
              </div>

              <div>
                <span>Ödeme Durumu</span>
                <strong>
                  {selectedPaymentSummary.statusText}
                </strong>
              </div>
            </div>

            <div className="details-description">
              <span>Açıklama</span>
              <p>
                {selectedExpense.description ||
                  "Bu gider için açıklama bulunmuyor."}
              </p>
            </div>

            <div className="details-description">
              <span>Fatura / Belgeler</span>

              {selectedExpense.documents?.length > 0 ? (
                <div className="resident-expense-document-list">
                  {selectedExpense.documents.map((documentItem) => {
                    const documentUrl =
                      getResidentAccountingExpenseDocumentViewUrl({
                        expenseId: selectedExpense.id,
                        documentId: documentItem.id,
                      });
                    return (
                      <article
                        className="resident-expense-document-card"
                        key={documentItem.id}
                      >
                        <div className="resident-expense-document-header">
                          <div>
                            <FileText size={18} />
                            <div>
                              <strong>
                                {documentItem.originalFileName || "Belge"}
                              </strong>
                              <small>
                                {formatFileSize(documentItem.sizeBytes)}
                              </small>
                            </div>
                          </div>

                          <a
                            href={documentUrl}
                            target="_blank"
                            rel="noreferrer"
                          >
                            Yeni Sekmede Aç
                          </a>
                        </div>

                        <ExpenseDocumentPreview
                          expenseId={selectedExpense.id}
                          documentItem={documentItem}
                        />
                      </article>
                    );
                  })}
                </div>
              ) : (
                <p>Bu gider için belge bulunmuyor.</p>
              )}
            </div>
          </section>
        </div>
      )}
    </DashboardLayout>
  );
}

export default ResidentExpenseListPage;