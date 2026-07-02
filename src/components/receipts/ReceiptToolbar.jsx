import { Filter, Search } from "lucide-react";

const statusOptions = [
  "Tümü",
  "Onay Bekliyor",
  "Onaylandı",
  "Reddedildi",
  "Eşleşme Bulunamadı",
];

function ReceiptToolbar({
  searchTerm,
  setSearchTerm,
  statusFilter,
  setStatusFilter,
}) {
  return (
    <section className="receipt-toolbar">
      <div className="receipt-search">
        <Search size={19} />

        <input
          type="text"
          placeholder="Ad soyad, daire, tutar, açıklama veya durum ara..."
          value={searchTerm}
          onChange={(event) => setSearchTerm(event.target.value)}
        />
      </div>

      <div className="receipt-filter">
        <Filter size={18} />

        <select
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value)}
          aria-label="Dekont durum filtresi"
        >
          {statusOptions.map((option) => (
            <option key={option}>{option}</option>
          ))}
        </select>
      </div>
    </section>
  );
}

export default ReceiptToolbar;