import { Filter, Search } from "lucide-react";

const blockOptions = ["Tümü", "A Blok", "B Blok", "C Blok"];
const statusOptions = ["Tümü", "Dolu", "Boş", "Bakımda"];

function ApartmentToolbar({
  searchTerm,
  setSearchTerm,
  blockFilter,
  setBlockFilter,
  statusFilter,
  setStatusFilter,
}) {
  return (
    <section className="apartment-toolbar">
      <div className="apartment-search">
        <Search size={19} />

        <input
          type="text"
          placeholder="Daire no, blok, kat, sakin veya durum ara..."
          value={searchTerm}
          onChange={(event) => setSearchTerm(event.target.value)}
        />
      </div>

      <div className="apartment-filter">
        <Filter size={18} />

        <select
          value={blockFilter}
          onChange={(event) => setBlockFilter(event.target.value)}
          aria-label="Blok filtresi"
        >
          {blockOptions.map((option) => (
            <option key={option}>{option}</option>
          ))}
        </select>
      </div>

      <div className="apartment-filter">
        <Filter size={18} />

        <select
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value)}
          aria-label="Daire durum filtresi"
        >
          {statusOptions.map((option) => (
            <option key={option}>{option}</option>
          ))}
        </select>
      </div>
    </section>
  );
}

export default ApartmentToolbar;