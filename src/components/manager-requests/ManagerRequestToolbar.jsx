import { Filter, Search } from "lucide-react";

const categoryOptions = ["Tümü", "Arıza", "Bakım", "Şikayet", "Güvenlik", "Genel"];
const priorityOptions = ["Tümü", "Yüksek", "Orta", "Düşük"];
const statusOptions = ["Tümü", "Yeni", "İnceleniyor", "Çözüldü", "Reddedildi"];

function ManagerRequestToolbar({
  searchTerm,
  setSearchTerm,
  categoryFilter,
  setCategoryFilter,
  priorityFilter,
  setPriorityFilter,
  statusFilter,
  setStatusFilter,
}) {
  return (
    <section className="manager-request-toolbar">
      <div className="manager-request-search">
        <Search size={19} />

        <input
          type="text"
          placeholder="Başlık, sakin, daire, kategori veya durum ara..."
          value={searchTerm}
          onChange={(event) => setSearchTerm(event.target.value)}
        />
      </div>

      <div className="manager-request-filter">
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

      <div className="manager-request-filter">
        <Filter size={18} />

        <select
          value={priorityFilter}
          onChange={(event) => setPriorityFilter(event.target.value)}
          aria-label="Talep öncelik filtresi"
        >
          {priorityOptions.map((option) => (
            <option key={option}>{option}</option>
          ))}
        </select>
      </div>

      <div className="manager-request-filter">
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
    </section>
  );
}

export default ManagerRequestToolbar;