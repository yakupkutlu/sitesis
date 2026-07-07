import { Filter, Search } from "lucide-react";

function ApartmentToolbar({
  searchTerm,
  setSearchTerm,
  blockFilter,
  setBlockFilter,
  blockOptions,
  isLoading = false,
}) {
  const safeBlockOptions = blockOptions || [];

  return (
    <section className="apartment-toolbar">
      <div className="apartment-search">
        <Search size={19} />

        <input
          type="text"
          placeholder="Daire no veya açıklama ara..."
          value={searchTerm}
          onChange={(event) => setSearchTerm(event.target.value)}
          disabled={isLoading}
        />
      </div>

      <div className="apartment-filter">
        <Filter size={18} />

        <select
          value={blockFilter}
          onChange={(event) => setBlockFilter(event.target.value)}
          aria-label="Blok filtresi"
          disabled={isLoading}
        >
          <option value="ALL_BLOCKS">Tüm bloklar</option>

          {safeBlockOptions.map((block) => (
            <option key={block.id} value={block.id}>
              {block.site?.name ? `${block.site.name} / ` : ""}
              {block.name}
            </option>
          ))}
        </select>
      </div>
    </section>
  );
}

export default ApartmentToolbar;
