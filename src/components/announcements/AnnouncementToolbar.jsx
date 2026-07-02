import { Filter, Search } from "lucide-react";

const targetOptions = [
  "Tümü",
  "Tüm Sistem",
  "Yöneticiler",
  "Sakinler",
  "Belirli Site / Apartman",
  "Belirli Blok",
  "Belirli Daire",
  "Seçili Kişiler",
];

const statusOptions = ["Tümü", "Yayında", "Taslak", "Pasif"];

function AnnouncementToolbar({
  searchTerm,
  setSearchTerm,
  targetFilter,
  setTargetFilter,
  statusFilter,
  setStatusFilter,
}) {
  return (
    <section className="announcement-toolbar">
      <div className="announcement-search">
        <Search size={19} />

        <input
          type="text"
          placeholder="Duyuru başlığı veya içerik ara..."
          value={searchTerm}
          onChange={(event) => setSearchTerm(event.target.value)}
        />
      </div>

      <div className="announcement-filter">
        <Filter size={18} />

        <select
          value={targetFilter}
          onChange={(event) => setTargetFilter(event.target.value)}
          aria-label="Duyuru hedef filtresi"
        >
          {targetOptions.map((option) => (
            <option key={option}>{option}</option>
          ))}
        </select>
      </div>

      <div className="announcement-filter">
        <Filter size={18} />

        <select
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value)}
          aria-label="Duyuru durum filtresi"
        >
          {statusOptions.map((option) => (
            <option key={option}>{option}</option>
          ))}
        </select>
      </div>
    </section>
  );
}

export default AnnouncementToolbar;