import { Filter, Search } from "lucide-react";

const typeOptions = ["Tümü", "Site", "Tek Apartman", "Rezidans"];

function BuildingToolbar({
  searchTerm,
  setSearchTerm,
  typeFilter,
  setTypeFilter,
}) {
  return (
    <section className="buildings-toolbar">
      <div className="toolbar-search">
        <Search size={19} />

        <input
          type="text"
          placeholder="Site, apartman, adres veya yönetici ara..."
          value={searchTerm}
          onChange={(event) => setSearchTerm(event.target.value)}
        />
      </div>

      <div className="toolbar-filter">
        <Filter size={18} />

        <select
          value={typeFilter}
          onChange={(event) => setTypeFilter(event.target.value)}
          aria-label="Yapı türü filtresi"
        >
          {typeOptions.map((option) => (
            <option key={option}>{option}</option>
          ))}
        </select>
      </div>
    </section>
  );
}

export default BuildingToolbar;