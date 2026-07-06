import { Filter, Search } from "lucide-react";

const roleOptions = ["Tümü", "Kiracı", "Ev Sahibi"];
const statusOptions = ["Tümü", "Aktif", "Pasif"];

function UserToolbar({
  searchTerm,
  setSearchTerm,
  roleFilter,
  setRoleFilter,
  statusFilter,
  setStatusFilter,
}) {
  return (
    <section className="user-toolbar">
      <div className="user-search">
        <Search size={19} />

        <input
          type="text"
          placeholder="Ad, telefon, e-posta, site, blok veya daire ara..."
          value={searchTerm}
          onChange={(event) => setSearchTerm(event.target.value)}
        />
      </div>

      <div className="user-filter">
        <Filter size={18} />

        <select
          value={roleFilter}
          onChange={(event) => setRoleFilter(event.target.value)}
          aria-label="Kullanıcı rol filtresi"
        >
          {roleOptions.map((option) => (
            <option key={option}>{option}</option>
          ))}
        </select>
      </div>

      <div className="user-filter">
        <Filter size={18} />

        <select
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value)}
          aria-label="Kullanıcı durum filtresi"
        >
          {statusOptions.map((option) => (
            <option key={option}>{option}</option>
          ))}
        </select>
      </div>
    </section>
  );
}

export default UserToolbar;
