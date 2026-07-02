import { useMemo, useState } from "react";
import DashboardLayout from "../../layouts/DashboardLayout";
import {
  BarChart3,
  Bell,
  BrainCircuit,
  Building2,
  Mail,
  Plus,
  Settings,
  UserRound,
  Users,
} from "lucide-react";

import BuildingToolbar from "../../components/buildings/BuildingToolbar";
import BuildingCard from "../../components/buildings/BuildingCard";
import BuildingDetailsModal from "../../components/buildings/BuildingDetailsModal";
import BuildingForm from "../../components/buildings/BuildingForm";

const navItems = [
  { label: "Panel", path: "/super-admin/dashboard", icon: BarChart3 },
  { label: "Site / Apartmanlar", path: "/super-admin/buildings", icon: Building2 },
  { label: "Yöneticiler", path: "/super-admin/managers", icon: Users },
  { label: "Kullanıcılar / Sakinler", path: "/super-admin/users", icon: UserRound },
  { label: "Duyurular", path: "/super-admin/announcements", icon: Bell },
  { label: "AI API Ayarları", path: "/super-admin/ai-settings", icon: BrainCircuit },
  { label: "SMS / E-posta", path: "/super-admin/notifications", icon: Mail },
  { label: "Genel Ayarlar", path: "/super-admin/settings", icon: Settings },
];

const managers = ["Ahmet Yılmaz", "Elif Demir", "Mehmet Kaya", "Zeynep Aydın"];

const systemOptions = [
  "Merkezi uydu",
  "Merkezi zil sistemi",
  "Merkezi kazan ısıtma",
  "Güvenlik kamera sistemi",
];

const allowedImageTypes = [
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/webp",
];

const maxImageSize = 5 * 1024 * 1024;

const defaultImage =
  "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=900&q=80";

const initialBuildings = [
  {
    id: 1,
    name: "Mavi Site",
    type: "Site",
    address: "İstanbul / Bahçelievler",
    blocks: 3,
    blockInfo: "A Blok, B Blok, C Blok",
    apartments: 128,
    manager: "Ahmet Yılmaz",
    elevator: "Bloklara göre değişir",
    systems: ["Merkezi uydu", "Güvenlik kamera sistemi"],
    description: "Birden fazla bloktan oluşan site yönetimi.",
    status: "Aktif",
    image: defaultImage,
  },
  {
    id: 2,
    name: "Güneş Apartmanı",
    type: "Tek Apartman",
    address: "Ankara / Çankaya",
    blocks: 1,
    blockInfo: "",
    apartments: 32,
    manager: "Elif Demir",
    elevator: "Var",
    systems: ["Merkezi zil sistemi"],
    description: "Tek apartman yönetimi için kayıt.",
    status: "Aktif",
    image:
      "https://images.unsplash.com/photo-1494526585095-c41746248156?auto=format&fit=crop&w=900&q=80",
  },
  {
    id: 3,
    name: "Deniz Rezidans",
    type: "Rezidans",
    address: "İzmir / Karşıyaka",
    blocks: 2,
    blockInfo: "Kule A, Kule B",
    apartments: 84,
    manager: "Mehmet Kaya",
    elevator: "Var",
    systems: ["Merkezi uydu", "Güvenlik kamera sistemi"],
    description: "Rezidans yapısı için örnek kayıt.",
    status: "Pasif",
    image:
      "https://images.unsplash.com/photo-1460317442991-0ec209397118?auto=format&fit=crop&w=900&q=80",
  },
];

const emptyFormData = {
  type: "Site",
  name: "",
  apartments: "",
  manager: "",
  blockInfo: "",
  elevator: "Var",
  address: "",
  description: "",
  systems: [],
};

function calculateBlockCount(type, blockInfo) {
  if (type !== "Site" && type !== "Rezidans") {
    return 1;
  }

  const blocks = blockInfo
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

  return blocks.length > 0 ? blocks.length : 1;
}

function BuildingsPage() {
  const [buildingList, setBuildingList] = useState(initialBuildings);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingBuilding, setEditingBuilding] = useState(null);
  const [selectedBuilding, setSelectedBuilding] = useState(null);

  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState("Tümü");

  const [formData, setFormData] = useState(emptyFormData);
  const [previewImage, setPreviewImage] = useState("");

  const filteredBuildings = useMemo(() => {
    const searchValue = searchTerm.trim().toLowerCase();

    return buildingList.filter((building) => {
      const searchableText = [
        building.name,
        building.address,
        building.manager,
        building.type,
      ]
        .join(" ")
        .toLowerCase();

      const matchesSearch = searchableText.includes(searchValue);

      const matchesType =
        typeFilter === "Tümü" ? true : building.type === typeFilter;

      return matchesSearch && matchesType;
    });
  }, [buildingList, searchTerm, typeFilter]);

  function resetForm() {
    setEditingBuilding(null);
    setFormData(emptyFormData);
    setPreviewImage("");
  }

  function openCreateForm() {
    resetForm();
    setIsFormOpen(true);
  }

  function closeForm() {
    resetForm();
    setIsFormOpen(false);
  }

  function handleInputChange(event) {
    const { name, value } = event.target;

    setFormData((currentData) => ({
      ...currentData,
      [name]: value,
    }));
  }

  function handleSystemChange(systemName) {
    setFormData((currentData) => {
      const currentSystems = currentData.systems || [];
      const isSelected = currentSystems.includes(systemName);

      return {
        ...currentData,
        systems: isSelected
          ? currentSystems.filter((system) => system !== systemName)
          : [...currentSystems, systemName],
      };
    });
  }

  function handleImageChange(event) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    if (!allowedImageTypes.includes(file.type)) {
      event.target.value = "";
      alert("Lütfen PNG, JPG, JPEG veya WEBP formatında görsel seçiniz.");
      return;
    }

    if (file.size > maxImageSize) {
      event.target.value = "";
      alert("Site / apartman görseli en fazla 5 MB olabilir.");
      return;
    }

    const imageUrl = URL.createObjectURL(file);

    setPreviewImage(imageUrl);
  }

  function handleSubmit(event) {
    event.preventDefault();

    const newBuilding = {
      id: editingBuilding ? editingBuilding.id : Date.now(),
      name: formData.name.trim(),
      type: formData.type,
      address: formData.address.trim(),
      blocks: calculateBlockCount(formData.type, formData.blockInfo),
      blockInfo: formData.blockInfo.trim(),
      apartments: Number(formData.apartments),
      manager: formData.manager || "Yönetici atanmadı",
      elevator: formData.elevator,
      systems: formData.systems || [],
      description: formData.description.trim(),
      status: editingBuilding ? editingBuilding.status : "Aktif",
      image: previewImage || editingBuilding?.image || defaultImage,
    };

    if (editingBuilding) {
      setBuildingList((currentBuildings) =>
        currentBuildings.map((building) =>
          building.id === editingBuilding.id ? newBuilding : building
        )
      );
    } else {
      setBuildingList((currentBuildings) => [newBuilding, ...currentBuildings]);
    }

    closeForm();
  }

  function handleEdit(building) {
    setEditingBuilding(building);

    setFormData({
      type: building.type,
      name: building.name,
      apartments: String(building.apartments),
      manager: building.manager === "Yönetici atanmadı" ? "" : building.manager,
      blockInfo: building.blockInfo,
      elevator: building.elevator,
      address: building.address,
      description: building.description,
      systems: Array.isArray(building.systems) ? building.systems : [],
    });

    setPreviewImage(building.image);
    setIsFormOpen(true);

    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function handleToggleStatus(building) {
    const nextStatus = building.status === "Aktif" ? "Pasif" : "Aktif";

    const confirmMessage =
      building.status === "Aktif"
        ? `${building.name} kaydını pasifleştirmek istiyor musunuz?`
        : `${building.name} kaydını tekrar aktifleştirmek istiyor musunuz?`;

    const isConfirmed = window.confirm(confirmMessage);

    if (!isConfirmed) {
      return;
    }

    setBuildingList((currentBuildings) =>
      currentBuildings.map((item) =>
        item.id === building.id ? { ...item, status: nextStatus } : item
      )
    );
  }

  return (
    <DashboardLayout
      roleTitle="Site / Apartmanlar"
      roleBadge="Süper Admin"
      userName="Alaa"
      navItems={navItems}
      theme="super-admin"
    >
      <div className="dashboard-page-header">
        <div>
          <h2>Site ve Apartman Yönetimi</h2>

          <p>
            Sisteme kayıtlı site, apartman, blok, daire ve yönetici bilgilerini
            buradan takip edebilirsiniz.
          </p>
        </div>

        <button
          type="button"
          className="dashboard-action-button"
          onClick={openCreateForm}
        >
          <Plus size={18} />
          Yeni Site / Apartman
        </button>
      </div>

      {isFormOpen && (
        <BuildingForm
          formData={formData}
          previewImage={previewImage}
          managers={managers}
          systemOptions={systemOptions}
          editingBuilding={editingBuilding}
          onInputChange={handleInputChange}
          onSystemChange={handleSystemChange}
          onImageChange={handleImageChange}
          onSubmit={handleSubmit}
          onCancel={closeForm}
        />
      )}

      <BuildingToolbar
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        typeFilter={typeFilter}
        setTypeFilter={setTypeFilter}
      />

      <section className="buildings-grid">
        {filteredBuildings.map((building) => (
          <BuildingCard
            key={building.id}
            building={building}
            onView={setSelectedBuilding}
            onEdit={handleEdit}
            onToggleStatus={handleToggleStatus}
          />
        ))}
      </section>

      <BuildingDetailsModal
        building={selectedBuilding}
        onClose={() => setSelectedBuilding(null)}
      />
    </DashboardLayout>
  );
}

export default BuildingsPage;