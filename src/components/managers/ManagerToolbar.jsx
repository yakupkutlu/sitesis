import { Filter, Search } from "lucide-react";

const statusOptions = ["Tümü", "Aktif", "Pasif"];

function ManagerToolbar({
  searchTerm,
  setSearchTerm,
  statusFilter,
  setStatusFilter,
}) {
  return (
    <section className="manager-toolbar">
      <div className="manager-search">
        <Search size={19} />

        <input
          type="text"
          placeholder="Yönetici adı, e-posta, telefon veya site ara..."
          value={searchTerm}
          onChange={(event) => setSearchTerm(event.target.value)}
        />
      </div>

      <div className="manager-filter">
        <Filter size={18} />

        <select
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value)}
          aria-label="Yönetici durum filtresi"
        >
          {statusOptions.map((option) => (
            <option key={option}>{option}</option>
          ))}
        </select>
      </div>
    </section>
  );
}

export default ManagerToolbar;