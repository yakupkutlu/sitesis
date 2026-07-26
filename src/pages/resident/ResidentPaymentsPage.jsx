import { useAuth } from "../../hooks/useAuth";
import { useEffect, useMemo, useState } from "react";
import DashboardLayout from "../../layouts/DashboardLayout";
import { residentNavItems } from "../../config/residentNavigation";
import ResidentPaymentSummaryCards from "../../components/resident-payments/ResidentPaymentSummaryCards";
import ResidentPaymentToolbar from "../../components/resident-payments/ResidentPaymentToolbar";
import ResidentPaymentTable from "../../components/resident-payments/ResidentPaymentTable";
import ResidentPaymentDetailsModal from "../../components/resident-payments/ResidentPaymentDetailsModal";
import ResidentBankAccountCard from "../../components/resident-payments/ResidentBankAccountCard";

import { getMyPaymentAllocations } from "../../api/paymentBatchesApi";


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
  if (allocation.status === "CANCELLED") {
    return "İptal Edildi";
  }

  if (allocation.status === "PAID") {
    return "Ödendi";
  }

  const hasPendingReceipt = Array.isArray(allocation.receipts)
    ? allocation.receipts.some((receipt) => receipt.status === "PENDING")
    : false;

  if (hasPendingReceipt) {
    return "Dekont Onayı Bekliyor";
  }

  if (allocation.status === "PARTIAL") {
    return "Kısmi Ödendi";
  }

  const dueDate = allocation.paymentBatch?.dueDate;

  if (isPastDueDate(dueDate)) {
    return "Gecikti";
  }

  return "ödeme Bekliyor";
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
  const accountingExpense = batch.accountingExpense ?? null;
  const isExpense = Boolean(accountingExpense?.id);
  const isCancelled = allocation.status === "CANCELLED";
  const totalAmountKurus = isCancelled
    ? 0
    : Math.max(0, Number(allocation.amountKurus) || 0);
  const paidAmountKurus = isCancelled
    ? 0
    : Math.max(0, Number(allocation.paidAmountKurus) || 0);
  const remainingAmountKurus = Math.max(
    totalAmountKurus - paidAmountKurus,
    0
  );
  const overpaymentAmountKurus = Math.max(
    paidAmountKurus - totalAmountKurus,
    0
  );

  return {
    id: allocation.id,
    title: batch.title ?? "Ödeme",
    category: isExpense ? "Gider" : "Aidat",
    isExpense,
    accountingExpenseId: accountingExpense?.id ?? null,
    period: formatDate(batch.createdAt),
    amount: formatCurrencyFromKurus(totalAmountKurus),
    paidAmount: formatCurrencyFromKurus(paidAmountKurus),
    remainingAmount: formatCurrencyFromKurus(remainingAmountKurus),
    overpaymentAmount: formatCurrencyFromKurus(overpaymentAmountKurus),
    dueDate: formatDate(batch.dueDate),
    status: getAllocationStatus(allocation),
    apartment: getApartmentText(allocation),
    description: batch.description ?? "Açıklama yok.",
    numericAmount: totalAmountKurus / 100,
    numericPaidAmount: paidAmountKurus / 100,
    numericRemainingAmount: remainingAmountKurus / 100,
    numericOverpaymentAmount: overpaymentAmountKurus / 100,
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
  const { user, selectedApartment, selectedApartmentId } = useAuth();

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

  const aidatPayments = useMemo(
    () => payments.filter((payment) => !payment.isExpense),
    [payments],
  );

  const summary = useMemo(() => {
    const totalDebt = payments.reduce(
      (total, payment) => total + payment.numericAmount,
      0
    );

    const paidAmount = payments.reduce(
      (total, payment) => total + payment.numericPaidAmount,
      0
    );

    const remainingAmount = payments.reduce(
      (total, payment) => total + payment.numericRemainingAmount,
      0
    );

    const overpaymentAmount = payments.reduce(
      (total, payment) => total + payment.numericOverpaymentAmount,
      0
    );

    return {
      totalDebt: formatCurrency(totalDebt),
      paidAmount: formatCurrency(paidAmount),
      remainingAmount: formatCurrency(remainingAmount),
      overpaymentAmount: formatCurrency(overpaymentAmount),
    };
  }, [payments]);

  const filteredPayments = useMemo(() => {
    return aidatPayments.filter((payment) => {
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
  }, [aidatPayments, searchTerm, statusFilter, categoryFilter]);

  return (
    <DashboardLayout
      roleTitle="Aidat ve Ödemeler"
      roleBadge="Sakin"
      userName={user?.fullName ?? "Sakin"}
      navItems={residentNavItems}
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

      <ResidentBankAccountCard
        selectedApartmentId={
          selectedApartment?.apartment?.id ?? null
        }
      />

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
