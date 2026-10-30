import { ROUTES } from "@/constants/routes";
import { ADMIN_NAV } from "@/constants/nav";
import { PortalLayout } from "@/layouts/PortalLayout";

/**
 * Khung của mọi trang /admin/* (đã được PrivateRoute + RoleRoute chặn theo vai trò ở AppRouter).
 * Lớp `font-admin` đổi phông của cả khu quản trị sang Inter (xem styles/index.css).
 */
export function AdminLayout() {
  return (
    <div className="font-admin">
      <PortalLayout areaLabel="Quản trị viên" homeTo={ROUTES.admin} profileTo={ROUTES.adminProfile} navItems={ADMIN_NAV} />
    </div>
  );
}
