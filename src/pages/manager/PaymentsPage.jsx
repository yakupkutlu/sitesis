import { useMemo, useState } from "react";
import DashboardLayout from "../../layouts/DashboardLayout";
import {
  BarChart3,
  Bell,
  CreditCard,
  Home,
  MessageSquareText,
  Plus,
  Settings,
  UploadCloud,
  UserRound,
} from "lucide-react";

import PaymentToolbar from "../../components/payments/PaymentToolbar";
import PaymentForm from "../../components/payments/PaymentForm";
import PaymentTable from "../../components/payments/PaymentTable";
import PaymentDetailsModal from "../../components/payments/PaymentDetailsModal";

const navItems = [
  { label: "Panel", path: "/manager/dashboard", icon: BarChart3 },
  { label: "Daireler", path: "/manager/apartments", icon: Home },
  { label: "Sakinler", path: "/manager/residents", icon: UserRound },
  { label: "Aidat ve Ödemeler", path: "/manager/payments", icon: CreditCard },
  { label: "Dekontlar", path: "/manager/receipts", icon: UploadCloud },
  { label: "Duyurular", path: "/manager/announcements", icon: Bell },
  { label: "Talepler", path: "/manager/requests", icon: MessageSquareText },
  { label: "Ayarlar", path: "/manager/settings", icon: Settings },
];

const managerManagedArea = {
  type: "site",
  name: "Mavi Site",
};

const defaultScopeType =
  managerManagedArea.type === "site" ? "Tüm Site" : "Tüm Apartman";

const apartmentOptions = [
  { id: 1, label: "A Blok / Daire 1", block: "A Blok" },
  { id: 2, label: "A Blok / Daire 2", block: "A Blok" },
  { id: 3, label: "A Blok / Daire 5", block: "A Blok" },
  { id: 4, label: "B Blok / Daire 8", block: "B Blok" },
  { id: 5, label: "B Blok / Daire 9", block: "B Blok" },
  { id: 6, label: "C Blok / Daire 12", block: "C Blok" },
];

const emptyFormData = {
  title: "",
  category: "Aidat",
  amount: "",
  dueDate: "",
  scopeType: defaultScopeType,
  block: "A Blok",
  selectedApartmentIds: [],
  exemptApartmentIds: [],
  notifyResidents: "Gönder",
  status: "Aktif",
  description: "",
};

function formatCurrency(value) {
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: "TRY",
    minimumFractionDigits: 2,
  }).format(value || 0);
}

function formatDate(dateValue) {
  if (!dateValue) {
    return "-";
  }

  return new Date(dateValue).toLocaleDateString("tr-TR");
}

function PaymentsPage() {
  const [payments, setPayments] = useState([
    {
      id: 1,
      title: "Temmuz Aidatı",
      category: "Aidat",
      scopeText: defaultScopeType,
      totalAmount: 12000,
      totalAmountText: formatCurrency(12000),
      unitAmountText: formatCurrency(2000),
      chargedCount: 6,
      exemptCount: 0,
      chargedApartments: apartmentOptions,
      exemptApartments: [],
      dueDateText: "15.07.2026",
      status: "Aktif",
      description: `${managerManagedArea.name} için Temmuz ayı genel aidat borçlandırması.`,
    },
  ]);

  const [formData, setFormData] = useState(emptyFormData);
  const [showForm, setShowForm] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState(null);

  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("Tümü");
  const [statusFilter, setStatusFilter] = useState("Tümü");

  const availableTargetApartments = useMemo(() => {
    if (
      managerManagedArea.type === "site" &&
      formData.scopeType === "Belirli Blok"
    ) {
      return apartmentOptions.filter(
        (apartment) => apartment.block === formData.block
      );
    }

    if (formData.scopeType === "Belirli Daireler") {
      return apartmentOptions.filter((apartment) =>
        formData.selectedApartmentIds.includes(apartment.id)
      );
    }

    return apartmentOptions;
  }, [formData.scopeType, formData.block, formData.selectedApartmentIds]);

  const calculation = useMemo(() => {
    const totalAmount = Number(formData.amount) || 0;

    const exemptApartments = availableTargetApartments.filter((apartment) =>
      formData.exemptApartmentIds.includes(apartment.id)
    );

    const chargedApartments = availableTargetApartments.filter(
      (apartment) => !formData.exemptApartmentIds.includes(apartment.id)
    );

    const chargedCount = chargedApartments.length;
    const unitAmount = chargedCount > 0 ? totalAmount / chargedCount : 0;

    return {
      totalAmount,
      totalAmountText: formatCurrency(totalAmount),
      targetCount: availableTargetApartments.length,
      exemptCount: exemptApartments.length,
      chargedCount,
      unitAmount,
      unitAmountText: formatCurrency(unitAmount),
      chargedApartments,
      exemptApartments,
    };
  }, [formData.amount, formData.exemptApartmentIds, availableTargetApartments]);

  const filteredPayments = useMemo(() => {
    return payments.filter((payment) => {
      const searchValue = searchTerm.toLowerCase();

      const matchesSearch =
        payment.title.toLowerCase().includes(searchValue) ||
        payment.category.toLowerCase().includes(searchValue) ||
        payment.scopeText.toLowerCase().includes(searchValue) ||
        payment.description.toLowerCase().includes(searchValue);

      const matchesCategory =
        categoryFilter === "Tümü" ? true : payment.category === categoryFilter;

      const matchesStatus =
        statusFilter === "Tümü" ? true : payment.status === statusFilter;

      return matchesSearch && matchesCategory && matchesStatus;
    });
  }, [payments, searchTerm, categoryFilter, statusFilter]);

  function handleInputChange(event) {
    const { name, value } = event.target;

    setFormData((currentData) => {
      const updatedData = {
        ...currentData,
        [name]: value,
      };

      if (name === "scopeType" || name === "block") {
        updatedData.selectedApartmentIds = [];
        updatedData.exemptApartmentIds = [];
      }

      return updatedData;
    });
  }

  function handleApartmentSelectionChange(apartmentId) {
    setFormData((currentData) => {
      const isSelected = currentData.selectedApartmentIds.includes(apartmentId);

      const selectedApartmentIds = isSelected
        ? currentData.selectedApartmentIds.filter((id) => id !== apartmentId)
        : [...currentData.selectedApartmentIds, apartmentId];

      const exemptApartmentIds = currentData.exemptApartmentIds.filter((id) =>
        selectedApartmentIds.includes(id)
      );

      return {
        ...currentData,
        selectedApartmentIds,
        exemptApartmentIds,
      };
    });
  }

  function handleExemptSelectionChange(apartmentId) {
    setFormData((currentData) => {
      const isSelected = currentData.exemptApartmentIds.includes(apartmentId);

      return {
        ...currentData,
        exemptApartmentIds: isSelected
          ? currentData.exemptApartmentIds.filter((id) => id !== apartmentId)
          : [...currentData.exemptApartmentIds, apartmentId],
      };
    });
  }

  function handleOpenForm() {
    setFormData(emptyFormData);
    setShowForm(true);
  }

  function handleCancelForm() {
    setFormData(emptyFormData);
    setShowForm(false);
  }

  function getScopeText() {
    if (formData.scopeType === "Belirli Blok") {
      return formData.block;
    }

    if (formData.scopeType === "Belirli Daireler") {
      return `${calculation.targetCount} seçili daire`;
    }

    return formData.scopeType;
  }

  function handleSubmit(event) {
    event.preventDefault();

    if (calculation.chargedCount === 0) {
      alert("Borçlandırılacak daire bulunamadı.");
      return;
    }

    const newPayment = {
      id: Date.now(),
      title: formData.title,
      category: formData.category,
      scopeText: getScopeText(),
      totalAmount: calculation.totalAmount,
      totalAmountText: calculation.totalAmountText,
      unitAmountText: calculation.unitAmountText,
      chargedCount: calculation.chargedCount,
      exemptCount: calculation.exemptCount,
      chargedApartments: calculation.chargedApartments,
      exemptApartments: calculation.exemptApartments,
      dueDateText: formatDate(formData.dueDate),
      status: formData.status,
      description: formData.description,
    };

    setPayments((currentPayments) => [newPayment, ...currentPayments]);
    handleCancelForm();
  }

  function handleDelete(paymentId) {
    const confirmed = window.confirm(
      "Bu ödeme kaydını silmek istiyor musunuz?"
    );

    if (!confirmed) {
      return;
    }

    setPayments((currentPayments) =>
      currentPayments.filter((payment) => payment.id !== paymentId)
    );
  }

  return (
    <DashboardLayout
      roleTitle="Aidat ve Ödemeler"
      roleBadge="Yönetici"
      userName="Alaa"
      navItems={navItems}
      theme="manager"
    >
      <div className="dashboard-page-header">
        <div>
          <span className="section-kicker">Ödeme Yönetimi</span>
          <h2>Aidat ve Ödemeler</h2>
          <p>
            Aidat ve ortak gider kayıtlarını sorumlu olduğunuz site veya apartman
            kapsamında oluşturabilir, muaf daireleri seçerek dağıtım hesabını
            görebilirsiniz.
          </p>
        </div>

        <button
          type="button"
          className="dashboard-action-button"
          onClick={handleOpenForm}
        >
          <Plus size={18} />
          Yeni Aidat / Gider
        </button>
      </div>

      {showForm && (
        <PaymentForm
          formData={formData}
          apartmentOptions={apartmentOptions}
          availableTargetApartments={availableTargetApartments}
          calculation={calculation}
          managerManagedArea={managerManagedArea}
          onInputChange={handleInputChange}
          onApartmentSelectionChange={handleApartmentSelectionChange}
          onExemptSelectionChange={handleExemptSelectionChange}
          onSubmit={handleSubmit}
          onCancel={handleCancelForm}
        />
      )}

      <PaymentToolbar
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        categoryFilter={categoryFilter}
        setCategoryFilter={setCategoryFilter}
        statusFilter={statusFilter}
        setStatusFilter={setStatusFilter}
      />

      <PaymentTable
        payments={filteredPayments}
        onView={setSelectedPayment}
        onDelete={handleDelete}
      />

      <PaymentDetailsModal
        payment={selectedPayment}
        onClose={() => setSelectedPayment(null)}
      />
    </DashboardLayout>
  );
}

export default PaymentsPage;
