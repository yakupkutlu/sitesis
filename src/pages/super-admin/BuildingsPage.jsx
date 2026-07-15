import { useEffect, useMemo, useState } from "react";
import DashboardLayout from "../../layouts/DashboardLayout";
import {
  BarChart3,
  Bell,
  BrainCircuit,
  Building2,
  MessageSquareText,
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

import {
  createSite,
  getSiteImageUrl,
  getSites,
  updateSite,
  uploadSiteImage,
} from "../../api/sitesApi";

import { createBlock, updateBlock } from "../../api/blocksApi";
import { createApartment } from "../../api/apartmentsApi";
import { getUsers } from "../../api/usersApi";
import {
  createManagerAssignment,
  getManagerAssignments,
} from "../../api/managerAssignmentsApi";

import { useAuth } from "../../context/AuthContext";

const navItems = [
  { label: "Panel", path: "/super-admin/dashboard", icon: BarChart3 },
  { label: "Site / Apartmanlar", path: "/super-admin/buildings", icon: Building2 },
  { label: "Yöneticiler", path: "/super-admin/managers", icon: Users },
  { label: "Kullanıcılar / Sakinler", path: "/super-admin/users", icon: UserRound },
  { label: "Duyurular", path: "/super-admin/announcements", icon: Bell },  { label: "İletişim Mesajları", path: "/super-admin/contact-messages", icon: MessageSquareText },

  { label: "AI API Ayarları", path: "/super-admin/ai-settings", icon: BrainCircuit },
  { label: "SMS / E-posta", path: "/super-admin/notifications", icon: Mail },
  { label: "Genel Ayarlar", path: "/super-admin/settings", icon: Settings },
];

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

function getFirstDataArray(result) {
  const data = result?.data ?? result;

  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.sites)) return data.sites;
  if (Array.isArray(data?.users)) return data.users;
  if (Array.isArray(data?.assignments)) return data.assignments;

  return [];
}

function getBlocksFromSite(site) {
  return Array.isArray(site?.blocks) ? site.blocks : [];
}

function calculateApartmentCount(site) {
  return getBlocksFromSite(site).reduce((total, block) => {
    return total + Number(block?._count?.apartments ?? 0);
  }, 0);
}

function getBuildingType(site) {
  const blockCount = getBlocksFromSite(site).length;
  return blockCount > 1 ? "Site" : "Tek Apartman";
}

function getManagerNameForSite(site, assignments) {
  const blocks = getBlocksFromSite(site);

  const assignment = assignments.find((item) => {
    if (item.scopeType === "SITE" && item.siteId === site.id) {
      return true;
    }

    if (item.scopeType === "BLOCK") {
      return blocks.some((block) => block.id === item.blockId);
    }

    return false;
  });

  return assignment?.manager?.fullName ?? "Yönetici atanmadı";
}

function mapSiteToBuilding(site, assignments = []) {
  const blocks = getBlocksFromSite(site);
  const blockInfo = blocks.map((block) => block.name).join(", ");

  return {
    id: site.id,
    name: site.name,
    type: getBuildingType(site),
    address: site.address,
    blocks: blocks.length || 1,
    blockInfo,
    apartments: calculateApartmentCount(site),
    manager: getManagerNameForSite(site, assignments),
    elevator: site.hasElevator ? "Var" : "Yok",
    systems: Array.isArray(site.systems) ? site.systems : [],
    description: site.description ?? "",
    status: site.isActive === false ? "Pasif" : "Aktif",
    image: site.imageUrl
    ? `${getSiteImageUrl(site.id)}?v=${encodeURIComponent(
      site.updatedAt ?? site.imageUrl
    )}`
    : "",
    rawSite: site,
  };
}

function getBlockNamesFromForm(formData) {
  if (formData.type === "Site" || formData.type === "Rezidans") {
    return formData.blockInfo
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }

  const singleBlockName = formData.name.trim();
  return singleBlockName ? [singleBlockName] : [];
}

function getSafeBlockNames(formData) {
  const blockNames = getBlockNamesFromForm(formData);

  if (blockNames.length > 0) {
    return blockNames;
  }

  return [`${formData.name.trim()} Blok`];
}

function buildSitePayload(formData, isUpdate = false) {
  const payload = {
    name: formData.name.trim(),
    address: formData.address.trim(),
    hasElevator: formData.elevator !== "Yok",
    systems: Array.isArray(formData.systems) ? formData.systems : [],
  };

  const description = formData.description.trim();

  if (description) {
    payload.description = description;
  } else if (isUpdate) {
    payload.description = null;
  }

  return payload;
}

function getApartmentTargetCount(formData) {
  const count = Number(formData.apartments);

  if (!Number.isFinite(count) || count < 0) {
    return 0;
  }

  return Math.floor(count);
}

function getCurrentApartmentCountFromBlocks(blocks) {
  if (!Array.isArray(blocks)) {
    return 0;
  }

  return blocks.reduce((total, block) => {
    return total + Number(block?._count?.apartments ?? 0);
  }, 0);
}

function getTargetCountForBlock(totalApartments, blockIndex, blockCount) {
  const baseCount = Math.floor(totalApartments / blockCount);
  const remainder = totalApartments % blockCount;

  return blockIndex < remainder ? baseCount + 1 : baseCount;
}

async function createMissingApartmentsForBlocks(blocks, totalApartments) {
  if (!Array.isArray(blocks) || blocks.length === 0 || totalApartments <= 0) {
    return;
  }

  for (let blockIndex = 0; blockIndex < blocks.length; blockIndex += 1) {
    const block = blocks[blockIndex];
    const currentCount = Number(block?._count?.apartments ?? 0);
    const targetCount = getTargetCountForBlock(
      totalApartments,
      blockIndex,
      blocks.length
    );

    if (targetCount <= currentCount) {
      continue;
    }

    for (
      let apartmentNumber = currentCount + 1;
      apartmentNumber <= targetCount;
      apartmentNumber += 1
    ) {
      await createApartment({
        blockId: block.id,
        number: String(apartmentNumber),
        floor: Math.ceil(apartmentNumber / 4),
        description: "",
      });
    }
  }
}

async function createBlocksForSite(siteId, formData) {
  const createdBlocks = [];

  for (const blockName of getSafeBlockNames(formData)) {
    const result = await createBlock({
      siteId,
      name: blockName,
      description: "",
    });

    createdBlocks.push({
      ...(result?.data ?? result),
      _count: {
        apartments: 0,
      },
    });
  }

  return createdBlocks;
}

async function syncBlocksForSite(site, formData) {
  const currentBlocks = getBlocksFromSite(site);
  const nextBlockNames = getSafeBlockNames(formData);
  const syncedBlocks = [];

  for (let index = 0; index < nextBlockNames.length; index += 1) {
    const blockName = nextBlockNames[index];
    const existingBlock = currentBlocks[index];

    if (existingBlock) {
      const result = await updateBlock(existingBlock.id, {
        name: blockName,
        description: existingBlock.description ?? "",
      });

      syncedBlocks.push({
        ...existingBlock,
        ...(result?.data ?? result),
      });

      continue;
    }

    const result = await createBlock({
      siteId: site.id,
      name: blockName,
      description: "",
    });

    syncedBlocks.push({
      ...(result?.data ?? result),
      _count: {
        apartments: 0,
      },
    });
  }

  return syncedBlocks;
}

function BuildingsPage() {
  const { user } = useAuth();

  const [buildingList, setBuildingList] = useState([]);
  const [managers, setManagers] = useState([]);

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingBuilding, setEditingBuilding] = useState(null);
  const [selectedBuilding, setSelectedBuilding] = useState(null);

  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState("Tümü");

  const [formData, setFormData] = useState(emptyFormData);
  const [previewImage, setPreviewImage] = useState("");
  const [selectedImageFile, setSelectedImageFile] = useState(null);

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  async function loadSites() {
    const [sitesResult, usersResult, assignmentsResult] = await Promise.all([
      getSites({ limit: 100 }),
      getUsers({ limit: 100 }),
      getManagerAssignments(),
    ]);

    const sites = getFirstDataArray(sitesResult);
    const users = getFirstDataArray(usersResult);
    const assignments = getFirstDataArray(assignmentsResult);
    const managerUsers = users.filter((item) => item.role === "MANAGER");

    setManagers(managerUsers);
    setBuildingList(sites.map((site) => mapSiteToBuilding(site, assignments)));
  }

  useEffect(() => {
    let isMounted = true;

    async function loadInitialData() {
      try {
        setIsLoading(true);
        setErrorMessage("");

        const [sitesResult, usersResult, assignmentsResult] = await Promise.all([
          getSites({ limit: 100 }),
          getUsers({ limit: 100 }),
          getManagerAssignments(),
        ]);

        if (isMounted) {
          const sites = getFirstDataArray(sitesResult);
          const users = getFirstDataArray(usersResult);
          const assignments = getFirstDataArray(assignmentsResult);
          const managerUsers = users.filter((item) => item.role === "MANAGER");

          setManagers(managerUsers);
          setBuildingList(
            sites.map((site) => mapSiteToBuilding(site, assignments))
          );
        }
      } catch (error) {
        if (isMounted) {
          setErrorMessage(
            error?.message ?? "Site / apartman kayıtları alınamadı."
          );
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadInitialData();

    return () => {
      isMounted = false;
    };
  }, []);

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
    setSelectedImageFile(null);
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
      setErrorMessage("Lütfen PNG, JPG, JPEG veya WEBP formatında görsel seçiniz.");
      setMessage("");
      return;
    }

    if (file.size > maxImageSize) {
      event.target.value = "";
      setErrorMessage("Site / apartman görseli en fazla 5 MB olabilir.");
      setMessage("");
      return;
    }

    const imageUrl = URL.createObjectURL(file);

    setSelectedImageFile(file);
    setPreviewImage(imageUrl);
    setErrorMessage("");
  }

  async function assignManagerToSite(siteId) {
    if (!formData.manager) {
      return;
    }

    try {
      await createManagerAssignment({
        managerId: formData.manager,
        scopeType: "SITE",
        siteId,
      });
    } catch (assignmentError) {
      const assignmentMessage = assignmentError?.message ?? "";

      if (!assignmentMessage.includes("zaten")) {
        throw assignmentError;
      }
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (!formData.name.trim()) {
      setErrorMessage("Site / apartman ismi zorunludur.");
      setMessage("");
      return;
    }

    if (!formData.address.trim()) {
      setErrorMessage("Adres bilgisi zorunludur.");
      setMessage("");
      return;
    }

    try {
      setIsSaving(true);
      setMessage("");
      setErrorMessage("");

      const isUpdate = Boolean(editingBuilding);
      const payload = buildSitePayload(formData, isUpdate);

      const result = isUpdate
        ? await updateSite(editingBuilding.id, payload)
        : await createSite(payload);

      let savedSite = result?.data ?? result;
      const targetApartmentCount = getApartmentTargetCount(formData);
      const warningMessages = [];

      if (!isUpdate) {
        const createdBlocks = await createBlocksForSite(savedSite.id, formData);
        await createMissingApartmentsForBlocks(
          createdBlocks,
          targetApartmentCount
        );
        await assignManagerToSite(savedSite.id);
      } else {
        const syncedBlocks = await syncBlocksForSite(
          editingBuilding.rawSite,
          formData
        );

        const currentApartmentCount = getCurrentApartmentCountFromBlocks(
          editingBuilding.rawSite?.blocks ?? []
        );

        if (targetApartmentCount > currentApartmentCount) {
          await createMissingApartmentsForBlocks(
            syncedBlocks,
            targetApartmentCount
          );
        }

        if (targetApartmentCount < currentApartmentCount) {
          warningMessages.push(
            "Daire sayısı mevcut sayıdan düşük girildi. Güvenlik için mevcut daireler otomatik silinmedi."
          );
        }

        await assignManagerToSite(editingBuilding.id);
      }

      if (selectedImageFile) {
        const imageResult = await uploadSiteImage(savedSite.id, selectedImageFile);
        savedSite = imageResult?.data ?? savedSite;
      }

      await loadSites();

      const successMessage = isUpdate
        ? "Site / apartman bilgileri başarıyla güncellendi."
        : "Site / apartman başarıyla oluşturuldu.";

      setMessage([successMessage, ...warningMessages].join(" "));
      closeForm();
    } catch (error) {
      setErrorMessage(error?.message ?? "Site / apartman kaydı kaydedilemedi.");
    } finally {
      setIsSaving(false);
    }
  }

  function handleEdit(building) {
    setEditingBuilding(building);

    setFormData({
      type: building.type,
      name: building.name,
      apartments: String(building.apartments),
      manager: "",
      blockInfo: building.blockInfo,
      elevator: building.elevator,
      address: building.address,
      description: building.description,
      systems: Array.isArray(building.systems) ? building.systems : [],
    });

    setPreviewImage(building.image);
    setSelectedImageFile(null);
    setIsFormOpen(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function handleToggleStatus(building) {
    const nextIsActive = building.status !== "Aktif";

    const confirmMessage =
      building.status === "Aktif"
        ? `${building.name} kaydını pasifleştirmek istiyor musunuz?`
        : `${building.name} kaydını tekrar aktifleştirmek istiyor musunuz?`;

    const isConfirmed = window.confirm(confirmMessage);

    if (!isConfirmed) {
      return;
    }

    try {
      setMessage("");
      setErrorMessage("");

      await updateSite(building.id, {
        isActive: nextIsActive,
      });

      await loadSites();

      setMessage(
        nextIsActive
          ? "Site / apartman tekrar aktifleştirildi."
          : "Site / apartman pasifleştirildi."
      );
    } catch (error) {
      setErrorMessage(
        error?.message ??
          "Site durumu güncellenemedi. Backend tarafında isActive alanı eklenmiş olmalıdır."
      );
    }
  }

  return (
    <DashboardLayout
      roleTitle="Site / Apartmanlar"
      roleBadge="Süper Admin"
      userName={user?.fullName ?? "Süper Admin"}
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
          disabled={isSaving}
        >
          <Plus size={18} />
          Yeni Site / Apartman
        </button>
      </div>

      {errorMessage && (
        <div className="login-error-message">
          <p>{errorMessage}</p>
        </div>
      )}

      {message && (
        <div className="login-success-message">
          <p>{message}</p>
        </div>
      )}

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
          isSaving={isSaving}
        />
      )}

      <BuildingToolbar
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        typeFilter={typeFilter}
        setTypeFilter={setTypeFilter}
      />

      {isLoading ? (
        <div className="dashboard-panel">
          <p>Site / apartman kayıtları yükleniyor...</p>
        </div>
      ) : filteredBuildings.length > 0 ? (
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
      ) : (
        <div className="dashboard-panel">
          <p>Kayıt bulunamadı.</p>
        </div>
      )}

      <BuildingDetailsModal
        building={selectedBuilding}
        onClose={() => setSelectedBuilding(null)}
      />
    </DashboardLayout>
  );
}

export default BuildingsPage;


