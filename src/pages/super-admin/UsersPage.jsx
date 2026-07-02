import { useMemo, useState } from "react";
import DashboardLayout from "../../layouts/DashboardLayout";
import {
  BarChart3,
  Bell,
  BrainCircuit,
  Building2,
  Mail,
  Settings,
  UserRound,
  Users,
} from "lucide-react";

import UserToolbar from "../../components/users/UserToolbar";
import UserTable from "../../components/users/UserTable";
import UserDetailsModal from "../../components/users/UserDetailsModal";

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

const initialUsers = [
  {
    id: 1,
    name: "Ali Can",
    role: "Kiracı",
    email: "ali.can@example.com",
    phone: "0555 444 55 66",
    site: "Mavi Site",
    block: "A Blok",
    apartment: "Daire 5",
    createdByManager: "Ahmet Yılmaz",
    status: "Aktif",
    createdAt: "30.06.2026",
    totalDebt: "2.500 TL",
    paidAmount: "1.250 TL",
    remainingDebt: "1.250 TL",
    lastPaymentDate: "10.06.2026",
    paymentStatus: "Gecikmiş ödeme var",
  },
  {
    id: 2,
    name: "Ayşe Demir",
    role: "Ev Sahibi",
    email: "ayse.demir@example.com",
    phone: "0555 777 88 99",
    site: "Mavi Site",
    block: "A Blok",
    apartment: "Daire 2",
    createdByManager: "Ahmet Yılmaz",
    status: "Aktif",
    createdAt: "29.06.2026",
    totalDebt: "1.250 TL",
    paidAmount: "1.250 TL",
    remainingDebt: "0 TL",
    lastPaymentDate: "05.06.2026",
    paymentStatus: "Ödeme tamamlandı",
  },
  {
    id: 3,
    name: "Mehmet Kaya",
    role: "Kiracı",
    email: "mehmet.kaya@example.com",
    phone: "0555 222 11 00",
    site: "Güneş Apartmanı",
    block: "Tek Apartman",
    apartment: "Daire 8",
    createdByManager: "Elif Demir",
    status: "Onay Bekliyor",
    createdAt: "30.06.2026",
    totalDebt: "1.800 TL",
    paidAmount: "0 TL",
    remainingDebt: "1.800 TL",
    lastPaymentDate: "-",
    paymentStatus: "Ödeme bekleniyor",
  },
  {
    id: 4,
    name: "Zeynep Aydın",
    role: "Ev Sahibi",
    email: "zeynep.aydin@example.com",
    phone: "0555 333 44 55",
    site: "Deniz Rezidans",
    block: "Kule A",
    apartment: "Daire 3",
    createdByManager: "Mehmet Kaya",
    status: "Pasif",
    createdAt: "28.06.2026",
    totalDebt: "3.000 TL",
    paidAmount: "2.000 TL",
    remainingDebt: "1.000 TL",
    lastPaymentDate: "02.06.2026",
    paymentStatus: "Kısmi ödeme yapıldı",
  },
];

function UsersPage() {
  const [userList] = useState(initialUsers);
  const [selectedUser, setSelectedUser] = useState(null);

  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("Tümü");
  const [statusFilter, setStatusFilter] = useState("Tümü");

  const filteredUsers = useMemo(() => {
    const searchValue = searchTerm.trim().toLowerCase();

    return userList.filter((user) => {
      const searchableText = [
        user.name,
        user.email,
        user.phone,
        user.site,
        user.block,
        user.apartment,
        user.createdByManager,
        user.role,
        user.status,
        user.paymentStatus,
      ]
        .join(" ")
        .toLowerCase();

      const matchesSearch = searchableText.includes(searchValue);

      const matchesRole =
        roleFilter === "Tümü" ? true : user.role === roleFilter;

      const matchesStatus =
        statusFilter === "Tümü" ? true : user.status === statusFilter;

      return matchesSearch && matchesRole && matchesStatus;
    });
  }, [userList, searchTerm, roleFilter, statusFilter]);

  return (
    <DashboardLayout
      roleTitle="Kullanıcılar / Sakinler"
      roleBadge="Süper Admin"
      userName="Alaa"
      navItems={navItems}
      theme="super-admin"
    >
      <div className="dashboard-page-header">
        <div>
          <span className="section-kicker">Kullanıcı Yönetimi</span>

          <h2>Kullanıcılar ve Sakinler</h2>

          <p>
            Yöneticiler tarafından eklenen kiracı ve ev sahibi kayıtlarını,
            daire bağlantılarını ve ödeme özetlerini buradan takip edebilirsiniz.
          </p>
        </div>
      </div>

      <UserToolbar
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        roleFilter={roleFilter}
        setRoleFilter={setRoleFilter}
        statusFilter={statusFilter}
        setStatusFilter={setStatusFilter}
      />

      <UserTable users={filteredUsers} onView={setSelectedUser} />

      <UserDetailsModal
        user={selectedUser}
        onClose={() => setSelectedUser(null)}
      />
    </DashboardLayout>
  );
}

export default UsersPage;