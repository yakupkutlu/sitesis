import { Filter, Search } from "lucide-react";

const targetOptions = [
  { value: "ALL_TARGETS", label: "Tümü" },
  { value: "ALL", label: "Tüm Sistem" },
  { value: "SITE", label: "Belirli Site" },
  { value: "BLOCK", label: "Belirli Blok" },
  { value: "APARTMENT", label: "Belirli Daire" },
];

const statusOptions = [
  { value: "ALL_STATUSES", label: "Tümü" },
  { value: "ACTIVE", label: "Yayında" },
  { value: "ARCHIVED", label: "Arşiv" },
];

function AnnouncementToolbar({
  searchTerm,
  setSearchTerm,
  targetTypeFilter,
  setTargetTypeFilter,
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
          value={targetTypeFilter}
          onChange={(event) => setTargetTypeFilter(event.target.value)}
          aria-label="Duyuru hedef filtresi"
        >
          {targetOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
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
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
    </section>
  );
}

export default AnnouncementToolbar;
