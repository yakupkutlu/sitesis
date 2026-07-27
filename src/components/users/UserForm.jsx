import { useMemo } from "react";
import { AlertTriangle, CheckCircle2, Home, Info, UserRound, X } from "lucide-react";

import InternationalPhoneInput from "../common/InternationalPhoneInput";

const residentTypeOptions = [
  { value: "TENANT", label: "Kiracı" },
  { value: "OWNER", label: "Ev Sahibi" },
];

function compareText(leftValue, rightValue) {
  return String(leftValue ?? "").localeCompare(String(rightValue ?? ""), "tr", {
    numeric: true,
    sensitivity: "base",
  });
}

function getApartmentResidents(apartment) {
  return Array.isArray(apartment?.residents) ? apartment.residents : [];
}

function UserForm({
  formData,
  apartments,
  editingUser,
  onInputChange,
  onSubmit,
  onCancel,
  isSaving = false,
}) {
  const safeApartments = useMemo(
    () => (Array.isArray(apartments) ? apartments : []),
    [apartments]
  );

  const isEditMode = Boolean(editingUser);

  const siteOptions = useMemo(() => {
    const sitesById = new Map();

    safeApartments.forEach((apartment) => {
      const site = apartment.block?.site;

      if (site?.id) {
        sitesById.set(site.id, site);
      }
    });

    return Array.from(sitesById.values()).sort((leftSite, rightSite) =>
      compareText(leftSite.name, rightSite.name)
    );
  }, [safeApartments]);

  const blockOptions = useMemo(() => {
    if (!formData.siteId) {
      return [];
    }

    const blocksById = new Map();

    safeApartments.forEach((apartment) => {
      const block = apartment.block;

      if (block?.id && block.site?.id === formData.siteId) {
        blocksById.set(block.id, block);
      }
    });

    return Array.from(blocksById.values()).sort((leftBlock, rightBlock) =>
      compareText(leftBlock.name, rightBlock.name)
    );
  }, [safeApartments, formData.siteId]);

  const apartmentOptions = useMemo(() => {
    if (!formData.blockId) {
      return [];
    }

    return safeApartments
      .filter((apartment) => apartment.block?.id === formData.blockId)
      .filter((apartment) => {
        const residents = getApartmentResidents(apartment);
        const hasOwner = residents.some(
          (resident) => resident.type === "OWNER"
        );
        const hasTenant = residents.some(
          (resident) => resident.type === "TENANT"
        );
        const isCurrentApartment = apartment.id === formData.apartmentId;

        if (isEditMode && isCurrentApartment) {
          return true;
        }

        return formData.residentType === "TENANT"
          ? !hasTenant
          : !hasOwner;
      })
      .sort((leftApartment, rightApartment) =>
        compareText(leftApartment.number, rightApartment.number)
      );
  }, [
    safeApartments,
    formData.blockId,
    formData.apartmentId,
    formData.residentType,
    isEditMode,
  ]);

  const selectedApartment = useMemo(
    () =>
      safeApartments.find(
        (apartment) => apartment.id === formData.apartmentId
      ) ?? null,
    [safeApartments, formData.apartmentId]
  );

  const selectedApartmentResidents = getApartmentResidents(selectedApartment);

  const selectedOwner =
    selectedApartmentResidents.find(
      (resident) => resident.type === "OWNER"
    ) ?? null;

  const selectedApartmentHasOwner = Boolean(selectedOwner);

  const needsOwnerInformation =
    formData.residentType === "TENANT" &&
    Boolean(selectedApartment) &&
    !selectedApartmentHasOwner;

  const usesExistingOwner =
    formData.residentType === "TENANT" &&
    Boolean(selectedApartment) &&
    selectedApartmentHasOwner;

  const sitePlaceholder =
    siteOptions.length > 0 ? "Site seçin" : "Site bulunamadı";

  const blockPlaceholder = !formData.siteId
    ? "Önce site seçin"
    : blockOptions.length > 0
      ? "Blok seçin"
      : "Bu sitede blok bulunamadı";

  const apartmentPlaceholder = !formData.blockId
    ? "Önce blok seçin"
    : apartmentOptions.length > 0
      ? "Uygun daire seçin"
      : formData.residentType === "TENANT"
        ? "Bu blokta kiracısız daire bulunamadı"
        : "Bu blokta ev sahipsiz daire bulunamadı";

  return (
    <section className="manager-form-card">
      <div className="manager-form-header">
        <div>
          <span className="section-kicker">
            {isEditMode ? "Sakin Düzenleme" : "Yeni Sakin"}
          </span>

          <h3>{isEditMode ? "Sakin Bilgilerini Düzenle" : "Yeni Sakin Ekle"}</h3>

          <p>
            Ev sahibi bilgileri biliniyorsa kiracıyla birlikte girilebilir.
            Bilgiler henüz bilinmiyorsa kiracı tek başına kaydedilir ve sarı
            uyarı, ev sahibi eklenene kadar gösterilir.
          </p>
        </div>

        <button
          type="button"
          className="modal-close-button"
          onClick={onCancel}
          aria-label="Sakin formunu kapat"
          disabled={isSaving}
        >
          <X size={20} />
        </button>
      </div>

      {!isEditMode && (
        <div className="resident-link-security-note">
          <Info size={19} />
          <p>
            Yeni hesaplar için geçici şifre en az 8 karakter olmalıdır.
            Kayıtlı aktif bir e-posta kullanılırsa mevcut hesap korunur.
          </p>
        </div>
      )}

      <form className="manager-form" onSubmit={onSubmit}>
        <div className="form-grid">
          <label>
            Ad Soyad
            <input
              type="text"
              name="fullName"
              placeholder="Örn: Ali Can"
              value={formData.fullName}
              onChange={onInputChange}
              disabled={isSaving}
              required
            />
          </label>

          <label>
            E-posta
            <input
              type="email"
              name="email"
              placeholder="ornek@mail.com"
              value={formData.email}
              onChange={onInputChange}
              autoComplete="email"
              disabled={isSaving}
              required
            />
          </label>

          <InternationalPhoneInput
            name="phone"
            label="Telefon"
            value={formData.phone}
            onChange={onInputChange}
            disabled={isSaving}
          />

          <label>
            Şifre
            <input
              type="password"
              name="password"
              placeholder={
                isEditMode
                  ? "Değiştirmek istemiyorsanız boş bırakın"
                  : "En az 8 karakter"
              }
              value={formData.password}
              onChange={onInputChange}
              autoComplete="new-password"
              disabled={isSaving}
              required={!isEditMode}
            />
          </label>

          <label>
            Sakin Türü
            <select
              name="residentType"
              value={formData.residentType}
              onChange={onInputChange}
              disabled={isSaving || isEditMode}
            >
              {residentTypeOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label>
            Site Seç
            <select
              name="siteId"
              value={formData.siteId}
              onChange={onInputChange}
              disabled={isSaving || siteOptions.length === 0}
              required
            >
              <option value="">{sitePlaceholder}</option>

              {siteOptions.map((site) => (
                <option key={site.id} value={site.id}>
                  {site.name}
                </option>
              ))}
            </select>
          </label>

          <label>
            Blok Seç
            <select
              name="blockId"
              value={formData.blockId}
              onChange={onInputChange}
              disabled={
                isSaving || !formData.siteId || blockOptions.length === 0
              }
              required
            >
              <option value="">{blockPlaceholder}</option>

              {blockOptions.map((block) => (
                <option key={block.id} value={block.id}>
                  {block.name}
                </option>
              ))}
            </select>
          </label>

          <label>
            Daire Seç
            <select
              name="apartmentId"
              value={formData.apartmentId}
              onChange={onInputChange}
              disabled={
                isSaving ||
                !formData.blockId ||
                apartmentOptions.length === 0
              }
              required
            >
              <option value="">{apartmentPlaceholder}</option>

              {apartmentOptions.map((apartment) => {
                const residents = getApartmentResidents(apartment);
                const owner = residents.find(
                  (resident) => resident.type === "OWNER"
                );
                const tenant = residents.find(
                  (resident) => resident.type === "TENANT"
                );

                const apartmentStatus = owner?.user?.fullName
                  ? ` — Ev Sahibi: ${owner.user.fullName}`
                  : tenant
                    ? " — Kiracı var / Ev sahibi bilgisi eksik"
                    : " — Boş";

                return (
                  <option key={apartment.id} value={apartment.id}>
                    Daire {apartment.number}{apartmentStatus}
                  </option>
                );
              })}
            </select>
          </label>

          {usesExistingOwner && (
            <div className="resident-owner-status-card full-width">
              <Home size={20} />
              <div>
                <strong>Kayıtlı ev sahibi kullanılacak</strong>
                <p>
                  {selectedOwner?.user?.fullName ?? "Ev sahibi"} daireye bağlı
                  kalacak. Yeni kiracı sakin olarak görüntülenecek.
                </p>
              </div>
            </div>
          )}

          {needsOwnerInformation && (
            <div className="resident-owner-section full-width">
              <div className="resident-owner-section-header">
                <UserRound size={20} />
                <div>
                  <h4>
                    {isEditMode
                      ? "Eksik Ev Sahibi Bilgisini Tamamla"
                      : "Ev Sahibi Hesap Bilgileri — İsteğe Bağlı"}
                  </h4>
                  <p>
                    Ev sahibi bilgileri biliniyorsa ad soyad ve e-posta
                    alanlarını birlikte doldurun. Bilgiler henüz bilinmiyorsa
                    tüm alanları boş bırakabilirsiniz.
                  </p>
                </div>
              </div>

              <div className="resident-owner-warning-card" role="status">
                <AlertTriangle size={20} />
                <div>
                  <strong>Alanlar boş bırakılırsa kiracı yine kaydedilir</strong>
                  <p>
                    Kiracı sisteme giriş yapabilir. Sarı uyarı, aynı daireye ev
                    sahibi eklendiğinde otomatik olarak kaybolur.
                  </p>
                </div>
              </div>

              <div className="form-grid">
                <label>
                  Ev Sahibi Ad Soyad
                  <input
                    type="text"
                    name="ownerFullName"
                    value={formData.ownerFullName}
                    onChange={onInputChange}
                    placeholder="Örn: Ahmet Yılmaz"
                    disabled={isSaving}
                  />
                </label>

                <label>
                  Ev Sahibi E-posta
                  <input
                    type="email"
                    name="ownerEmail"
                    value={formData.ownerEmail}
                    onChange={onInputChange}
                    placeholder="ahmet@example.com"
                    disabled={isSaving}
                  />
                </label>

                <InternationalPhoneInput
                  name="ownerPhone"
                  label="Ev Sahibi Telefon"
                  value={formData.ownerPhone}
                  onChange={onInputChange}
                  disabled={isSaving}
                />

                <label>
                  Ev Sahibi Geçici Şifre
                  <input
                    type="password"
                    name="ownerPassword"
                    value={formData.ownerPassword}
                    onChange={onInputChange}
                    placeholder="Yeni hesap için en az 8 karakter"
                    autoComplete="new-password"
                    disabled={isSaving}
                  />
                  <small>
                    E-posta mevcut aktif bir hesaba aitse boş bırakılabilir.
                  </small>
                </label>
              </div>
            </div>
          )}
        </div>

        <div className="form-actions">
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
            <CheckCircle2 size={18} />
            {isSaving
              ? "Kaydediliyor..."
              : isEditMode
                ? "Değişiklikleri Kaydet"
                : "Sakin Ekle"}
          </button>
        </div>
      </form>
    </section>
  );
}

export default UserForm;
