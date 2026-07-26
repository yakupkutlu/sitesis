import { Filter, Search } from "lucide-react";

const statusOptions = [
  "Tümü",
  "ödeme Bekliyor",
  "Dekont Onayı Bekliyor",
  "Gecikti",
  "Ödendi",
  "İptal Edildi",
];

function ResidentPaymentToolbar({
  searchTerm,
  setSearchTerm,
  statusFilter,
  setStatusFilter,
}) {
  return (
    <section className="resident-toolbar">
      <div className="resident-search">
        <Search size={19} />

        <input
          type="text"
          placeholder="Başlık, açıklama, daire veya durum ara..."
          value={searchTerm}
          onChange={(event) => setSearchTerm(event.target.value)}
        />
      </div>

      <div className="resident-filter">
        <Filter size={18} />

        <select
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value)}
          aria-label="Ödeme durum filtresi"
        >
          {statusOptions.map((option) => (
            <option key={option}>{option}</option>
          ))}
        </select>
      </div>
    </section>
  );
}

export default ResidentPaymentToolbar;
