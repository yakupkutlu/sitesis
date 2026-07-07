import { Filter, Search } from "lucide-react";

function ResidentToolbar({
  searchTerm,
  setSearchTerm,
  roleFilter,
  setRoleFilter,
  statusFilter,
  setStatusFilter,
}) {
  return (
    <section className="resident-toolbar">
      <div className="resident-search">
        <Search size={19} />

        <input
          type="text"
          placeholder="Ad, telefon, e-posta, daire veya blok ara..."
          value={searchTerm}
          onChange={(event) => setSearchTerm(event.target.value)}
        />
      </div>

      <div className="resident-filter">
        <Filter size={18} />

        <select
          value={roleFilter}
          onChange={(event) => setRoleFilter(event.target.value)}
        >
          <option>Tümü</option>
          <option>Kiracı</option>
          <option>Ev Sahibi</option>
        </select>
      </div>

      <div className="resident-filter">
        <Filter size={18} />

        <select
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value)}
        >
          <option>Tümü</option>
          <option>Aktif</option>
          <option>Pasif</option>
          <option>Onay Bekliyor</option>
        </select>
      </div>
    </section>
  );
}

export default ResidentToolbar;
