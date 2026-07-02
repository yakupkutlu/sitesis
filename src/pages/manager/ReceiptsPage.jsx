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

import ReceiptToolbar from "../../components/receipts/ReceiptToolbar";
import ReceiptUploadForm from "../../components/receipts/ReceiptUploadForm";
import ReceiptTable from "../../components/receipts/ReceiptTable";
import ReceiptDetailsModal from "../../components/receipts/ReceiptDetailsModal";

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

const apartmentOptions = [
  {
    id: 1,
    label: "A Blok / Daire 1",
    apartmentNo: "Daire 1",
    residentName: "Ayşe Demir",
    residentRole: "Ev Sahibi",
    expectedAmount: 1250,
    expectedAmountText: "₺1.250,00",
  },
  {
    id: 2,
    label: "A Blok / Daire 5",
    apartmentNo: "Daire 5",
    residentName: "Ali Can",
    residentRole: "Kiracı",
    expectedAmount: 1250,
    expectedAmountText: "₺1.250,00",
  },
  {
    id: 3,
    label: "B Blok / Daire 8",
    apartmentNo: "Daire 8",
    residentName: "Mehmet Kaya",
    residentRole: "Kiracı",
    expectedAmount: 1800,
    expectedAmountText: "₺1.800,00",
  },
  {
    id: 4,
    label: "C Blok / Daire 12",
    apartmentNo: "Daire 12",
    residentName: "Zeynep Aydın",
    residentRole: "Ev Sahibi",
    expectedAmount: 1000,
    expectedAmountText: "₺1.000,00",
  },
];

const allowedFileTypes = [
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/webp",
];

const allowedExtensions = ["pdf", "png", "jpg", "jpeg", "webp"];

const maxFileSize = 10 * 1024 * 1024;

const emptyFormData = {
  payerName: "",
  bankAccount: "",
  amount: "",
  paymentOwnerType: "Kiracı Ödemesi",
  manualApartmentId: "",
  description: "",
  fileName: "",
  fileType: "",
  fileSize: 0,
  fileSizeText: "",
};

function formatCurrency(value) {
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: "TRY",
    minimumFractionDigits: 2,
  }).format(value || 0);
}

function formatFileSize(size) {
  if (!size) {
    return "0 KB";
  }

  const sizeInKb = size / 1024;

  if (sizeInKb < 1024) {
    return `${sizeInKb.toFixed(1)} KB`;
  }

  return `${(sizeInKb / 1024).toFixed(2)} MB`;
}

function getFileExtension(fileName) {
  return fileName.split(".").pop()?.toLowerCase() || "";
}

function normalizeText(value) {
  return value.toLocaleLowerCase("tr-TR").trim();
}

function ReceiptsPage() {
  const [receipts, setReceipts] = useState([
    {
      id: 1,
      payerName: "Ali Can",
      bankAccount: "TR00 0000 0000 0000",
      apartmentLabel: "A Blok / Daire 5",
      paymentOwnerType: "Kiracı Ödemesi",
      amount: 1250,
      amountText: formatCurrency(1250),
      description: "Temmuz aidatı",
      fileName: "ali-can-dekont.pdf",
      fileType: "application/pdf",
      fileSizeText: "420.0 KB",
      status: "Onay Bekliyor",
      matchMessage: "Ad soyad ve tutar bilgisine göre eşleşme bulundu.",
      createdAt: "30.06.2026",
    },
    {
      id: 2,
      payerName: "Bilinmeyen Kişi",
      bankAccount: "TR11 1111 1111 1111",
      apartmentLabel: "",
      paymentOwnerType: "Kiracı Ödemesi",
      amount: 900,
      amountText: formatCurrency(900),
      description: "Aidat ödemesi",
      fileName: "dekont-2.jpg",
      fileType: "image/jpeg",
      fileSizeText: "680.0 KB",
      status: "Eşleşme Bulunamadı",
      matchMessage:
        "Dekont mevcut daire ve sakin kayıtları ile eşleşmedi. Yönetici manuel kontrol yapmalıdır.",
      createdAt: "30.06.2026",
    },
  ]);

  const [formData, setFormData] = useState(emptyFormData);
  const [fileError, setFileError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [selectedReceipt, setSelectedReceipt] = useState(null);

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("Tümü");

  const matchResult = useMemo(() => {
    const amount = Number(formData.amount) || 0;

    if (formData.manualApartmentId) {
      const apartment = apartmentOptions.find(
        (item) => item.id === Number(formData.manualApartmentId)
      );

      return {
        status: apartment ? "Manuel Eşleşme" : "Eşleşme Bulunamadı",
        message: apartment
          ? "Daire yönetici tarafından manuel olarak seçildi."
          : "Seçilen daire bulunamadı.",
        apartment: apartment || null,
      };
    }

    const payerValue = normalizeText(formData.payerName);
    const descriptionValue = normalizeText(formData.description);

    const matchedApartment = apartmentOptions.find((apartment) => {
      const residentName = normalizeText(apartment.residentName);
      const apartmentLabel = normalizeText(apartment.label);
      const apartmentNo = normalizeText(apartment.apartmentNo);

      const nameMatches =
        payerValue.length > 1 &&
        (residentName.includes(payerValue) || payerValue.includes(residentName));

      const descriptionMatches =
        descriptionValue.length > 1 &&
        (descriptionValue.includes(apartmentLabel) ||
          descriptionValue.includes(apartmentNo));

      const amountMatches =
        amount > 0 && Number(apartment.expectedAmount) === amount;

      return (nameMatches || descriptionMatches) && amountMatches;
    });

    if (matchedApartment) {
      return {
        status: "Eşleşti",
        message:
          "Ad soyad, açıklama veya tutar bilgilerine göre eşleşme bulundu. Onay verilmeden ödeme kaydına işlenmez.",
        apartment: matchedApartment,
      };
    }

    return {
      status: "Eşleşme Bulunamadı",
      message:
        "Dekont bilgileri mevcut daire ve sakin kayıtları ile eşleşmedi. Gerekirse manuel daire seçimi yapılabilir.",
      apartment: null,
    };
  }, [
    formData.payerName,
    formData.amount,
    formData.description,
    formData.manualApartmentId,
  ]);

  const filteredReceipts = useMemo(() => {
    return receipts.filter((receipt) => {
      const searchValue = normalizeText(searchTerm);

      const matchesSearch =
        normalizeText(receipt.payerName).includes(searchValue) ||
        normalizeText(receipt.bankAccount).includes(searchValue) ||
        normalizeText(receipt.apartmentLabel).includes(searchValue) ||
        normalizeText(receipt.paymentOwnerType).includes(searchValue) ||
        normalizeText(receipt.amountText).includes(searchValue) ||
        normalizeText(receipt.description).includes(searchValue) ||
        normalizeText(receipt.status).includes(searchValue) ||
        normalizeText(receipt.fileName).includes(searchValue);

      const matchesStatus =
        statusFilter === "Tümü" ? true : receipt.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [receipts, searchTerm, statusFilter]);

  function handleInputChange(event) {
    const { name, value } = event.target;

    setFormData((currentData) => ({
      ...currentData,
      [name]: value,
    }));
  }

  function handleFileChange(event) {
    const selectedFile = event.target.files?.[0];

    if (!selectedFile) {
      setFormData((currentData) => ({
        ...currentData,
        fileName: "",
        fileType: "",
        fileSize: 0,
        fileSizeText: "",
      }));

      setFileError("");
      return;
    }

    const fileExtension = getFileExtension(selectedFile.name);
    const isTypeAllowed = allowedFileTypes.includes(selectedFile.type);
    const isExtensionAllowed = allowedExtensions.includes(fileExtension);
    const isSizeAllowed = selectedFile.size <= maxFileSize;

    if (!isExtensionAllowed || !isTypeAllowed) {
      setFileError(
        "Geçersiz dosya türü. Sadece PDF, PNG, JPG, JPEG veya WEBP yükleyebilirsiniz."
      );
    } else if (!isSizeAllowed) {
      setFileError("Dekont dosyası en fazla 10 MB olabilir.");
    } else {
      setFileError("");
    }

    setFormData((currentData) => ({
      ...currentData,
      fileName: selectedFile.name,
      fileType: selectedFile.type || fileExtension,
      fileSize: selectedFile.size,
      fileSizeText: formatFileSize(selectedFile.size),
    }));
  }

  function handleOpenForm() {
    setFormData(emptyFormData);
    setFileError("");
    setShowForm(true);
  }

  function handleCancelForm() {
    setFormData(emptyFormData);
    setFileError("");
    setShowForm(false);
  }

  function handleSubmit(event) {
    event.preventDefault();

    if (fileError) {
      alert("Lütfen dosya hatasını düzeltin.");
      return;
    }

    if (!formData.fileName) {
      alert("Lütfen dekont dosyası seçin.");
      return;
    }

    const hasMatch = Boolean(matchResult.apartment);

    const newReceipt = {
      id: Date.now(),
      payerName: formData.payerName,
      bankAccount: formData.bankAccount,
      apartmentLabel: hasMatch ? matchResult.apartment.label : "",
      paymentOwnerType: formData.paymentOwnerType,
      amount: Number(formData.amount) || 0,
      amountText: formatCurrency(Number(formData.amount) || 0),
      description: formData.description,
      fileName: formData.fileName,
      fileType: formData.fileType,
      fileSizeText: formData.fileSizeText,
      status: hasMatch ? "Onay Bekliyor" : "Eşleşme Bulunamadı",
      matchMessage: matchResult.message,
      createdAt: new Date().toLocaleDateString("tr-TR"),
    };

    setReceipts((currentReceipts) => [newReceipt, ...currentReceipts]);
    handleCancelForm();
  }

  function handleApprove(receiptId) {
    setReceipts((currentReceipts) =>
      currentReceipts.map((receipt) => {
        if (receipt.id !== receiptId) {
          return receipt;
        }

        if (!receipt.apartmentLabel) {
          return {
            ...receipt,
            status: "Eşleşme Bulunamadı",
            matchMessage:
              "Eşleşen daire olmadığı için dekont onaylanamadı. Önce manuel eşleştirme yapılmalıdır.",
          };
        }

        return {
          ...receipt,
          status: "Onaylandı",
          matchMessage:
            "Dekont yönetici tarafından onaylandı. Ödeme kaydı ile ilişkilendirildi.",
        };
      })
    );
  }

  function handleReject(receiptId) {
    setReceipts((currentReceipts) =>
      currentReceipts.map((receipt) =>
        receipt.id === receiptId
          ? {
              ...receipt,
              status: "Reddedildi",
              matchMessage: "Dekont yönetici tarafından reddedildi.",
            }
          : receipt
      )
    );
  }

  function handleDelete(receiptId) {
    const confirmed = window.confirm("Bu dekont kaydını silmek istiyor musunuz?");

    if (!confirmed) {
      return;
    }

    setReceipts((currentReceipts) =>
      currentReceipts.filter((receipt) => receipt.id !== receiptId)
    );
  }

  return (
    <DashboardLayout
      roleTitle="Dekontlar"
      roleBadge="Yönetici"
      userName="Alaa"
      navItems={navItems}
      theme="manager"
    >
      <div className="dashboard-page-header">
        <div>
          <span className="section-kicker">Dekont Yönetimi</span>
          <h2>Dekontlar</h2>
          <p>
            {managerManagedArea.name} için yüklenen banka dekontlarını
            eşleştirme sonucuna göre kontrol edebilir, yalnızca uygun kayıtları
            onaylayabilirsiniz.
          </p>
        </div>

        <button
          type="button"
          className="dashboard-action-button"
          onClick={handleOpenForm}
        >
          <Plus size={18} />
          Yeni Dekont
        </button>
      </div>

      {showForm && (
        <ReceiptUploadForm
          formData={formData}
          apartmentOptions={apartmentOptions}
          fileError={fileError}
          matchResult={matchResult}
          onInputChange={handleInputChange}
          onFileChange={handleFileChange}
          onSubmit={handleSubmit}
          onCancel={handleCancelForm}
        />
      )}

      <ReceiptToolbar
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        statusFilter={statusFilter}
        setStatusFilter={setStatusFilter}
      />

      <ReceiptTable
        receipts={filteredReceipts}
        onView={setSelectedReceipt}
        onApprove={handleApprove}
        onReject={handleReject}
        onDelete={handleDelete}
      />

      <ReceiptDetailsModal
        receipt={selectedReceipt}
        onClose={() => setSelectedReceipt(null)}
      />
    </DashboardLayout>
  );
}

export default ReceiptsPage;