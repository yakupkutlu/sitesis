import { useAuth } from "../../hooks/useAuth";
import { useCallback, useEffect, useState } from "react";
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

import ApartmentToolbar from "../../components/apartments/ApartmentToolbar";
import ApartmentTable from "../../components/apartments/ApartmentTable";
import ApartmentDetailsModal from "../../components/apartments/ApartmentDetailsModal";

import { getApartments } from "../../api/apartmentsApi";
import { getBlocks } from "../../api/blocksApi";


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

const PAGE_SIZE = 10;

const emptyPagination = {
  page: 1,
  limit: PAGE_SIZE,
  totalCount: 0,
  totalPages: 1,
};

function getDataArray(result) {
  const data = result?.data ?? result;

  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.items)) return data.items;
  if (Array.isArray(data?.apartments)) return data.apartments;
  if (Array.isArray(data?.blocks)) return data.blocks;

  return [];
}

function getPagination(result) {
  return result?.pagination ?? result?.data?.pagination ?? emptyPagination;
}

function formatDate(value) {
  if (!value) return "-";

  try {
    return new Date(value).toLocaleDateString("tr-TR");
  } catch {
    return "-";
  }
}

function formatFloor(floor) {
  if (floor === null || floor === undefined || floor === "") {
    return "-";
  }

  return `${floor}. Kat`;
}

function mapApartmentToViewModel(apartment) {
  const residentCount = apartment._count?.residents ?? 0;
  const paymentAllocationCount = apartment._count?.paymentAllocations ?? 0;

  return {
    id: apartment.id,
    apartmentNo: `Daire ${apartment.number}`,
    number: apartment.number,
    site: apartment.block?.site?.name ?? "-",
    block: apartment.block?.name ?? "-",
    blockId: apartment.block?.id ?? apartment.blockId ?? "",
    floor: formatFloor(apartment.floor),
    status: residentCount > 0 ? "Dolu" : "Boş",
    usageType: residentCount > 0 ? `${residentCount} sakin bağlı` : "Boş",
    residentName: residentCount > 0 ? `${residentCount} sakin` : "-",
    phone: "-",
    paymentStatus:
      paymentAllocationCount > 0 ? `${paymentAllocationCount} ödeme kaydı` : "Yok",
    note: apartment.description || "Açıklama bulunmuyor.",
    createdAt: formatDate(apartment.createdAt),
    rawApartment: apartment,
  };
}

function PaginationControls({
  pagination,
  isLoading,
  onPreviousPage,
  onNextPage,
}) {
  const totalPages = Math.max(1, pagination.totalPages || 1);
  const currentPage = Math.min(pagination.page || 1, totalPages);

  return (
    <div className="dashboard-panel">
      <div className="form-actions">
        <button
          type="button"
          className="secondary-form-button"
          onClick={onPreviousPage}
          disabled={isLoading || currentPage <= 1}
        >
          Önceki
        </button>

        <span>
          Sayfa {currentPage} / {totalPages} — Toplam{" "}
          {pagination.totalCount || 0} daire
        </span>

        <button
          type="button"
          className="secondary-form-button"
          onClick={onNextPage}
          disabled={isLoading || currentPage >= totalPages}
        >
          Sonraki
        </button>
      </div>
    </div>
  );
}

function ApartmentsPage() {
  const { user } = useAuth();

  const [apartments, setApartments] = useState([]);
  const [blockOptions, setBlockOptions] = useState([]);
  const [selectedApartment, setSelectedApartment] = useState(null);

  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [blockFilter, setBlockFilter] = useState("ALL_BLOCKS");

  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState(emptyPagination);

  const [isLoading, setIsLoading] = useState(true);
  const [isOptionsLoading, setIsOptionsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  const loadApartments = useCallback(
    async (page, search) => {
      const params = {
        page,
        limit: PAGE_SIZE,
      };

      if (search) {
        params.search = search;
      }

      if (blockFilter !== "ALL_BLOCKS") {
        params.blockId = blockFilter;
      }

      const result = await getApartments(params);

      setApartments(getDataArray(result).map(mapApartmentToViewModel));
      setPagination({
        ...emptyPagination,
        ...getPagination(result),
      });
    },
    [blockFilter]
  );

  useEffect(() => {
    let isMounted = true;

    async function loadBlocks() {
      try {
        setIsOptionsLoading(true);

        const result = await getBlocks({ limit: 100 });

        if (isMounted) {
          setBlockOptions(getDataArray(result));
        }
      } catch (error) {
        if (isMounted) {
          setErrorMessage(error?.message ?? "Blok listesi alınamadı.");
        }
      } finally {
        if (isMounted) {
          setIsOptionsLoading(false);
        }
      }
    }

    loadBlocks();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    const timerId = window.setTimeout(() => {
      setCurrentPage(1);
      setDebouncedSearchTerm(searchTerm.trim());
    }, 400);

    return () => {
      window.clearTimeout(timerId);
    };
  }, [searchTerm]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setCurrentPage(1);
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [blockFilter]);

  useEffect(() => {
    let isMounted = true;

    async function loadData() {
      try {
        setIsLoading(true);
        setErrorMessage("");

        await loadApartments(currentPage, debouncedSearchTerm);
      } catch (error) {
        if (isMounted) {
          setErrorMessage(error?.message ?? "Daireler alınamadı.");
          setApartments([]);
          setPagination(emptyPagination);
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    loadData();

    return () => {
      isMounted = false;
    };
  }, [currentPage, debouncedSearchTerm, loadApartments]);

  function goToPreviousPage() {
    setCurrentPage((page) => Math.max(1, page - 1));
  }

  function goToNextPage() {
    setCurrentPage((page) =>
      Math.min(Math.max(1, pagination.totalPages || 1), page + 1)
    );
  }

  return (
    <DashboardLayout
      roleTitle="Daireler"
      roleBadge="Yönetici"
      userName={user?.fullName ?? "Yönetici"}
      navItems={navItems}
      theme="manager"
    >
      <div className="dashboard-page-header">
        <div>
          <span className="section-kicker">Daire Yönetimi</span>

          <h2>Daireler</h2>

          <p>
            Sadece size atanmış site, blok ve daire kayıtlarını buradan
            görüntüleyebilirsiniz. Daire oluşturma ve yapısal değişiklikler
            Süper Admin tarafından yönetilir.
          </p>
        </div>
      </div>

      {errorMessage && (
        <div className="login-error-message">
          <p>{errorMessage}</p>
        </div>
      )}

      <ApartmentToolbar
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        blockFilter={blockFilter}
        setBlockFilter={setBlockFilter}
        blockOptions={blockOptions}
        isLoading={isLoading || isOptionsLoading}
      />

      {isLoading ? (
        <div className="dashboard-panel">
          <p>Daireler yükleniyor...</p>
        </div>
      ) : apartments.length > 0 ? (
        <>
          <ApartmentTable
            apartments={apartments}
            onView={setSelectedApartment}
          />

          <PaginationControls
            pagination={pagination}
            isLoading={isLoading}
            onPreviousPage={goToPreviousPage}
            onNextPage={goToNextPage}
          />
        </>
      ) : (
        <div className="dashboard-panel">
          <p>Daire bulunamadı.</p>
        </div>
      )}

      <ApartmentDetailsModal
        apartment={selectedApartment}
        onClose={() => setSelectedApartment(null)}
      />
    </DashboardLayout>
  );
}

export default ApartmentsPage;
