import { Filter, Search } from "lucide-react";

const categoryOptions = [
  "Tümü",
  "Aidat",
  "Asansör",
  "Temizlik",
  "Güvenlik",
  "Bakım",
  "Diğer",
];

const statusOptions = ["Tümü", "Aktif", "Tamamlandı", "İptal"];

function PaymentToolbar({
  searchTerm,
  setSearchTerm,
  categoryFilter,
  setCategoryFilter,
  statusFilter,
  setStatusFilter,
}) {
  return (
    <section className="payment-toolbar">
      <div className="payment-search">
        <Search size={19} />

        <input
          type="text"
          placeholder="Aidat, gider adı, kategori veya kapsam ara..."
          value={searchTerm}
          onChange={(event) => setSearchTerm(event.target.value)}
        />
      </div>

      <div className="payment-filter">
        <Filter size={18} />

        <select
          value={categoryFilter}
          onChange={(event) => setCategoryFilter(event.target.value)}
          aria-label="Kategori filtresi"
        >
          {categoryOptions.map((option) => (
            <option key={option}>{option}</option>
          ))}
        </select>
      </div>

      <div className="payment-filter">
        <Filter size={18} />

        <select
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value)}
          aria-label="Durum filtresi"
        >
          {statusOptions.map((option) => (
            <option key={option}>{option}</option>
          ))}
        </select>
      </div>
    </section>
  );
}

export default PaymentToolbar;