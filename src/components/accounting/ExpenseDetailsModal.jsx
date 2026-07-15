import { Download, FileText, X } from "lucide-react";

import { downloadAccountingExpenseDocument } from "../../api/accountingApi";
import {
  accountingExpenseCategoryLabels,
  formatDate,
  formatKurus,
} from "../../utils/accounting";

function ExpenseDetailsModal({ expense, onClose, onError }) {
  if (!expense) {
    return null;
  }

  const allocations = expense.paymentBatch?.allocations ?? [];
  const exemptions = expense.paymentBatch?.exemptions ?? [];

  async function handleDownload(documentItem) {
    try {
      await downloadAccountingExpenseDocument({
        expenseId: expense.id,
        documentId: documentItem.id,
        fileName: documentItem.originalFileName,
      });
    } catch (error) {
      onError(error?.message ?? "Belge indirilemedi.");
    }
  }

  return (
    <div className="accounting-modal-backdrop" role="presentation">
      <section
        className="accounting-modal"
        role="dialog"
        aria-modal="true"
        aria-label="Gider ayrıntıları"
      >
        <div className="accounting-form-header">
          <div>
            <span className="section-kicker">Gider Ayrıntısı</span>
            <h3>{expense.title}</h3>
          </div>

          <button
            type="button"
            className="modal-close-button"
            onClick={onClose}
            aria-label="Pencereyi kapat"
          >
            <X size={20} />
          </button>
        </div>

        <div className="accounting-detail-grid">
          <div>
            <span>Tutar</span>
            <strong>{formatKurus(expense.amountKurus)}</strong>
          </div>

          <div>
            <span>Kategori</span>
            <strong>
              {accountingExpenseCategoryLabels[expense.category] ??
                expense.category}
            </strong>
          </div>

          <div>
            <span>Tarih</span>
            <strong>{formatDate(expense.expenseDate)}</strong>
          </div>

          <div>
            <span>Kapsam</span>
            <strong>
              {expense.site?.name ?? "Site"}
              {expense.block?.name ? ` / ${expense.block.name}` : ""}
            </strong>
          </div>

          <div>
            <span>Firma</span>
            <strong>{expense.vendorName ?? "-"}</strong>
          </div>

          <div>
            <span>Fatura No</span>
            <strong>{expense.invoiceNumber ?? "-"}</strong>
          </div>

          <div>
            <span>Durum</span>
            <strong>
              {expense.status === "ACTIVE" ? "Aktif" : "İptal Edildi"}
            </strong>
          </div>

          <div>
            <span>Dağıtım</span>
            <strong>
              {expense.paymentBatch
                ? `${allocations.length} ödeme / ${exemptions.length} muaf`
                : "Henüz dağıtılmadı"}
            </strong>
          </div>
        </div>

        {expense.description && (
          <div className="accounting-detail-description">
            <span>Açıklama</span>
            <p>{expense.description}</p>
          </div>
        )}

        {expense.cancellationReason && (
          <div className="login-error-message">
            <p>İptal nedeni: {expense.cancellationReason}</p>
          </div>
        )}

        <div className="accounting-document-section">
          <h4>Fatura ve Belgeler</h4>

          {expense.documents?.length > 0 ? (
            <div className="accounting-document-list">
              {expense.documents.map((documentItem) => (
                <button
                  type="button"
                  key={documentItem.id}
                  onClick={() => handleDownload(documentItem)}
                >
                  <FileText size={18} />
                  <span>{documentItem.originalFileName}</span>
                  <Download size={17} />
                </button>
              ))}
            </div>
          ) : (
            <p>Belge bulunamadı.</p>
          )}
        </div>
      </section>
    </div>
  );
}

export default ExpenseDetailsModal;
