import { useAuth } from "../../hooks/useAuth";
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
  createSiteWithStructure,
  getSiteImageUrl,
  getSites,
  updateSite,
  uploadSiteImage,
} from "../../api/sitesApi";

import { createBlock, updateBlock } from "../../api/blocksApi";
import { createApartment } from "../../api/apartmentsApi";
import { getUsers } from "../../api/usersApi";
import { getManagerAssignments } from "../../api/managerAssignmentsApi";

const navItems = [
  { label: "Panel", path: "/super-admin/dashboard", icon: BarChart3 },
  {
    label: "Site / Apartmanlar",
    path: "/super-admin/buildings",
    icon: Building2,
  },
  { label: "Yöneticiler", path: "/super-admin/managers", icon: Users },
  {
    label: "Kullanıcılar / Sakinler",
    path: "/super-admin/users",
    icon: UserRound,
  },
  {
    label: "Duyurular",
    path: "/super-admin/announcements",
    icon: Bell,
  },
  {
    label: "İletişim Mesajları",
    path: "/super-admin/contact-messages",
    icon: MessageSquareText,
  },
  {
    label: "AI API Ayarları",
    path: "/super-admin/ai-settings",
    icon: BrainCircuit,
  },
  {
    label: "SMS / E-posta",
    path: "/super-admin/notifications",
    icon: Mail,
  },
  {
    label: "Genel Ayarlar",
    path: "/super-admin/settings",
    icon: Settings,
  },
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

function createClientId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function createFormBlock({
  id,
  name = "",
  apartmentCount = "",
  managerId = "",
} = {}) {
  return {
    id,
    clientId: createClientId(),
    name,
    apartmentCount: String(apartmentCount ?? ""),
    managerId: managerId ?? "",
  };
}

function createEmptyFormData() {
  return {
    type: "Site",
    name: "",
    manager: "",
    blocks: [createFormBlock({ name: "A Blok" })],
    elevator: "Var",
    address: "",
    description: "",
    systems: [],
  };
}

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

function getAssignmentsForSite(site, assignments = []) {
  const blockIds = new Set(
    getBlocksFromSite(site).map((block) => block.id)
  );

  return assignments.filter((assignment) => {
    if (
      assignment.scopeType === "SITE" &&
      assignment.siteId === site.id
    ) {
      return true;
    }

    return (
      assignment.scopeType === "BLOCK" &&
      assignment.blockId &&
      blockIds.has(assignment.blockId)
    );
  });
}

function getSiteManagerAssignment(site, assignments = []) {
  return assignments.find(
    (assignment) =>
      assignment.scopeType === "SITE" &&
      assignment.siteId === site.id
  );
}

function getBlockManagerAssignment(blockId, assignments = []) {
  return assignments.find(
    (assignment) =>
      assignment.scopeType === "BLOCK" &&
      assignment.blockId === blockId
  );
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
  const managerAssignments = getAssignmentsForSite(site, assignments);

  return {
    id: site.id,
    name: site.name,
    type: getBuildingType(site),
    address: site.address,
    blocks: blocks.length || 1,
    blockInfo,
    apartments: calculateApartmentCount(site),
    manager: getManagerNameForSite(site, managerAssignments),
    managerAssignments,
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

function getNormalizedFormBlocks(formData) {
  if (!Array.isArray(formData.blocks)) {
    return [];
  }

  return formData.blocks.map((block) => ({
    id: block.id,
    name: String(block.name ?? "").trim(),
    apartmentCount: Number(block.apartmentCount),
    managerId: String(block.managerId ?? "").trim(),
  }));
}

function validateFormBlocks(formData) {
  const blocks = getNormalizedFormBlocks(formData);

  if (blocks.length === 0) {
    return "En az bir blok veya apartman eklemelisiniz.";
  }

  if (formData.type === "Tek Apartman" && blocks.length !== 1) {
    return "Tek Apartman türünde yalnızca bir blok/apartman bulunabilir.";
  }

  const normalizedNames = new Set();

  for (let index = 0; index < blocks.length; index += 1) {
    const block = blocks[index];

    if (!block.name) {
      return `${index + 1}. blok/apartman adı zorunludur.`;
    }

    if (
      !Number.isInteger(block.apartmentCount) ||
      block.apartmentCount < 1 ||
      block.apartmentCount > 1000
    ) {
      return `${block.name} için daire sayısı 1 ile 1000 arasında tam sayı olmalıdır.`;
    }

    const normalizedName = block.name.toLocaleLowerCase("tr-TR");

    if (normalizedNames.has(normalizedName)) {
      return "Aynı isimle birden fazla blok/apartman eklenemez.";
    }

    normalizedNames.add(normalizedName);

    if (
      formData.manager &&
      block.managerId &&
      formData.manager === block.managerId
    ) {
      return `${block.name} yöneticisi, site genel yöneticisiyle aynı olamaz. Genel yönetici zaten tüm siteyi görebilir.`;
    }
  }

  return "";
}

async function createMissingApartmentsForBlock(block, targetCount) {
  const currentCount = Number(block?._count?.apartments ?? 0);

  if (targetCount <= currentCount) {
    return;
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

async function syncBlocksForSite(site, formData) {
  const currentBlocks = getBlocksFromSite(site);
  const nextBlocks = getNormalizedFormBlocks(formData);
  const warningMessages = [];

  for (let index = 0; index < nextBlocks.length; index += 1) {
    const blockInput = nextBlocks[index];

    const existingBlock =
      currentBlocks.find((block) => block.id === blockInput.id) ??
      currentBlocks[index];

    if (existingBlock) {
      const result = await updateBlock(existingBlock.id, {
        name: blockInput.name,
        description: existingBlock.description ?? "",
      });

      const syncedBlock = {
        ...existingBlock,
        ...(result?.data ?? result),
      };

      const currentCount = Number(
        existingBlock?._count?.apartments ?? 0
      );

      if (blockInput.apartmentCount > currentCount) {
        await createMissingApartmentsForBlock(
          syncedBlock,
          blockInput.apartmentCount
        );
      }

      if (blockInput.apartmentCount < currentCount) {
        warningMessages.push(
          `${blockInput.name} için girilen daire sayısı mevcut sayıdan düşük. Mevcut daireler güvenlik için silinmedi.`
        );
      }

      continue;
    }

    const result = await createBlock({
      siteId: site.id,
      name: blockInput.name,
      description: "",
    });

    const createdBlock = {
      ...(result?.data ?? result),
      _count: {
        apartments: 0,
      },
    };

    await createMissingApartmentsForBlock(
      createdBlock,
      blockInput.apartmentCount
    );
  }

  return warningMessages;
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

  const [formData, setFormData] = useState(() => createEmptyFormData());
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
    const managerUsers = users.filter(
      (item) => item.role === "MANAGER" && item.status === "ACTIVE"
    );

    setManagers(managerUsers);
    setBuildingList(
      sites.map((site) => mapSiteToBuilding(site, assignments))
    );
  }

  useEffect(() => {
    let isMounted = true;

    async function loadInitialData() {
      try {
        setIsLoading(true);
        setErrorMessage("");

        const [sitesResult, usersResult, assignmentsResult] =
          await Promise.all([
            getSites({ limit: 100 }),
            getUsers({ limit: 100 }),
            getManagerAssignments(),
          ]);

        if (isMounted) {
          const sites = getFirstDataArray(sitesResult);
          const users = getFirstDataArray(usersResult);
          const assignments = getFirstDataArray(assignmentsResult);
          const managerUsers = users.filter(
            (item) =>
              item.role === "MANAGER" && item.status === "ACTIVE"
          );

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
    setFormData(createEmptyFormData());
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

    setFormData((currentData) => {
      if (
        name === "type" &&
        value === "Tek Apartman" &&
        !editingBuilding
      ) {
        return {
          ...currentData,
          type: value,
          blocks: [
            currentData.blocks?.[0] ??
              createFormBlock({ name: currentData.name }),
          ],
        };
      }

      return {
        ...currentData,
        [name]: value,
      };
    });
  }

  function handleBlockChange(index, field, value) {
    setFormData((currentData) => ({
      ...currentData,
      blocks: currentData.blocks.map((block, blockIndex) =>
        blockIndex === index
          ? {
              ...block,
              [field]: value,
            }
          : block
      ),
    }));
  }

  function handleAddBlock() {
    setFormData((currentData) => ({
      ...currentData,
      blocks: [
        ...currentData.blocks,
        createFormBlock({
          name: `${String.fromCharCode(
            65 + currentData.blocks.length
          )} Blok`,
        }),
      ],
    }));
  }

  function handleRemoveBlock(index) {
    setFormData((currentData) => {
      const targetBlock = currentData.blocks[index];

      if (
        currentData.blocks.length === 1 ||
        (editingBuilding && targetBlock?.id)
      ) {
        return currentData;
      }

      return {
        ...currentData,
        blocks: currentData.blocks.filter(
          (_, blockIndex) => blockIndex !== index
        ),
      };
    });
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
      setErrorMessage(
        "Lütfen PNG, JPG, JPEG veya WEBP formatında görsel seçiniz."
      );
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

    const blockValidationMessage = validateFormBlocks(formData);

    if (blockValidationMessage) {
      setErrorMessage(blockValidationMessage);
      setMessage("");
      return;
    }

    try {
      setIsSaving(true);
      setMessage("");
      setErrorMessage("");

      const isUpdate = Boolean(editingBuilding);
      const payload = buildSitePayload(formData, isUpdate);
      const warningMessages = [];

      if (!isUpdate) {
        const structurePayload = {
          ...payload,
          siteManagerId: formData.manager || undefined,
          blocks: getNormalizedFormBlocks(formData).map((block) => ({
            name: block.name,
            apartmentCount: block.apartmentCount,
            description: "",
            managerId: block.managerId || undefined,
          })),
        };

        const result = await createSiteWithStructure(structurePayload);
        let savedSite = result?.data ?? result;

        if (selectedImageFile) {
          try {
            const imageResult = await uploadSiteImage(
              savedSite.id,
              selectedImageFile
            );
            savedSite = imageResult?.data ?? savedSite;
          } catch (imageError) {
            warningMessages.push(
              imageError?.message ??
                "Site oluşturuldu ancak görsel yüklenemedi."
            );
          }
        }

        await loadSites();

        setMessage(
          [
            "Site, bloklar, daireler ve yönetici atamaları başarıyla oluşturuldu.",
            ...warningMessages,
          ].join(" ")
        );
        closeForm();
        return;
      }

      const result = await updateSite(editingBuilding.id, payload);
      let savedSite = result?.data ?? result;

      const blockWarnings = await syncBlocksForSite(
        editingBuilding.rawSite,
        formData
      );

      warningMessages.push(...blockWarnings);

      if (selectedImageFile) {
        const imageResult = await uploadSiteImage(
          savedSite.id,
          selectedImageFile
        );
        savedSite = imageResult?.data ?? savedSite;
      }

      await loadSites();

      setMessage(
        [
          "Site / apartman bilgileri başarıyla güncellendi.",
          ...warningMessages,
        ].join(" ")
      );
      closeForm();
    } catch (error) {
      setErrorMessage(
        error?.message ?? "Site / apartman kaydı kaydedilemedi."
      );
    } finally {
      setIsSaving(false);
    }
  }

  function handleEdit(building) {
    setEditingBuilding(building);

    const assignments = building.managerAssignments ?? [];
    const siteManagerAssignment = getSiteManagerAssignment(
      building.rawSite,
      assignments
    );

    const siteBlocks = getBlocksFromSite(building.rawSite).map((block) => {
      const blockManagerAssignment = getBlockManagerAssignment(
        block.id,
        assignments
      );

      return createFormBlock({
        id: block.id,
        name: block.name,
        apartmentCount: block?._count?.apartments ?? 0,
        managerId: blockManagerAssignment?.managerId ?? "",
      });
    });

    setFormData({
      type: building.type,
      name: building.name,
      manager: siteManagerAssignment?.managerId ?? "",
      blocks:
        siteBlocks.length > 0
          ? siteBlocks
          : [createFormBlock({ name: building.name })],
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
          onBlockChange={handleBlockChange}
          onAddBlock={handleAddBlock}
          onRemoveBlock={handleRemoveBlock}
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
