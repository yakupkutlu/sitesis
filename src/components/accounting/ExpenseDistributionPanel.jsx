import { useState } from "react";
import { Calculator, Send, X } from "lucide-react";

import { distributeAccountingExpense } from "../../api/accountingApi";
import {
  distributePreview,
  formatKurus,
  getApartmentLabel,
} from "../../utils/accounting";

function ExpenseDistributionPanel({
  expense,
  apartments,
  onCompleted,
  onCancel,
  isSaving,
  setIsSaving,
}) {
  const defaultScopeType = expense?.blockId ? "BLOCK" : "SITE";

  const [formData, setFormData] = useState({
    title: expense?.title ?? "",
    description: expense?.description ?? "",
    scopeType: defaultScopeType,
    apartmentIds: [],
    exemptApartmentIds: [],
    dueDate: "",
    sendSms: false,
    sendEmail: true,
  });

  const [errorMessage, setErrorMessage] = useState("");

  const safeApartments = Array.isArray(apartments) ? apartments : [];

  const expenseApartments = safeApartments.filter((apartment) => {
    const apartmentSiteId = apartment.block?.site?.id;
    const apartmentBlockId = apartment.block?.id;

    if (apartmentSiteId !== expense?.siteId) {
      return false;
    }

    if (expense?.blockId && apartmentBlockId !== expense.blockId) {
      return false;
    }

    return true;
  });

  const scopedApartments =
    formData.scopeType === "APARTMENTS"
      ? expenseApartments.filter((apartment) =>
          formData.apartmentIds.includes(apartment.id)
        )
      : expenseApartments;

  const payableApartmentCount = Math.max(
    0,
    scopedApartments.length - formData.exemptApartmentIds.length
  );

  const preview = distributePreview(
    Number(expense?.amountKurus ?? 0),
    payableApartmentCount
  );

  function toggleId(fieldName, id) {
    setFormData((current) => {
      const currentIds = current[fieldName];
      const exists = currentIds.includes(id);

      return {
        ...current,
        [fieldName]: exists
          ? currentIds.filter((itemId) => itemId !== id)
          : [...currentIds, id],
      };
    });
  }

  function handleScopeTypeChange(event) {
    const nextScopeType = event.target.value;

    setFormData((current) => ({
      ...current,
      scopeType: nextScopeType,
      apartmentIds: [],
      exemptApartmentIds: [],
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (!formData.dueDate) {
      setErrorMessage("Son ödeme tarihi zorunludur.");
      return;
    }

    if (
      formData.scopeType === "APARTMENTS" &&
      formData.apartmentIds.length === 0
    ) {
      setErrorMessage("En az bir daire seçmelisiniz.");
      return;
    }

    if (payableApartmentCount <= 0) {
      setErrorMessage("Muaf olmayan en az bir daire bulunmalıdır.");
      return;
    }

    try {
      setIsSaving(true);
      setErrorMessage("");

      const payload = {
        title: formData.title.trim() || expense.title,
        description: formData.description.trim() || undefined,
        scopeType: formData.scopeType,
        siteId: expense.siteId,
        blockId:
          formData.scopeType === "BLOCK"
            ? expense.blockId || undefined
            : undefined,
        apartmentIds:
          formData.scopeType === "APARTMENTS"
            ? formData.apartmentIds
            : undefined,
        exemptApartmentIds: formData.exemptApartmentIds,
        dueDate: formData.dueDate,
        sendSms: formData.sendSms,
        sendEmail: formData.sendEmail,
      };

      const result = await distributeAccountingExpense(expense.id, payload);

      await onCompleted(result?.message);
    } catch (error) {
      setErrorMessage(error?.message ?? "Gider dairelere dağıtılamadı.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <section className="accounting-form-card">
      <div className="accounting-form-header">
        <div>
          <span className="section-kicker">Gider Paylaşımı</span>
          <h3>{expense?.title}</h3>
          <p>
            Muaf daireleri seçin. Toplam gider kalan daireler arasında kuruş
            kaybı olmadan eşit dağıtılır.
          </p>
        </div>

        <button
          type="button"
          className="modal-close-button"
          onClick={onCancel}
          disabled={isSaving}
          aria-label="Dağıtım formunu kapat"
        >
          <X size={20} />
        </button>
      </div>

      {errorMessage && (
        <div className="login-error-message">
          <p>{errorMessage}</p>
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="accounting-form-grid">
          <label>
            Ödeme Başlığı
            <input
              type="text"
              value={formData.title}
              onChange={(event) =>
                setFormData((current) => ({
                  ...current,
                  title: event.target.value,
                }))
              }
              required
              disabled={isSaving}
            />
          </label>

          <label>
            Dağıtım Kapsamı
            <select
              value={formData.scopeType}
              onChange={handleScopeTypeChange}
              disabled={isSaving}
            >
              {!expense?.blockId && <option value="SITE">Tüm Site</option>}
              <option value="BLOCK">Tüm Blok / Apartman</option>
              <option value="APARTMENTS">Belirli Daireler</option>
            </select>
          </label>

          <label>
            Son Ödeme Tarihi
            <input
              type="date"
              value={formData.dueDate}
              onChange={(event) =>
                setFormData((current) => ({
                  ...current,
                  dueDate: event.target.value,
                }))
              }
              required
              disabled={isSaving}
            />
          </label>

          <label className="accounting-checkbox-row">
            <input
              type="checkbox"
              checked={formData.sendEmail}
              onChange={(event) =>
                setFormData((current) => ({
                  ...current,
                  sendEmail: event.target.checked,
                }))
              }
              disabled={isSaving}
            />
            E-posta bildirimi gönder
          </label>

          <label className="accounting-checkbox-row">
            <input
              type="checkbox"
              checked={formData.sendSms}
              onChange={(event) =>
                setFormData((current) => ({
                  ...current,
                  sendSms: event.target.checked,
                }))
              }
              disabled={isSaving}
            />
            SMS bildirimi gönder
          </label>

          <label className="accounting-full-width">
            Açıklama
            <textarea
              rows={2}
              value={formData.description}
              onChange={(event) =>
                setFormData((current) => ({
                  ...current,
                  description: event.target.value,
                }))
              }
              disabled={isSaving}
            />
          </label>
        </div>

        {formData.scopeType === "APARTMENTS" && (
          <div className="accounting-selection-section">
            <h4>Ödeme gönderilecek daireler</h4>
            <div className="accounting-apartment-grid">
              {expenseApartments.map((apartment) => (
                <label key={apartment.id}>
                  <input
                    type="checkbox"
                    checked={formData.apartmentIds.includes(apartment.id)}
                    onChange={() => {
                      toggleId("apartmentIds", apartment.id);

                      setFormData((current) => ({
                        ...current,
                        exemptApartmentIds:
                          current.exemptApartmentIds.filter(
                            (id) => id !== apartment.id
                          ),
                      }));
                    }}
                    disabled={isSaving}
                  />
                  {getApartmentLabel(apartment)}
                </label>
              ))}
            </div>
          </div>
        )}

        <div className="accounting-selection-section">
          <h4>Muaf tutulacak daireler</h4>
          <p>
            Yönetici dairesi, bina görevlisi dairesi veya özel muafiyetleri
            buradan seçin.
          </p>

          <div className="accounting-apartment-grid">
            {scopedApartments.map((apartment) => (
              <label key={apartment.id}>
                <input
                  type="checkbox"
                  checked={formData.exemptApartmentIds.includes(apartment.id)}
                  onChange={() =>
                    toggleId("exemptApartmentIds", apartment.id)
                  }
                  disabled={isSaving}
                />
                {getApartmentLabel(apartment)}
              </label>
            ))}
          </div>
        </div>

        <div className="accounting-distribution-preview">
          <Calculator size={22} />

          <div>
            <strong>Dağıtım Önizlemesi</strong>
            <span>Toplam gider: {formatKurus(expense?.amountKurus)}</span>
            <span>Seçili daire: {scopedApartments.length}</span>
            <span>Muaf daire: {formData.exemptApartmentIds.length}</span>
            <span>Ödeme yapacak daire: {payableApartmentCount}</span>
            <span>
              Daire başına:{" "}
              {preview.minimumKurus === preview.maximumKurus
                ? formatKurus(preview.minimumKurus)
                : `${formatKurus(preview.minimumKurus)} – ${formatKurus(
                    preview.maximumKurus
                  )}`}
            </span>

            {preview.remainder > 0 && (
              <small>
                {preview.remainder} daireye kuruş farkı nedeniyle 1 kuruş fazla
                dağıtılır. Toplam tutar değişmez.
              </small>
            )}
          </div>
        </div>

        <div className="accounting-form-actions">
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
            disabled={isSaving || payableApartmentCount <= 0}
          >
            <Send size={18} />
            {isSaving ? "Dağıtılıyor..." : "Dairelere Ödeme Gönder"}
          </button>
        </div>
      </form>
    </section>
  );
}

export default ExpenseDistributionPanel;
