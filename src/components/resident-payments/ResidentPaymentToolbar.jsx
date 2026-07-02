import { Filter, Search } from "lucide-react";

function ResidentPaymentToolbar({
  searchTerm,
  setSearchTerm,
  statusFilter,
  setStatusFilter,
  categoryFilter,
  setCategoryFilter,
}) {
  return (
    <section className="resident-payment-toolbar">
      <div className="resident-payment-search">
        <Search size={19} />

        <input
          type="text"
          placeholder="Aidat, dönem, kategori veya durum ara..."
          value={searchTerm}
          onChange={(event) => setSearchTerm(event.target.value)}
        />
      </div>

      <div className="resident-payment-filter">
        <Filter size={18} />

        <select
          value={categoryFilter}
          onChange={(event) => setCategoryFilter(event.target.value)}
        >
          <option>Tümü</option>
          <option>Aidat</option>
          <option>Asansör</option>
          <option>Temizlik</option>
          <option>Bakım</option>
          <option>Ek Gider</option>
        </select>
      </div>

      <div className="resident-payment-filter">
        <Filter size={18} />

        <select
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value)}
        >
          <option>Tümü</option>
          <option>Ödendi</option>
          <option>Bekliyor</option>
          <option>Gecikti</option>
          <option>Kısmi Ödendi</option>
        </select>
      </div>
    </section>
  );
}

export default ResidentPaymentToolbar;