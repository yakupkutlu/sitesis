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

import ResidentReceiptSummaryCards from "../../components/resident-receipts/ResidentReceiptSummaryCards";
import ResidentReceiptUploadForm from "../../components/resident-receipts/ResidentReceiptUploadForm";
import ResidentReceiptCards from "../../components/resident-receipts/ResidentReceiptCards";
import ResidentReceiptDetailsModal from "../../components/resident-receipts/ResidentReceiptDetailsModal";

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

const allowedReceiptTypes = [
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/webp",
];

const maxReceiptSize = 10 * 1024 * 1024;

const paymentOptions = [
  {
    id: "p1",
    title: "Temmuz Aidatı",
    remainingAmount: "1.250 TL",
  },
  {
    id: "p2",
    title: "Asansör Bakım Gideri",
    remainingAmount: "250 TL",
  },
  {
    id: "p3",
    title: "Ortak Alan Temizlik Gideri",
    remainingAmount: "300 TL",
  },
];

const initialReceipts = [
  {
    id: 1,
    paymentTitle: "Haziran Aidatı",
    amount: "1.250 TL",
    description: "Haziran aidatı için yüklenen banka dekontu.",
    fileName: "haziran-aidat.pdf",
    fileSize: "420 KB",
    status: "Onaylandı",
    apartment: "A Blok / Daire 5",
    uploadedAt: "10.06.2026",
    reviewNote: "Onaylandı",
  },
  {
    id: 2,
    paymentTitle: "Asansör Bakım Gideri",
    amount: "250 TL",
    description: "Asansör bakım gideri için kısmi ödeme dekontu.",
    fileName: "asansor-odeme.png",
    fileSize: "1.2 MB",
    status: "Onay Bekliyor",
    apartment: "A Blok / Daire 5",
    uploadedAt: "30.06.2026",
    reviewNote: "Kontrol bekliyor",
  },
  {
    id: 3,
    paymentTitle: "Mayıs Temizlik Gideri",
    amount: "300 TL",
    description: "Yanlış ödeme açıklaması nedeniyle kontrol edilemedi.",
    fileName: "temizlik-dekont.jpg",
    fileSize: "980 KB",
    status: "Reddedildi",
    apartment: "A Blok / Daire 5",
    uploadedAt: "25.05.2026",
    reviewNote: "Açıklama uyuşmadı",
  },
];

const emptyFormData = {
  paymentId: "",
  amount: "",
  description: "",
};

function formatFileSize(size) {
  if (size < 1024 * 1024) {
    return `${Math.round(size / 1024)} KB`;
  }

  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function ResidentReceiptsPage() {
  const [receipts, setReceipts] = useState(initialReceipts);
  const [formData, setFormData] = useState(emptyFormData);
  const [selectedFile, setSelectedFile] = useState(null);
  const [fileError, setFileError] = useState("");
  const [selectedReceipt, setSelectedReceipt] = useState(null);

  const summary = useMemo(() => {
    return {
      total: receipts.length,
      waiting: receipts.filter((receipt) => receipt.status === "Onay Bekliyor")
        .length,
      approved: receipts.filter((receipt) => receipt.status === "Onaylandı")
        .length,
      rejected: receipts.filter((receipt) => receipt.status === "Reddedildi")
        .length,
    };
  }, [receipts]);

  function handleInputChange(event) {
    const { name, value } = event.target;

    setFormData((currentData) => ({
      ...currentData,
      [name]: value,
    }));
  }

  function handleFileChange(event) {
    const file = event.target.files?.[0];

    setFileError("");
    setSelectedFile(null);

    if (!file) {
      return;
    }

    if (!allowedReceiptTypes.includes(file.type)) {
      setFileError("Bu dosya türü desteklenmiyor.");
      return;
    }

    if (file.size > maxReceiptSize) {
      setFileError("Dekont dosyası en fazla 10 MB olabilir.");
      return;
    }

    setSelectedFile({
      file,
      name: file.name,
      sizeText: formatFileSize(file.size),
    });
  }

  function handleSubmit(event) {
    event.preventDefault();

    if (!selectedFile) {
      setFileError("Lütfen geçerli bir dekont dosyası seçiniz.");
      return;
    }

    const selectedPayment = paymentOptions.find(
      (payment) => payment.id === formData.paymentId
    );

    if (!selectedPayment) {
      return;
    }

    const newReceipt = {
      id: Date.now(),
      paymentTitle: selectedPayment.title,
      amount: `${formData.amount} TL`,
      description:
        formData.description || "Sakin tarafından ödeme dekontu yüklendi.",
      fileName: selectedFile.name,
      fileSize: selectedFile.sizeText,
      status: "Onay Bekliyor",
      apartment: residentInfo.apartment,
      uploadedAt: new Date().toLocaleDateString("tr-TR"),
      reviewNote: "Kontrol bekliyor",
    };

    setReceipts((currentReceipts) => [newReceipt, ...currentReceipts]);
    setFormData(emptyFormData);
    setSelectedFile(null);
    setFileError("");
  }

  return (
    <DashboardLayout
      roleTitle="Dekont Yükle"
      roleBadge="Sakin"
      userName={residentInfo.fullName}
      navItems={navItems}
      theme="resident"
    >
      <div className="dashboard-page-header">
        <div>
          <span className="section-kicker">Dekont Yönetimi</span>
          <h2>Dekont Yükle</h2>
          <p>
            {residentInfo.siteName} / {residentInfo.apartment} için yaptığınız
            banka ödemelerine ait dekontları buradan yönetime
            gönderebilirsiniz.
          </p>
        </div>
      </div>

      <ResidentReceiptSummaryCards summary={summary} />

      <ResidentReceiptUploadForm
        formData={formData}
        paymentOptions={paymentOptions}
        selectedFile={selectedFile}
        fileError={fileError}
        onInputChange={handleInputChange}
        onFileChange={handleFileChange}
        onSubmit={handleSubmit}
      />

      <div className="resident-section-heading">
        <span className="section-kicker">Geçmiş</span>
        <h3>Yüklenen Dekontlar</h3>
      </div>

      <ResidentReceiptCards receipts={receipts} onView={setSelectedReceipt} />

      <ResidentReceiptDetailsModal
        receipt={selectedReceipt}
        onClose={() => setSelectedReceipt(null)}
      />
    </DashboardLayout>
  );
}

export default ResidentReceiptsPage;