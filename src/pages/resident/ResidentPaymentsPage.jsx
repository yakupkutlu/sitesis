import { useAuth } from "../../hooks/useAuth";
import { useEffect, useMemo, useState } from "react";
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

import { getMyPaymentAllocations } from "../../api/paymentBatchesApi";


const navItems = [
  { label: "Panel", path: "/resident/dashboard", icon: Home },
  { label: "Aidat ve Ödemeler", path: "/resident/payments", icon: CreditCard },
  { label: "Dekont Yükle", path: "/resident/receipts", icon: UploadCloud },
  { label: "Duyurular", path: "/resident/announcements", icon: Bell },
  { label: "Talepler", path: "/resident/requests", icon: MessageSquareText },
  { label: "Ayarlar", path: "/resident/settings", icon: Settings },
];

function getDataArray(result) {
  const data = result?.data ?? result;

  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.allocations)) return data.allocations;
  if (Array.isArray(data?.paymentAllocations)) return data.paymentAllocations;

  return [];
}

function formatCurrencyFromKurus(value) {
  return `${((Number(value) || 0) / 100).toLocaleString("tr-TR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} TL`;
}

function formatDate(value) {
  if (!value) return "-";

  try {
    return new Date(value).toLocaleDateString("tr-TR");
  } catch {
    return "-";
  }
}

function normalizeText(value) {
  return String(value ?? "").toLocaleLowerCase("tr-TR").trim();
}

function isPastDueDate(value) {
  if (!value) return false;

  const dueDate = new Date(value);
  const today = new Date();

  dueDate.setHours(0, 0, 0, 0);
  today.setHours(0, 0, 0, 0);

  return dueDate < today;
}

function getAllocationStatus(allocation) {
  if (allocation.status === "PAID") {
    return "Ödendi";
  }

  if (allocation.status === "CANCELLED") {
    return "İptal Edildi";
  }

  const hasPendingReceipt = Array.isArray(allocation.receipts)
    ? allocation.receipts.some((receipt) => receipt.status === "PENDING")
    : false;

  if (hasPendingReceipt) {
    return "Dekont Bekliyor";
  }

  const dueDate = allocation.paymentBatch?.dueDate;

  if (isPastDueDate(dueDate)) {
    return "Gecikti";
  }

  return "Bekliyor";
}

function getApartmentText(allocation) {
  const apartment = allocation.apartment ?? {};
  const block = apartment.block ?? {};
  const site = block.site ?? {};

  return `${site.name ?? "Site"} / ${block.name ?? "Blok"} / Daire ${
    apartment.number ?? "-"
  }`;
}

function mapAllocationToPayment(allocation) {
  const batch = allocation.paymentBatch ?? {};
  const amountText = formatCurrencyFromKurus(allocation.amountKurus);
  const status = getAllocationStatus(allocation);
  const isPaid = allocation.status === "PAID";
  const isCancelled = allocation.status === "CANCELLED";
  const shouldCountAsDebt = !isPaid && !isCancelled;

  return {
    id: allocation.id,
    title: batch.title ?? "Ödeme",
    category: "Aidat / Gider",
    period: formatDate(batch.createdAt),
    amount: amountText,
    paidAmount: isPaid ? amountText : "0 TL",
    remainingAmount: shouldCountAsDebt ? amountText : "0 TL",
    dueDate: formatDate(batch.dueDate),
    status,
    apartment: getApartmentText(allocation),
    description: batch.description ?? "Açıklama yok.",
    numericAmount: (Number(allocation.amountKurus) || 0) / 100,
    numericPaidAmount: isPaid ? (Number(allocation.amountKurus) || 0) / 100 : 0,
    numericRemainingAmount: shouldCountAsDebt
      ? (Number(allocation.amountKurus) || 0) / 100
      : 0,
    paymentAllocationId: allocation.id,
    receipts: allocation.receipts ?? [],
    raw: allocation,
  };
}

function formatCurrency(value) {
  return `${Number(value || 0).toLocaleString("tr-TR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} TL`;
}

function ResidentPaymentsPage() {
  const { user, selectedApartmentId } = useAuth();

  const [payments, setPayments] = useState([]);
  const [selectedPayment, setSelectedPayment] = useState(null);

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("Tümü");
  const [categoryFilter, setCategoryFilter] = useState("Tümü");

  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    let isMounted = true;

    async function loadPayments() {
      try {
        setIsLoading(true);
        setErrorMessage("");
        setPayments([]);
        setSelectedPayment(null);

        const result = await getMyPaymentAllocations();

        if (isMounted) {
          setPayments(getDataArray(result).map(mapAllocationToPayment));
        }
      } catch {
        if (isMounted) {
          setErrorMessage("Ödeme kayıtları alınamadı.");
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadPayments();

    return () => {
      isMounted = false;
    };
  }, [selectedApartmentId]);

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
      const searchValue = normalizeText(searchTerm);

      const searchableText = [
        payment.title,
        payment.category,
        payment.period,
        payment.status,
        payment.description,
        payment.apartment,
      ]
        .join(" ")
        .toLocaleLowerCase("tr-TR");

      const matchesSearch = searchableText.includes(searchValue);
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
      userName={user?.fullName ?? "Sakin"}
      navItems={navItems}
      theme="resident"
    >
      <div className="dashboard-page-header">
        <div>
          <span className="section-kicker">Ödeme Takibi</span>

          <h2>Aidat ve Ödemeler</h2>

          <p>
            Dairenize ait aidat, ortak gider ve ödeme durumlarını buradan takip
            edebilirsiniz.
          </p>
        </div>
      </div>

      {errorMessage && (
        <div className="login-error-message">
          <p>{errorMessage}</p>
        </div>
      )}

      <ResidentPaymentSummaryCards summary={summary} />

      <ResidentPaymentToolbar
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        statusFilter={statusFilter}
        setStatusFilter={setStatusFilter}
        categoryFilter={categoryFilter}
        setCategoryFilter={setCategoryFilter}
      />

      {isLoading ? (
        <div className="dashboard-panel">
          <p>Ödeme kayıtları yükleniyor...</p>
        </div>
      ) : (
        <ResidentPaymentTable
          payments={filteredPayments}
          onView={setSelectedPayment}
        />
      )}

      <ResidentPaymentDetailsModal
        payment={selectedPayment}
        onClose={() => setSelectedPayment(null)}
      />
    </DashboardLayout>
  );
}

export default ResidentPaymentsPage;

