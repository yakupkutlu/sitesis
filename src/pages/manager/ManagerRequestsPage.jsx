import { useMemo, useState } from "react";
import DashboardLayout from "../../layouts/DashboardLayout";
import {
  BarChart3,
  Bell,
  CreditCard,
  Home,
  MessageSquareText,
  Settings,
  UploadCloud,
  UserRound,
} from "lucide-react";

import ManagerRequestSummaryCards from "../../components/manager-requests/ManagerRequestSummaryCards";
import ManagerRequestToolbar from "../../components/manager-requests/ManagerRequestToolbar";
import ManagerRequestCards from "../../components/manager-requests/ManagerRequestCards";
import ManagerRequestViewModal from "../../components/manager-requests/ManagerRequestViewModal";
import ManagerRequestEditModal from "../../components/manager-requests/ManagerRequestEditModal";
import ManagerRequestHistoryModal from "../../components/manager-requests/ManagerRequestHistoryModal";

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

const initialRequests = [
  {
    id: 1001,
    title: "Asansör çalışmıyor",
    residentName: "Ali Can",
    phone: "0555 444 55 66",
    apartmentLabel: "A Blok / Daire 5",
    category: "Arıza",
    priority: "Yüksek",
    status: "Yeni",
    description:
      "A Blok asansörü sabah saatlerinden beri çalışmıyor. Kontrol edilmesini rica ederim.",
    managerResponse: "",
    fileName: "asansor-ariza.jpg",
    history: [
      {
        id: 1,
        date: "30.06.2026",
        text: "Talep sakin tarafından oluşturuldu.",
      },
    ],
    createdAt: "30.06.2026",
    updatedAt: "30.06.2026",
  },
  {
    id: 1002,
    title: "Otopark ışığı yanmıyor",
    residentName: "Ayşe Demir",
    phone: "0555 777 88 99",
    apartmentLabel: "A Blok / Daire 1",
    category: "Bakım",
    priority: "Orta",
    status: "İnceleniyor",
    description:
      "Otopark girişindeki ışık çalışmıyor. Akşam saatlerinde görüş zorlaşıyor.",
    managerResponse: "Elektrikçi ile görüşüldü, gün içinde kontrol edilecek.",
    fileName: "otopark-isik.png",
    history: [
      {
        id: 1,
        date: "29.06.2026",
        text: "Talep sakin tarafından oluşturuldu.",
      },
      {
        id: 2,
        date: "30.06.2026",
        text: "Yönetici talebi incelemeye aldı.",
      },
    ],
    createdAt: "29.06.2026",
    updatedAt: "30.06.2026",
  },
  {
    id: 1003,
    title: "Gece gürültü şikayeti",
    residentName: "Zeynep Aydın",
    phone: "0555 333 44 55",
    apartmentLabel: "C Blok / Daire 12",
    category: "Şikayet",
    priority: "Orta",
    status: "Yeni",
    description:
      "Son birkaç gündür gece geç saatlerde yüksek ses oluyor. Bilgilendirme yapılmasını istiyorum.",
    managerResponse: "",
    fileName: "",
    history: [
      {
        id: 1,
        date: "28.06.2026",
        text: "Talep sakin tarafından oluşturuldu.",
      },
    ],
    createdAt: "28.06.2026",
    updatedAt: "28.06.2026",
  },
  {
    id: 1004,
    title: "Kapı giriş kartı çalışmıyor",
    residentName: "Mehmet Kaya",
    phone: "0555 222 11 00",
    apartmentLabel: "B Blok / Daire 8",
    category: "Güvenlik",
    priority: "Düşük",
    status: "Çözüldü",
    description:
      "Bina giriş kartım çalışmıyor. Yeni kart tanımlanmasını rica ederim.",
    managerResponse: "Yeni kart tanımlandı ve sakine teslim edildi.",
    fileName: "",
    history: [
      {
        id: 1,
        date: "27.06.2026",
        text: "Talep sakin tarafından oluşturuldu.",
      },
      {
        id: 2,
        date: "28.06.2026",
        text: "Talep çözüldü olarak güncellendi.",
      },
    ],
    createdAt: "27.06.2026",
    updatedAt: "28.06.2026",
  },
];

const emptyUpdateData = {
  status: "Yeni",
  managerResponse: "",
  sendSms: "Gönder",
  sendEmail: "Gönder",
};

function buildNotificationText(updateData) {
  const shouldSendNotification =
    updateData.sendSms === "Gönder" || updateData.sendEmail === "Gönder";

  if (!shouldSendNotification) {
    return " Sakine bilgilendirme gönderilmeyecek.";
  }

  return ` Bildirim tercihi: SMS ${updateData.sendSms}, E-posta ${updateData.sendEmail}.`;
}

function ManagerRequestsPage() {
  const [requests, setRequests] = useState(initialRequests);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [activeModal, setActiveModal] = useState(null);
  const [updateData, setUpdateData] = useState(emptyUpdateData);

  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("Tümü");
  const [priorityFilter, setPriorityFilter] = useState("Tümü");
  const [statusFilter, setStatusFilter] = useState("Tümü");

  const summary = useMemo(() => {
    return {
      total: requests.length,
      newCount: requests.filter((request) => request.status === "Yeni").length,
      reviewingCount: requests.filter(
        (request) => request.status === "İnceleniyor"
      ).length,
      resolvedCount: requests.filter((request) => request.status === "Çözüldü")
        .length,
    };
  }, [requests]);

  const filteredRequests = useMemo(() => {
    const searchValue = searchTerm.trim().toLowerCase();

    return requests.filter((request) => {
      const searchableText = [
        request.title,
        request.residentName,
        request.phone,
        request.apartmentLabel,
        request.category,
        request.priority,
        request.status,
        request.description,
        request.managerResponse,
        request.fileName,
      ]
        .join(" ")
        .toLowerCase();

      const matchesSearch = searchableText.includes(searchValue);

      const matchesCategory =
        categoryFilter === "Tümü" ? true : request.category === categoryFilter;

      const matchesPriority =
        priorityFilter === "Tümü" ? true : request.priority === priorityFilter;

      const matchesStatus =
        statusFilter === "Tümü" ? true : request.status === statusFilter;

      return (
        matchesSearch && matchesCategory && matchesPriority && matchesStatus
      );
    });
  }, [requests, searchTerm, categoryFilter, priorityFilter, statusFilter]);

  function openViewModal(request) {
    setSelectedRequest(request);
    setActiveModal("view");
  }

  function openEditModal(request) {
    setSelectedRequest(request);

    setUpdateData({
      status: request.status || "Yeni",
      managerResponse: request.managerResponse || "",
      sendSms: "Gönder",
      sendEmail: "Gönder",
    });

    setActiveModal("edit");
  }

  function openHistoryModal(request) {
    setSelectedRequest(request);
    setActiveModal("history");
  }

  function closeModal() {
    setSelectedRequest(null);
    setActiveModal(null);
    setUpdateData(emptyUpdateData);
  }

  function handleUpdateInputChange(event) {
    const { name, value } = event.target;

    setUpdateData((currentData) => ({
      ...currentData,
      [name]: value,
    }));
  }

  function handleUpdateRequest(event) {
    event.preventDefault();

    if (!selectedRequest) {
      return;
    }

    const updateDate = new Date().toLocaleDateString("tr-TR");
    const notificationText = buildNotificationText(updateData);

    setRequests((currentRequests) =>
      currentRequests.map((request) => {
        if (request.id !== selectedRequest.id) {
          return request;
        }

        const currentHistory = Array.isArray(request.history)
          ? request.history
          : [];

        return {
          ...request,
          status: updateData.status,
          managerResponse: updateData.managerResponse.trim(),
          updatedAt: updateDate,
          history: [
            ...currentHistory,
            {
              id: Date.now(),
              date: updateDate,
              text: `Yönetici talebi "${updateData.status}" durumuna güncelledi.${notificationText}`,
            },
          ],
        };
      })
    );

    closeModal();
  }

  return (
    <DashboardLayout
      roleTitle="Talepler"
      roleBadge="Yönetici"
      userName="Alaa"
      navItems={navItems}
      theme="manager"
    >
      <div className="dashboard-page-header">
        <div>
          <span className="section-kicker">Talep Yönetimi</span>

          <h2>Talepler</h2>

          <p>
            {managerManagedArea.name} kapsamındaki sakinlerden gelen talepleri
            görüntüleyebilir, düzenleyebilir ve işlem geçmişini takip
            edebilirsiniz.
          </p>
        </div>
      </div>

      <ManagerRequestSummaryCards summary={summary} />

      <ManagerRequestToolbar
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        categoryFilter={categoryFilter}
        setCategoryFilter={setCategoryFilter}
        priorityFilter={priorityFilter}
        setPriorityFilter={setPriorityFilter}
        statusFilter={statusFilter}
        setStatusFilter={setStatusFilter}
      />

      <ManagerRequestCards
        requests={filteredRequests}
        onView={openViewModal}
        onEdit={openEditModal}
        onHistory={openHistoryModal}
      />

      <ManagerRequestViewModal
        request={activeModal === "view" ? selectedRequest : null}
        onClose={closeModal}
      />

      <ManagerRequestEditModal
        request={activeModal === "edit" ? selectedRequest : null}
        updateData={updateData}
        onInputChange={handleUpdateInputChange}
        onSubmit={handleUpdateRequest}
        onClose={closeModal}
      />

      <ManagerRequestHistoryModal
        request={activeModal === "history" ? selectedRequest : null}
        onClose={closeModal}
      />
    </DashboardLayout>
  );
}

export default ManagerRequestsPage;