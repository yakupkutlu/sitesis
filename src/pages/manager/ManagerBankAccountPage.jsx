import SiteBankAccountSettings from "../../components/bank/SiteBankAccountSettings";
import { managerNavItems } from "../../config/managerNavigation";

function ManagerBankAccountPage() {
  return (
    <SiteBankAccountSettings
      roleBadge="Yönetici"
      navItems={managerNavItems}
      theme="manager"
      themeStorageKey="managerThemeMode"
    />
  );
}

export default ManagerBankAccountPage;
