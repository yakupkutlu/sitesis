import { Filter, Search } from "lucide-react";

function ResidentAnnouncementToolbar({
  searchTerm,
  setSearchTerm,
  typeFilter,
  setTypeFilter,
  readFilter,
  setReadFilter,
}) {
  return (
    <section className="resident-announcement-toolbar">
      <div className="resident-announcement-search">
        <Search size={19} />

        <input
          type="text"
          placeholder="Başlık, içerik veya duyuru tipi ara..."
          value={searchTerm}
          onChange={(event) => setSearchTerm(event.target.value)}
        />
      </div>

      <div className="resident-announcement-filter">
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

      <div className="resident-announcement-filter">
        <Filter size={18} />

        <select
          value={readFilter}
          onChange={(event) => setReadFilter(event.target.value)}
        >
          <option>Tümü</option>
          <option>Okunmamış</option>
          <option>Okundu</option>
        </select>
      </div>
    </section>
  );
}

export default ResidentAnnouncementToolbar;