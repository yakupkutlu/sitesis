import { managerNavItems } from "../../config/managerNavigation";
import { useAuth } from "../../hooks/useAuth";
import { useEffect, useMemo, useState } from "react";
import DashboardLayout from "../../layouts/DashboardLayout";
import {
  Edit,
  Eye,
  Plus,
  Trash2,
} from "lucide-react";

import { getApartments } from "../../api/apartmentsApi";
import {
  cancelPaymentBatch,
  createPaymentBatch,
  getPaymentBatches,
  updatePaymentBatch,
} from "../../api/paymentBatchesApi";


const emptyFormData = {
  title: "",
  description: "",
  totalAmount: "",
  scopeType: "BLOCK",
  siteId: "",
  blockId: "",
  apartmentIds: [],
  exemptApartmentIds: [],
  dueDate: "",
  sendSms: false,
  sendEmail: true,
};

function getDataArray(result) {
  const data = result?.data ?? result;

  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.paymentBatches)) return data.paymentBatches;
  if (Array.isArray(data?.apartments)) return data.apartments;

  return [];
}

function formatCurrencyFromKurus(value) {
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: "TRY",
    minimumFractionDigits: 2,
  }).format((Number(value) || 0) / 100);
}

function formatDate(value) {
  if (!value) return "-";

  try {
    return new Date(value).toLocaleDateString("tr-TR");
  } catch {
    return "-";
  }
}

function toInputDate(value) {
  if (!value) return "";

  try {
    return new Date(value).toISOString().slice(0, 10);
  } catch {
    return "";
  }
}

function normalizeText(value) {
  return String(value ?? "").toLocaleLowerCase("tr-TR").trim();
}

function getUniqueSites(apartments) {
  const siteMap = new Map();

  for (const apartment of apartments) {
    const site = apartment.block?.site;

    if (site?.id) {
      siteMap.set(site.id, {
        id: site.id,
        name: site.name,
      });
    }
  }

  return Array.from(siteMap.values());
}

function getUniqueBlocks(apartments) {
  const blockMap = new Map();

  for (const apartment of apartments) {
    const block = apartment.block;

    if (block?.id) {
      blockMap.set(block.id, {
        id: block.id,
        name: block.name,
        siteName: block.site?.name ?? "Site",
        siteId: block.site?.id,
      });
    }
  }

  return Array.from(blockMap.values());
}

function getApartmentLabel(apartment) {
  return `${apartment.block?.site?.name ?? "Site"} / ${
    apartment.block?.name ?? "Blok"
  } / Daire ${apartment.number}`;
}

function getScopeText(batch) {
  if (batch.scopeType === "SITE") {
    return batch.site?.name ?? "Site";
  }

  if (batch.scopeType === "BLOCK") {
    return `${batch.block?.site?.name ?? "Site"} / ${batch.block?.name ?? "Blok"}`;
  }

  return "Seçili Daireler";
}

function getBatchStatus(batch) {
  const allocations = Array.isArray(batch.allocations) ? batch.allocations : [];

  const paidCount = allocations.filter((item) => item.status === "PAID").length;
  const pendingCount = allocations.filter((item) => item.status === "PENDING").length;
  const cancelledCount = allocations.filter(
    (item) => item.status === "CANCELLED"
  ).length;

  if (allocations.length === 0) {
    return "Kayıt Yok";
  }

  if (paidCount === allocations.length) {
    return "Tamamı Ödendi";
  }

  if (cancelledCount === allocations.length) {
    return "İptal Edildi";
  }

  if (paidCount > 0) {
    return "Kısmi Ödendi";
  }

  if (pendingCount > 0) {
    return "Bekliyor";
  }

  return "Bilinmiyor";
}

function mapBatchToViewModel(batch) {
  const allocations = Array.isArray(batch.allocations) ? batch.allocations : [];
  const exemptions = Array.isArray(batch.exemptions) ? batch.exemptions : [];

  return {
    id: batch.id,
    title: batch.title,
    description: batch.description ?? "",
    totalAmountKurus: batch.totalAmountKurus,
    totalAmountText: formatCurrencyFromKurus(batch.totalAmountKurus),
    scopeType: batch.scopeType,
    scopeText: getScopeText(batch),
    dueDate: formatDate(batch.dueDate),
    dueDateInput: toInputDate(batch.dueDate),
    allocationCount: allocations.length,
    exemptCount: exemptions.length,
    status: getBatchStatus(batch),
    createdAt: formatDate(batch.createdAt),
    allocations,
    exemptions,
    raw: batch,
  };
}

function PaymentsPage() {
  const { user } = useAuth();

  const [paymentBatches, setPaymentBatches] = useState([]);
  const [apartments, setApartments] = useState([]);

  const [formData, setFormData] = useState(emptyFormData);
  const [editingPayment, setEditingPayment] = useState(null);
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [showForm, setShowForm] = useState(false);

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("Tümü");

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const siteOptions = useMemo(() => getUniqueSites(apartments), [apartments]);
  const blockOptions = useMemo(() => getUniqueBlocks(apartments), [apartments]);

  const scopedApartments = useMemo(() => {
    if (formData.scopeType === "SITE") {
      return apartments.filter(
        (apartment) => apartment.block?.site?.id === formData.siteId
      );
    }

    if (formData.scopeType === "BLOCK") {
      return apartments.filter(
        (apartment) => apartment.block?.id === formData.blockId
      );
    }

    if (formData.scopeType === "APARTMENTS") {
      return apartments.filter((apartment) =>
        formData.apartmentIds.includes(apartment.id)
      );
    }

    return [];
  }, [apartments, formData.scopeType, formData.siteId, formData.blockId, formData.apartmentIds]);

  async function loadPageData() {
    const [paymentResult, apartmentResult] = await Promise.all([
      getPaymentBatches({ page: 1, limit: 100 }),
      getApartments({ page: 1, limit: 100 }),
    ]);

    setPaymentBatches(getDataArray(paymentResult).map(mapBatchToViewModel));
    setApartments(getDataArray(apartmentResult));
  }

  useEffect(() => {
    let isMounted = true;

    async function loadInitialData() {
      try {
        setIsLoading(true);
        setErrorMessage("");

        const [paymentResult, apartmentResult] = await Promise.all([
          getPaymentBatches({ page: 1, limit: 100 }),
          getApartments({ page: 1, limit: 100 }),
        ]);

        if (isMounted) {
          setPaymentBatches(getDataArray(paymentResult).map(mapBatchToViewModel));
          setApartments(getDataArray(apartmentResult));
        }
      } catch (error) {
        if (isMounted) {
          setErrorMessage(error?.message ?? "Ödeme kayıtları alınamadı.");
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadInitialData();

    return () => {
      isMounted = false;
    };
  }, []);

  const summary = useMemo(() => {
    return {
      total: paymentBatches.length,
      waiting: paymentBatches.filter((item) => item.status === "Bekliyor").length,
      partial: paymentBatches.filter((item) => item.status === "Kısmi Ödendi").length,
      paid: paymentBatches.filter((item) => item.status === "Tamamı Ödendi").length,
    };
  }, [paymentBatches]);

  const filteredPayments = useMemo(() => {
    const searchValue = normalizeText(searchTerm);

    return paymentBatches.filter((payment) => {
      const searchableText = [
        payment.title,
        payment.description,
        payment.totalAmountText,
        payment.scopeText,
        payment.status,
        payment.dueDate,
      ]
        .join(" ")
        .toLocaleLowerCase("tr-TR");

      const matchesSearch = searchableText.includes(searchValue);
      const matchesStatus =
        statusFilter === "Tümü"
          ? payment.status !== "İptal Edildi"
          : payment.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [paymentBatches, searchTerm, statusFilter]);

  function resetForm() {
    setEditingPayment(null);
    setFormData(emptyFormData);
  }

  function openCreateForm() {
    resetForm();
    setShowForm(true);
    setMessage("");
    setErrorMessage("");
  }

  function closeForm() {
    resetForm();
    setShowForm(false);
  }

  function handleInputChange(event) {
    const { name, value, type, checked } = event.target;

    setFormData((currentData) => {
      if (type === "checkbox" && (name === "sendSms" || name === "sendEmail")) {
        return {
          ...currentData,
          [name]: checked,
        };
      }

      if (name === "scopeType") {
        return {
          ...currentData,
          scopeType: value,
          siteId: "",
          blockId: "",
          apartmentIds: [],
          exemptApartmentIds: [],
        };
      }

      if (name === "siteId" || name === "blockId") {
        return {
          ...currentData,
          [name]: value,
          exemptApartmentIds: [],
        };
      }

      return {
        ...currentData,
        [name]: value,
      };
    });
  }

  function toggleApartmentSelection(apartmentId) {
    setFormData((currentData) => {
      const isSelected = currentData.apartmentIds.includes(apartmentId);
      const nextApartmentIds = isSelected
        ? currentData.apartmentIds.filter((id) => id !== apartmentId)
        : [...currentData.apartmentIds, apartmentId];

      return {
        ...currentData,
        apartmentIds: nextApartmentIds,
        exemptApartmentIds: currentData.exemptApartmentIds.filter((id) =>
          nextApartmentIds.includes(id)
        ),
      };
    });
  }

  function toggleExemptApartment(apartmentId) {
    setFormData((currentData) => {
      const isSelected = currentData.exemptApartmentIds.includes(apartmentId);

      return {
        ...currentData,
        exemptApartmentIds: isSelected
          ? currentData.exemptApartmentIds.filter((id) => id !== apartmentId)
          : [...currentData.exemptApartmentIds, apartmentId],
      };
    });
  }

  function handleEdit(payment) {
    setEditingPayment(payment);

    setFormData({
      ...emptyFormData,
      title: payment.title ?? "",
      description: payment.description ?? "",
      dueDate: payment.dueDateInput ?? "",
    });

    setShowForm(true);
    setMessage("");
    setErrorMessage("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (!formData.title.trim()) {
      setErrorMessage("Başlık zorunludur.");
      return;
    }

    if (!formData.dueDate) {
      setErrorMessage("Son ödeme tarihi zorunludur.");
      return;
    }

    if (!editingPayment) {
      const amount = Number(formData.totalAmount);

      if (!amount || amount <= 0) {
        setErrorMessage("Toplam tutar pozitif olmalıdır.");
        return;
      }

      if (formData.scopeType === "SITE" && !formData.siteId) {
        setErrorMessage("Site seçimi zorunludur.");
        return;
      }

      if (formData.scopeType === "BLOCK" && !formData.blockId) {
        setErrorMessage("Blok seçimi zorunludur.");
        return;
      }

      if (formData.scopeType === "APARTMENTS" && formData.apartmentIds.length === 0) {
        setErrorMessage("En az bir daire seçilmelidir.");
        return;
      }

      const payableCount = scopedApartments.filter(
        (apartment) => !formData.exemptApartmentIds.includes(apartment.id)
      ).length;

      if (payableCount === 0) {
        setErrorMessage("Muaf olmayan en az bir daire kalmalıdır.");
        return;
      }
    }

    try {
      setIsSaving(true);
      setMessage("");
      setErrorMessage("");

      if (editingPayment) {
        await updatePaymentBatch(editingPayment.id, {
          title: formData.title.trim(),
          description: formData.description.trim() || null,
          dueDate: formData.dueDate,
        });

        setMessage("Ödeme başarıyla güncellendi.");
      } else {
        await createPaymentBatch({
          title: formData.title.trim(),
          description: formData.description.trim() || undefined,
          totalAmountKurus: Math.round(Number(formData.totalAmount) * 100),
          scopeType: formData.scopeType,
          ...(formData.scopeType === "SITE" ? { siteId: formData.siteId } : {}),
          ...(formData.scopeType === "BLOCK" ? { blockId: formData.blockId } : {}),
          ...(formData.scopeType === "APARTMENTS"
            ? { apartmentIds: formData.apartmentIds }
            : {}),
          exemptApartmentIds: formData.exemptApartmentIds,
          dueDate: formData.dueDate,
          sendSms: Boolean(formData.sendSms),
          sendEmail: Boolean(formData.sendEmail),
        });

        setMessage("Ödeme başarıyla oluşturuldu.");
      }

      await loadPageData();
      closeForm();
    } catch {
      setErrorMessage(
        editingPayment
          ? "Ödeme güncellenemedi. Bilgileri kontrol edin."
          : "Ödeme oluşturulamadı. Bu kapsam için yetkiniz olmayabilir veya seçimler hatalı olabilir."
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function handleCancelPayment(payment) {
    const isConfirmed = window.confirm(
      `${payment.title} ödemesini iptal etmek istiyor musunuz?`
    );

    if (!isConfirmed) {
      return;
    }

    try {
      setIsSaving(true);
      setMessage("");
      setErrorMessage("");

      await cancelPaymentBatch(payment.id);
      await loadPageData();

      setMessage("Ödeme başarıyla iptal edildi.");
    } catch {
      setErrorMessage(
        "Ödeme iptal edilemedi. İçinde ödenmiş kayıt olabilir veya yetkiniz olmayabilir."
      );
    } finally {
      setIsSaving(false);
    }
  }
  return (
    <DashboardLayout
      roleTitle="Aidat ve Ödemeler"
      roleBadge="Yönetici"
      userName={user?.fullName ?? "Yönetici"}
      navItems={managerNavItems}
      theme="manager"
    >
      <div className="dashboard-page-header">
        <div>
          <span className="section-kicker">Ödeme Yönetimi</span>

          <h2>Aidat ve Ödemeler</h2>

          <p>
            Yetki alanınızdaki site, blok veya seçili daireler için ödeme
            oluşturabilir, muaf daireleri seçebilir ve ödeme durumlarını takip
            edebilirsiniz.
          </p>
        </div>

        <button
          type="button"
          className="dashboard-action-button"
          onClick={openCreateForm}
          disabled={isSaving}
        >
          <Plus size={18} />
          Yeni Ödeme
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

      <section className="dashboard-summary-grid">
        <div className="summary-card">
          <span>Toplam Ödeme</span>
          <strong>{summary.total}</strong>
        </div>

        <div className="summary-card">
          <span>Bekleyen</span>
          <strong>{summary.waiting}</strong>
        </div>

        <div className="summary-card">
          <span>Kısmi Ödendi</span>
          <strong>{summary.partial}</strong>
        </div>

        <div className="summary-card">
          <span>Tamamı Ödendi</span>
          <strong>{summary.paid}</strong>
        </div>
      </section>

      {showForm && (
        <section className="dashboard-panel">
          <div className="manager-form-header">
            <div>
              <span className="section-kicker">
                {editingPayment ? "Ödeme Düzenleme" : "Yeni Ödeme"}
              </span>

              <h3>
                {editingPayment ? "Ödeme Bilgilerini Güncelle" : "Ödeme Oluştur"}
              </h3>

              <p>
                {editingPayment
                  ? "Bu ekranda ödeme başlığı, açıklaması ve son ödeme tarihi güncellenir."
                  : "Yeni ödeme oluştururken toplam tutar muaf olmayan dairelere otomatik bölüştürülür."}
              </p>
            </div>
          </div>

          <form className="manager-form" onSubmit={handleSubmit}>
            <div className="form-grid">
              <label>
                Başlık
                <input
                  type="text"
                  name="title"
                  value={formData.title}
                  onChange={handleInputChange}
                  placeholder="Örn: Temmuz Aidatı"
                  disabled={isSaving}
                  required
                />
              </label>

              <label>
                Son Ödeme Tarihi
                <input
                  type="date"
                  name="dueDate"
                  value={formData.dueDate}
                  onChange={handleInputChange}
                  disabled={isSaving}
                  required
                />
              </label>

              {!editingPayment && (
                <>
                  <label>
                    Toplam Tutar
                    <input
                      type="number"
                      name="totalAmount"
                      value={formData.totalAmount}
                      onChange={handleInputChange}
                      placeholder="Örn: 12000"
                      min="1"
                      disabled={isSaving}
                      required
                    />
                  </label>

                  <label>
                    Kapsam
                    <select
                      name="scopeType"
                      value={formData.scopeType}
                      onChange={handleInputChange}
                      disabled={isSaving}
                    >
                      <option value="BLOCK">Blok / Apartman</option>
                      <option value="SITE">Tüm Site</option>
                      <option value="APARTMENTS">Belirli Daireler</option>
                    </select>
                  </label>

                  {formData.scopeType === "SITE" && (
                    <label>
                      Site Seç
                      <select
                        name="siteId"
                        value={formData.siteId}
                        onChange={handleInputChange}
                        disabled={isSaving}
                        required
                      >
                        <option value="">Site seçiniz</option>

                        {siteOptions.map((site) => (
                          <option key={site.id} value={site.id}>
                            {site.name}
                          </option>
                        ))}
                      </select>
                    </label>
                  )}

                  {formData.scopeType === "BLOCK" && (
                    <label>
                      Blok Seç
                      <select
                        name="blockId"
                        value={formData.blockId}
                        onChange={handleInputChange}
                        disabled={isSaving}
                        required
                      >
                        <option value="">Blok seçiniz</option>

                        {blockOptions.map((block) => (
                          <option key={block.id} value={block.id}>
                            {block.siteName} / {block.name}
                          </option>
                        ))}
                      </select>
                    </label>
                  )}
                </>
              )}

              <label className="full-width">
                Açıklama
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  rows="3"
                  placeholder="Ödeme ile ilgili açıklama yazın..."
                  disabled={isSaving}
                />
              </label>
            </div>

            {!editingPayment && formData.scopeType === "APARTMENTS" && (
              <div className="dashboard-panel">
                <span className="section-kicker">Daire Seçimi</span>

                <div className="checkbox-grid">
                  {apartments.map((apartment) => (
                    <label key={apartment.id} className="remember-me">
                      <input
                        type="checkbox"
                        checked={formData.apartmentIds.includes(apartment.id)}
                        onChange={() => toggleApartmentSelection(apartment.id)}
                        disabled={isSaving}
                      />
                      {getApartmentLabel(apartment)}
                    </label>
                  ))}
                </div>
              </div>
            )}

            {!editingPayment && scopedApartments.length > 0 && (
              <div className="dashboard-panel">
                <span className="section-kicker">Muaf Daireler</span>

                <p>
                  Seçilen daireler ödeme hesabına dahil edilmez. Tutar kalan
                  dairelere bölüştürülür.
                </p>

                <div className="checkbox-grid">
                  {scopedApartments.map((apartment) => (
                    <label key={apartment.id} className="remember-me">
                      <input
                        type="checkbox"
                        checked={formData.exemptApartmentIds.includes(apartment.id)}
                        onChange={() => toggleExemptApartment(apartment.id)}
                        disabled={isSaving}
                      />
                      {getApartmentLabel(apartment)}
                    </label>
                  ))}
                </div>
              </div>
            )}

            {!editingPayment && (
              <div className="dashboard-panel">
                <span className="section-kicker">Bildirim</span>

                <label className="remember-me">
                  <input
                    type="checkbox"
                    name="sendEmail"
                    checked={formData.sendEmail}
                    onChange={handleInputChange}
                    disabled={isSaving}
                  />
                  E-posta bildirimi gönder
                </label>

                <label className="remember-me">
                  <input
                    type="checkbox"
                    name="sendSms"
                    checked={formData.sendSms}
                    onChange={handleInputChange}
                    disabled={isSaving}
                  />
                  SMS bildirimi gönder
                </label>
              </div>
            )}

            <div className="form-actions">
              <button
                type="button"
                className="secondary-form-button"
                onClick={closeForm}
                disabled={isSaving}
              >
                Vazgeç
              </button>

              <button
                type="submit"
                className="dashboard-action-button"
                disabled={isSaving}
              >
                {isSaving
                  ? "Kaydediliyor..."
                  : editingPayment
                    ? "Değişiklikleri Kaydet"
                    : "Ödeme Oluştur"}
              </button>
            </div>
          </form>
        </section>
      )}

      <section className="resident-toolbar">
        <div className="resident-search">
          <input
            type="text"
            placeholder="Başlık, açıklama, kapsam veya tutar ara..."
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
          />
        </div>

        <div className="resident-filter">
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
          >
            <option>Tümü</option>
            <option>Bekliyor</option>
            <option>Kısmi Ödendi</option>
            <option>Tamamı Ödendi</option>
            <option>İptal Edildi</option>
          </select>
        </div>
      </section>

      {isLoading ? (
        <div className="dashboard-panel">
          <p>Ödeme kayıtları yükleniyor...</p>
        </div>
      ) : (
        <section className="users-table-card">
          <div className="users-table-wrapper">
            <table className="users-table">
              <thead>
                <tr>
                  <th>Başlık</th>
                  <th>Kapsam</th>
                  <th>Tutar</th>
                  <th>Daire</th>
                  <th>Muaf</th>
                  <th>Son Tarih</th>
                  <th>Durum</th>
                  <th>İşlem</th>
                </tr>
              </thead>

              <tbody>
                {filteredPayments.length > 0 ? (
                  filteredPayments.map((payment) => (
                    <tr key={payment.id}>
                      <td>
                        <div className="table-user-main">
                          <strong>{payment.title}</strong>
                          <span>{payment.description || "Açıklama yok"}</span>
                        </div>
                      </td>

                      <td>{payment.scopeText}</td>
                      <td>{payment.totalAmountText}</td>
                      <td>{payment.allocationCount}</td>
                      <td>{payment.exemptCount}</td>
                      <td>{payment.dueDate}</td>
                      <td>{payment.status}</td>

                      <td>
                        <div className="table-actions">
                          <button
                            type="button"
                            onClick={() => setSelectedPayment(payment)}
                            disabled={isSaving}
                          >
                            <Eye size={16} />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleEdit(payment)}
                            disabled={isSaving}
                          >
                            <Edit size={16} />
                          </button>

                          {payment.status !== "İptal Edildi" &&
                            payment.status !== "Tamamı Ödendi" && (
                              <button
                                type="button"
                                className="danger-table-button"
                                onClick={() => handleCancelPayment(payment)}
                                disabled={isSaving}
                              >
                                <Trash2 size={16} />
                                İptal Et
                              </button>
                            )}
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="8" className="empty-table-message">
                      Arama kriterlerine uygun ödeme bulunamadı.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {selectedPayment && (
        <div className="modal-overlay">
          <section className="details-modal">
            <div className="modal-header">
              <div>
                <span className="section-kicker">Ödeme Detayı</span>
                <h3>{selectedPayment.title}</h3>
              </div>

              <button
                type="button"
                className="modal-close-button"
                onClick={() => setSelectedPayment(null)}
              >
                Kapat
              </button>
            </div>

            <div className="details-list">
              <div>
                <span>Kapsam</span>
                <strong>{selectedPayment.scopeText}</strong>
              </div>

              <div>
                <span>Toplam Tutar</span>
                <strong>{selectedPayment.totalAmountText}</strong>
              </div>

              <div>
                <span>Dağıtılan Daire</span>
                <strong>{selectedPayment.allocationCount}</strong>
              </div>

              <div>
                <span>Muaf Daire</span>
                <strong>{selectedPayment.exemptCount}</strong>
              </div>

              <div>
                <span>Son Ödeme</span>
                <strong>{selectedPayment.dueDate}</strong>
              </div>

              <div>
                <span>Durum</span>
                <strong>{selectedPayment.status}</strong>
              </div>
            </div>

            <div className="details-description">
              <span>Açıklama</span>
              <p>{selectedPayment.description || "Açıklama yok."}</p>
            </div>

            <div className="details-description">
              <span>Daire Bazlı Dağılım</span>

              {selectedPayment.allocations.length > 0 ? (
                <div className="users-table-wrapper">
                  <table className="users-table">
                    <thead>
                      <tr>
                        <th>Daire</th>
                        <th>Tutar</th>
                        <th>Durum</th>
                      </tr>
                    </thead>

                    <tbody>
                      {selectedPayment.allocations.map((allocation) => (
                        <tr key={allocation.id}>
                          <td>
                            {allocation.apartment?.block?.site?.name ?? "Site"} /{" "}
                            {allocation.apartment?.block?.name ?? "Blok"} / Daire{" "}
                            {allocation.apartment?.number ?? "-"}
                          </td>
                          <td>{formatCurrencyFromKurus(allocation.amountKurus)}</td>
                          <td>{allocation.status}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p>Daire dağılımı bulunmuyor.</p>
              )}
            </div>
          </section>
        </div>
      )}
    </DashboardLayout>
  );
}

export default PaymentsPage;
