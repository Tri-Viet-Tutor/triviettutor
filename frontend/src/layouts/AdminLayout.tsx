import { ROUTES } from "@/constants/routes";
import { ADMIN_NAV } from "@/features/admin/data/nav";
import { PortalLayout } from "@/layouts/PortalLayout";

/**
 * AdminLayout
 *
 * Khung của mọi trang /admin/* (đã được PrivateRoute + RoleRoute chặn theo vai trò ở AppRouter).
 */
export function AdminLayout() {
  return <PortalLayout areaLabel="Khu quản trị" homeTo={ROUTES.admin} profileTo={ROUTES.adminProfile} navItems={ADMIN_NAV} />;
}
