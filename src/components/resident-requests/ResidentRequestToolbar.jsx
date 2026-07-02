import { Filter, Search } from "lucide-react";

const statusOptions = ["Tümü", "Yeni", "İnceleniyor", "Çözüldü", "Reddedildi"];

const categoryOptions = [
  "Tümü",
  "Arıza",
  "Bakım",
  "Temizlik",
  "Güvenlik",
  "Otopark",
  "Diğer",
];

function ResidentRequestToolbar({
  searchTerm,
  setSearchTerm,
  statusFilter,
  setStatusFilter,
  categoryFilter,
  setCategoryFilter,
}) {
  return (
    <section className="resident-request-toolbar">
      <div className="resident-request-search">
        <Search size={19} />

        <input
          type="text"
          placeholder="Talep başlığı, açıklama veya kategori ara..."
          value={searchTerm}
          onChange={(event) => setSearchTerm(event.target.value)}
        />
      </div>

      <div className="resident-request-filter">
        <Filter size={18} />

        <select
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value)}
          aria-label="Talep durum filtresi"
        >
          {statusOptions.map((option) => (
            <option key={option}>{option}</option>
          ))}
        </select>
      </div>

      <div className="resident-request-filter">
        <Filter size={18} />

        <select
          value={categoryFilter}
          onChange={(event) => setCategoryFilter(event.target.value)}
          aria-label="Talep kategori filtresi"
        >
          {categoryOptions.map((option) => (
            <option key={option}>{option}</option>
          ))}
        </select>
      </div>
    </section>
  );
}

export default ResidentRequestToolbar;