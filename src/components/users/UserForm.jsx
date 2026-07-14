import { useMemo } from "react";
import { CheckCircle2, X } from "lucide-react";

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
        const residentCount = Number(apartment._count?.residents ?? 0);
        const isCurrentApartment = apartment.id === formData.apartmentId;

        return residentCount === 0 || isCurrentApartment;
      })
      .sort((leftApartment, rightApartment) =>
        compareText(leftApartment.number, rightApartment.number)
      );
  }, [safeApartments, formData.blockId, formData.apartmentId]);

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
      ? "Boş daire seçin"
      : "Bu blokta boş daire bulunamadı";

  return (
    <section className="manager-form-card">
      <div className="manager-form-header">
        <div>
          <span className="section-kicker">
            {isEditMode ? "Sakin Düzenleme" : "Yeni Sakin"}
          </span>

          <h3>{isEditMode ? "Sakin Bilgilerini Düzenle" : "Yeni Sakin Ekle"}</h3>

          <p>
            Önce siteyi ve bloğu seçin. Daire listesinde yalnızca boş daireler
            gösterilir.
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

          <label>
            Telefon
            <input
              type="tel"
              name="phone"
              placeholder="05xx xxx xx xx"
              value={formData.phone}
              onChange={onInputChange}
              autoComplete="tel"
              disabled={isSaving}
            />
          </label>

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
              disabled={isSaving}
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
              disabled={isSaving || !formData.siteId || blockOptions.length === 0}
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

              {apartmentOptions.map((apartment) => (
                <option key={apartment.id} value={apartment.id}>
                  Daire {apartment.number}
                </option>
              ))}
            </select>
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