import { Filter, Search } from "lucide-react";

function ManagerAnnouncementToolbar({
  searchTerm,
  setSearchTerm,
  typeFilter,
  setTypeFilter,
  statusFilter,
  setStatusFilter,
}) {
  return (
    <section className="manager-announcement-toolbar">
      <div className="manager-announcement-search">
        <Search size={19} />

        <input
          type="text"
          placeholder="Başlık, içerik, hedef veya durum ara..."
          value={searchTerm}
          onChange={(event) => setSearchTerm(event.target.value)}
        />
      </div>

      <div className="manager-announcement-filter">
        <Filter size={18} />

        <select
          value={typeFilter}
          onChange={(event) => setTypeFilter(event.target.value)}
        >
          <option>Tümü</option>
          <option>Genel</option>
          <option>Bakım</option>
          <option>Acil</option>
          <option>Ödeme</option>
          <option>Bilgilendirme</option>
        </select>
      </div>

      <div className="manager-announcement-filter">
        <Filter size={18} />

        <select
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value)}
        >
          <option>Tümü</option>
          <option>Yayında</option>
          <option>Taslak</option>
          <option>Arşivlendi</option>
        </select>
      </div>
    </section>
  );
}

export default ManagerAnnouncementToolbar;