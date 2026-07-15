import { useMemo, useState } from "react";
import { FileText, PlusCircle, X } from "lucide-react";

import { createAccountingExpense } from "../../api/accountingApi";
import {
  accountingExpenseCategoryLabels,
  getUniqueBlocks,
  getUniqueSites,
  parseTryToKurus,
} from "../../utils/accounting";

const initialFormData = {
  title: "",
  description: "",
  category: "MAINTENANCE",
  amount: "",
  expenseDate: new Date().toISOString().slice(0, 10),
  vendorName: "",
  invoiceNumber: "",
  siteId: "",
  blockId: "",
};

function ExpenseCreateForm({
  apartments,
  onCreated,
  onCancel,
  isSaving,
  setIsSaving,
}) {
  const [formData, setFormData] = useState(initialFormData);
  const [documents, setDocuments] = useState([]);
  const [errorMessage, setErrorMessage] = useState("");

  const siteOptions = useMemo(
    () => getUniqueSites(apartments),
    [apartments]
  );

  const blockOptions = useMemo(
    () => getUniqueBlocks(apartments, formData.siteId),
    [apartments, formData.siteId]
  );

  function handleChange(event) {
    const { name, value } = event.target;

    setFormData((current) => {
      if (name === "siteId") {
        return {
          ...current,
          siteId: value,
          blockId: "",
        };
      }

      return {
        ...current,
        [name]: value,
      };
    });
  }

  async function handleSubmit(event) {
    event.preventDefault();

    const amountKurus = parseTryToKurus(formData.amount);

    if (!amountKurus) {
      setErrorMessage("Gider tutarı sıfırdan büyük olmalıdır.");
      return;
    }

    if (!formData.siteId) {
      setErrorMessage("Site seçimi zorunludur.");
      return;
    }

    if (documents.length === 0) {
      setErrorMessage("En az bir fatura veya belge yüklemelisiniz.");
      return;
    }

    if (documents.length > 5) {
      setErrorMessage("Tek seferde en fazla 5 belge yükleyebilirsiniz.");
      return;
    }

    try {
      setIsSaving(true);
      setErrorMessage("");

      const result = await createAccountingExpense({
        ...formData,
        amountKurus,
        documents,
      });

      const createdExpense = result?.data ?? null;

      setFormData(initialFormData);
      setDocuments([]);

      await onCreated(createdExpense, result?.message);
    } catch (error) {
      setErrorMessage(error?.message ?? "Gider kaydı oluşturulamadı.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <section className="accounting-form-card">
      <div className="accounting-form-header">
        <div>
          <span className="section-kicker">Yeni Gider</span>
          <h3>Gider ve fatura kaydı oluştur</h3>
          <p>
            Tutar, kapsam ve faturayı kaydedin. Sakinlere dağıtma işlemi
            kayıt oluşturulduktan sonra yapılır.
          </p>
        </div>

        <button
          type="button"
          className="modal-close-button"
          onClick={onCancel}
          disabled={isSaving}
          aria-label="Gider formunu kapat"
        >
          <X size={20} />
        </button>
      </div>

      {errorMessage && (
        <div className="login-error-message">
          <p>{errorMessage}</p>
        </div>
      )}

      <form className="accounting-form-grid" onSubmit={handleSubmit}>
        <label>
          Gider Başlığı
          <input
            type="text"
            name="title"
            value={formData.title}
            onChange={handleChange}
            placeholder="Örn: A Blok Asansör Tamiri"
            minLength={2}
            maxLength={200}
            required
            disabled={isSaving}
          />
        </label>

        <label>
          Kategori
          <select
            name="category"
            value={formData.category}
            onChange={handleChange}
            disabled={isSaving}
          >
            {Object.entries(accountingExpenseCategoryLabels).map(
              ([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              )
            )}
          </select>
        </label>

        <label>
          Tutar (TL)
          <input
            type="text"
            inputMode="decimal"
            name="amount"
            value={formData.amount}
            onChange={handleChange}
            placeholder="5000,00"
            required
            disabled={isSaving}
          />
        </label>

        <label>
          Gider Tarihi
          <input
            type="date"
            name="expenseDate"
            value={formData.expenseDate}
            onChange={handleChange}
            required
            disabled={isSaving}
          />
        </label>

        <label>
          Site
          <select
            name="siteId"
            value={formData.siteId}
            onChange={handleChange}
            required
            disabled={isSaving || siteOptions.length === 0}
          >
            <option value="">Site seçiniz</option>
            {siteOptions.map((site) => (
              <option key={site.id} value={site.id}>
                {site.name}
              </option>
            ))}
          </select>
        </label>

        <label>
          Blok / Apartman
          <select
            name="blockId"
            value={formData.blockId}
            onChange={handleChange}
            disabled={isSaving || !formData.siteId}
          >
            <option value="">Site geneli</option>
            {blockOptions.map((block) => (
              <option key={block.id} value={block.id}>
                {block.name}
              </option>
            ))}
          </select>
        </label>

        <label>
          Firma / Tedarikçi
          <input
            type="text"
            name="vendorName"
            value={formData.vendorName}
            onChange={handleChange}
            placeholder="Örn: ABC Asansör Ltd."
            disabled={isSaving}
          />
        </label>

        <label>
          Fatura Numarası
          <input
            type="text"
            name="invoiceNumber"
            value={formData.invoiceNumber}
            onChange={handleChange}
            placeholder="Örn: FTR-2026-105"
            disabled={isSaving}
          />
        </label>

        <label className="accounting-full-width">
          Açıklama
          <textarea
            name="description"
            value={formData.description}
            onChange={handleChange}
            rows={3}
            maxLength={1000}
            placeholder="Giderin ayrıntılarını yazın."
            disabled={isSaving}
          />
        </label>

        <label className="accounting-full-width accounting-file-field">
          Fatura / Belge
          <input
            type="file"
            multiple
            accept=".pdf,.png,.jpg,.jpeg,.webp,application/pdf,image/png,image/jpeg,image/webp"
            onChange={(event) =>
              setDocuments(Array.from(event.target.files ?? []))
            }
            required
            disabled={isSaving}
          />

          <span>
            <FileText size={17} />
            PDF, PNG, JPG veya WEBP — en fazla 5 dosya
          </span>

          {documents.length > 0 && (
            <ul className="accounting-file-list">
              {documents.map((documentFile) => (
                <li key={`${documentFile.name}-${documentFile.lastModified}`}>
                  {documentFile.name}
                </li>
              ))}
            </ul>
          )}
        </label>

        <div className="accounting-form-actions accounting-full-width">
          <button
            type="button"
            className="secondary-form-button"
            onClick={onCancel}
            disabled={isSaving}
          >
            Vazgeç
          </button>

          <button
            type="submit"
            className="dashboard-action-button"
            disabled={isSaving}
          >
            <PlusCircle size={18} />
            {isSaving ? "Kaydediliyor..." : "Gideri Kaydet"}
          </button>
        </div>
      </form>
    </section>
  );
}

export default ExpenseCreateForm;
