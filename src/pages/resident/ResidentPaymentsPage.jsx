import { useMemo, useState } from "react";
import DashboardLayout from "../../layouts/DashboardLayout";
import {
  Bell,
  CreditCard,
  Home,
  MessageSquareText,
  Settings,
  UploadCloud,
} from "lucide-react";

import ResidentPaymentSummaryCards from "../../components/resident-payments/ResidentPaymentSummaryCards";
import ResidentPaymentToolbar from "../../components/resident-payments/ResidentPaymentToolbar";
import ResidentPaymentTable from "../../components/resident-payments/ResidentPaymentTable";
import ResidentPaymentDetailsModal from "../../components/resident-payments/ResidentPaymentDetailsModal";

const navItems = [
  { label: "Panel", path: "/resident/dashboard", icon: Home },
  { label: "Aidat ve Ödemeler", path: "/resident/payments", icon: CreditCard },
  { label: "Dekont Yükle", path: "/resident/receipts", icon: UploadCloud },
  { label: "Duyurular", path: "/resident/announcements", icon: Bell },
  { label: "Talepler", path: "/resident/requests", icon: MessageSquareText },
  { label: "Ayarlar", path: "/resident/settings", icon: Settings },
];

const residentInfo = {
  fullName: "Ali Can",
  siteName: "Mavi Site",
  apartment: "A Blok / Daire 5",
};

const initialPayments = [
  {
    id: 1,
    title: "Temmuz Aidatı",
    category: "Aidat",
    period: "Temmuz 2026",
    amount: "1.250 TL",
    paidAmount: "0 TL",
    remainingAmount: "1.250 TL",
    dueDate: "10.07.2026",
    status: "Bekliyor",
    apartment: "A Blok / Daire 5",
    description: "Temmuz ayı site aidatı.",
    numericAmount: 1250,
    numericPaidAmount: 0,
    numericRemainingAmount: 1250,
  },
  {
    id: 2,
    title: "Asansör Bakım Gideri",
    category: "Asansör",
    period: "Haziran 2026",
    amount: "500 TL",
    paidAmount: "250 TL",
    remainingAmount: "250 TL",
    dueDate: "20.06.2026",
    status: "Kısmi Ödendi",
    apartment: "A Blok / Daire 5",
    description: "A Blok asansör bakım gideri.",
    numericAmount: 500,
    numericPaidAmount: 250,
    numericRemainingAmount: 250,
  },
  {
    id: 3,
    title: "Haziran Aidatı",
    category: "Aidat",
    period: "Haziran 2026",
    amount: "1.250 TL",
    paidAmount: "1.250 TL",
    remainingAmount: "0 TL",
    dueDate: "10.06.2026",
    status: "Ödendi",
    apartment: "A Blok / Daire 5",
    description: "Haziran ayı site aidatı.",
    numericAmount: 1250,
    numericPaidAmount: 1250,
    numericRemainingAmount: 0,
  },
  {
    id: 4,
    title: "Ortak Alan Temizlik Gideri",
    category: "Temizlik",
    period: "Mayıs 2026",
    amount: "300 TL",
    paidAmount: "0 TL",
    remainingAmount: "300 TL",
    dueDate: "25.05.2026",
    status: "Gecikti",
    apartment: "A Blok / Daire 5",
    description: "Ortak alan temizlik gideri.",
    numericAmount: 300,
    numericPaidAmount: 0,
    numericRemainingAmount: 300,
  },
];

function formatCurrency(value) {
  return `${value.toLocaleString("tr-TR")} TL`;
}

function ResidentPaymentsPage() {
  const [payments] = useState(initialPayments);
  const [selectedPayment, setSelectedPayment] = useState(null);

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("Tümü");
  const [categoryFilter, setCategoryFilter] = useState("Tümü");

  const summary = useMemo(() => {
    const totalDebt = payments.reduce(
      (total, payment) => total + payment.numericRemainingAmount,
      0
    );

    const paidAmount = payments.reduce(
      (total, payment) => total + payment.numericPaidAmount,
      0
    );

    const pendingAmount = payments
      .filter((payment) => payment.status !== "Ödendi")
      .reduce((total, payment) => total + payment.numericRemainingAmount, 0);

    const lateCount = payments.filter(
      (payment) => payment.status === "Gecikti"
    ).length;

    return {
      totalDebt: formatCurrency(totalDebt),
      paidAmount: formatCurrency(paidAmount),
      pendingAmount: formatCurrency(pendingAmount),
      lateCount,
    };
  }, [payments]);

  const filteredPayments = useMemo(() => {
    return payments.filter((payment) => {
      const searchValue = searchTerm.toLowerCase();

      const matchesSearch =
        payment.title.toLowerCase().includes(searchValue) ||
        payment.category.toLowerCase().includes(searchValue) ||
        payment.period.toLowerCase().includes(searchValue) ||
        payment.status.toLowerCase().includes(searchValue) ||
        payment.description.toLowerCase().includes(searchValue);

      const matchesStatus =
        statusFilter === "Tümü" ? true : payment.status === statusFilter;

      const matchesCategory =
        categoryFilter === "Tümü" ? true : payment.category === categoryFilter;

      return matchesSearch && matchesStatus && matchesCategory;
    });
  }, [payments, searchTerm, statusFilter, categoryFilter]);

  return (
    <DashboardLayout
      roleTitle="Aidat ve Ödemeler"
      roleBadge="Sakin"
      userName={residentInfo.fullName}
      navItems={navItems}
      theme="resident"
    >
      <div className="dashboard-page-header">
        <div>
          <span className="section-kicker">Ödeme Takibi</span>
          <h2>Aidat ve Ödemeler</h2>
          <p>
            {residentInfo.siteName} / {residentInfo.apartment} için aidat,
            ortak gider ve ödeme durumlarınızı buradan takip edebilirsiniz.
          </p>
        </div>
      </div>

      <ResidentPaymentSummaryCards summary={summary} />

      <ResidentPaymentToolbar
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        statusFilter={statusFilter}
        setStatusFilter={setStatusFilter}
        categoryFilter={categoryFilter}
        setCategoryFilter={setCategoryFilter}
      />

      <ResidentPaymentTable
        payments={filteredPayments}
        onView={setSelectedPayment}
      />

      <ResidentPaymentDetailsModal
        payment={selectedPayment}
        onClose={() => setSelectedPayment(null)}
      />
    </DashboardLayout>
  );
}

export default ResidentPaymentsPage;