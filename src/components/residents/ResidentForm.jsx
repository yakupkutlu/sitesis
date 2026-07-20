import { useMemo } from "react";
import { Home, Info, UserRound, X } from "lucide-react";

import InternationalPhoneInput from "../common/InternationalPhoneInput";

function compareText(leftValue, rightValue) {
  return String(leftValue ?? "").localeCompare(String(rightValue ?? ""), "tr", {
    numeric: true,
    sensitivity: "base",
  });
}

function getApartmentResidents(apartment) {
  return Array.isArray(apartment?.residents) ? apartment.residents : [];
}

function ResidentForm({
  formData,
  apartments = [],
  editingResident,
  onInputChange,
  onSubmit,
  onCancel,
  isSaving = false,
}) {
  const safeApartments = useMemo(
    () => (Array.isArray(apartments) ? apartments : []),
    [apartments]
  );

  const linkedAccountRole = editingResident?.raw?.user?.role ?? null;
  const canChangeLinkedPassword =
    !editingResident || linkedAccountRole === "RESIDENT";

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
        const hasOwner = residents.some((resident) => resident.type === "OWNER");
        const hasTenant = residents.some(
          (resident) => resident.type === "TENANT"
        );
        const isCurrentApartment = apartment.id === formData.apartmentId;

        if (editingResident && isCurrentApartment) {
          return true;
        }

        if (formData.type === "TENANT") {
          return !hasTenant;
        }

        return !hasOwner;
      })
      .sort((leftApartment, rightApartment) =>
        compareText(leftApartment.number, rightApartment.number)
      );
  }, [
    safeApartments,
    formData.blockId,
    formData.apartmentId,
    formData.type,
    editingResident,
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
    selectedApartmentResidents.find((resident) => resident.type === "OWNER") ??
    null;

  const selectedApartmentHasOwner = Boolean(selectedOwner);

  const needsOwnerInformation =
    !editingResident &&
    formData.type === "TENANT" &&
    Boolean(selectedApartment) &&
    !selectedApartmentHasOwner;

  const usesExistingOwner =
    !editingResident &&
    formData.type === "TENANT" &&
    Boolean(selectedApartment) &&
    selectedApartmentHasOwner;

  const sitePlaceholder =
    siteOptions.length > 0 ? "Site seçiniz" : "Yetkili site bulunamadı";

  const blockPlaceholder = !formData.siteId
    ? "Önce site seçiniz"
    : blockOptions.length > 0
      ? "Blok seçiniz"
      : "Bu sitede yetkili blok bulunamadı";

  const apartmentPlaceholder = !formData.blockId
    ? "Önce blok seçiniz"
    : apartmentOptions.length > 0
      ? "Uygun daire seçiniz"
      : formData.type === "TENANT"
        ? "Bu blokta kiracısız daire bulunamadı"
        : "Bu blokta ev sahipsiz daire bulunamadı";

  return (
    <section className="resident-form-card">
      <div className="resident-form-header">
        <div>
          <span className="section-kicker">
            {editingResident ? "Sakin Güncelle" : "Yeni Sakin"}
          </span>

          <h3>
            {editingResident ? "Sakin Bilgilerini Düzenle" : "Sakin Ekle"}
          </h3>

          <p>
            Ev sahibi ve kiracı hesapları ayrı tutulur. Kiracı varsa sakinler
            listesinde kiracı, kiracı yoksa ev sahibi görüntülenir.
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

      {!editingResident && (
        <div className="resident-link-security-note">
          <Info size={19} />
          <p>
            Kayıtlı bir e-posta kullanılırsa mevcut hesap korunur. Yeni hesap
            oluşturulacaksa en az 8 karakterli geçici şifre girilmelidir.
          </p>
        </div>
      )}

      <form className="resident-form" onSubmit={onSubmit}>
        <div className="form-grid">
          <label>
            Ad Soyad
            <input
              type="text"
              name="fullName"
              value={formData.fullName}
              onChange={onInputChange}
              placeholder="Örn: Ali Can"
              required
              disabled={isSaving || Boolean(editingResident)}
            />
          </label>

          <label>
            Sakin Türü
            <select
              name="type"
              value={formData.type}
              onChange={onInputChange}
              disabled={isSaving || Boolean(editingResident)}
            >
              <option value="TENANT">Kiracı</option>
              <option value="OWNER">Ev Sahibi</option>
            </select>
          </label>

          <InternationalPhoneInput
            name="phone"
            label="Telefon"
            value={formData.phone}
            onChange={onInputChange}
            disabled={isSaving || Boolean(editingResident)}
          />

          <label>
            E-posta
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={onInputChange}
              placeholder="Örn: ali@example.com"
              required
              disabled={isSaving || Boolean(editingResident)}
            />
          </label>

          <label>
            {editingResident ? "Yeni Şifre" : "Geçici Şifre"}
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={onInputChange}
              placeholder={
                editingResident
                  ? canChangeLinkedPassword
                    ? "Değiştirmek istemiyorsanız boş bırakın"
                    : "Bu hesabın şifresi buradan değiştirilemez"
                  : "Yeni hesap için en az 8 karakter"
              }
              disabled={isSaving || !canChangeLinkedPassword}
            />
            {!editingResident && (
              <small>
                E-posta mevcut aktif bir hesaba aitse boş bırakılabilir.
              </small>
            )}
          </label>

          <label>
            Site
            <select
              name="siteId"
              value={formData.siteId}
              onChange={onInputChange}
              required
              disabled={isSaving || siteOptions.length === 0}
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
            Blok
            <select
              name="blockId"
              value={formData.blockId}
              onChange={onInputChange}
              required
              disabled={
                isSaving || !formData.siteId || blockOptions.length === 0
              }
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
            Daire
            <select
              name="apartmentId"
              value={formData.apartmentId}
              onChange={onInputChange}
              required
              disabled={
                isSaving ||
                !formData.blockId ||
                apartmentOptions.length === 0
              }
            >
              <option value="">{apartmentPlaceholder}</option>

              {apartmentOptions.map((apartment) => {
                const residents = getApartmentResidents(apartment);
                const owner = residents.find(
                  (resident) => resident.type === "OWNER"
                );

                return (
                  <option key={apartment.id} value={apartment.id}>
                    Daire {apartment.number}
                    {owner?.user?.fullName
                      ? ` — Ev Sahibi: ${owner.user.fullName}`
                      : " — Boş"}
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
                  {selectedOwner?.user?.fullName ?? "Ev sahibi"} hesabı daireye
                  bağlı kalacak. Yeni eklenen kiracı sakin olarak
                  görüntülenecek.
                </p>
              </div>
            </div>
          )}

          {needsOwnerInformation && (
            <div className="resident-owner-section full-width">
              <div className="resident-owner-section-header">
                <UserRound size={20} />
                <div>
                  <h4>Ev Sahibi Hesap Bilgileri</h4>
                  <p>
                    Seçilen dairede kayıtlı ev sahibi bulunmadığı için bu
                    bilgiler zorunludur.
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
                    required
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
                    placeholder="Örn: ahmet@example.com"
                    required
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
                    disabled={isSaving}
                  />
                  <small>
                    E-posta mevcut aktif bir hesaba aitse boş bırakılabilir.
                  </small>
                </label>
              </div>
            </div>
          )}

          <label className="full-width">
            Not
            <textarea
              name="note"
              value={formData.note}
              onChange={onInputChange}
              rows="3"
              placeholder="Bu not şimdilik sadece form içindir, backend'e kaydedilmeyecek."
              disabled={isSaving}
            />
          </label>
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
            {isSaving
              ? "Kaydediliyor..."
              : editingResident
                ? "Sakini Güncelle"
                : "Sakini Kaydet"}
          </button>
        </div>
      </form>
    </section>
  );
}

export default ResidentForm;
