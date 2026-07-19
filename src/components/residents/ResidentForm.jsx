import { useMemo } from "react";
import { Info, X } from "lucide-react";

import InternationalPhoneInput from "../common/InternationalPhoneInput";

function compareText(leftValue, rightValue) {
  return String(leftValue ?? "").localeCompare(String(rightValue ?? ""), "tr", {
    numeric: true,
    sensitivity: "base",
  });
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
        const residentCount = Number(apartment._count?.residents ?? 0);
        const isCurrentApartment = apartment.id === formData.apartmentId;

        return residentCount === 0 || isCurrentApartment;
      })
      .sort((leftApartment, rightApartment) =>
        compareText(leftApartment.number, rightApartment.number)
      );
  }, [safeApartments, formData.blockId, formData.apartmentId]);

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
      ? "Boş daire seçiniz"
      : "Bu blokta boş daire bulunamadı";

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
            Yeni bir sakin hesabı oluşturabilir veya mevcut yönetici / süper
            admin hesabını rolünü ve giriş bilgilerini değiştirmeden daireye
            sakin olarak bağlayabilirsiniz.
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
            E-posta mevcut bir yönetici veya süper admin hesabına aitse mevcut
            hesap kullanılır; rol, profil ve şifre değiştirilmez. Yeni bir sakin
            hesabı oluşturulacaksa geçici şifre zorunludur.
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
            Rol
            <select
              name="type"
              value={formData.type}
              onChange={onInputChange}
              disabled={isSaving}
            >
              <option value="TENANT">Kiracı</option>
              <option value="OWNER">Ev Sahibi</option>
            </select>
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

              {apartmentOptions.map((apartment) => (
                <option key={apartment.id} value={apartment.id}>
                  Daire {apartment.number}
                </option>
              ))}
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
                    : "Yönetici / süper admin şifresi buradan değiştirilemez"
                  : "Yeni hesap için en az 8 karakter"
              }
              disabled={isSaving || !canChangeLinkedPassword}
            />
            {!editingResident && (
              <small>
                Mevcut yönetici, süper admin veya aktif ve henüz daireye bağlı
                olmayan kullanıcı için boş bırakabilirsiniz.
              </small>
            )}
          </label>

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
