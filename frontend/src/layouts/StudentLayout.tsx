import { ROUTES } from "@/constants/routes";
import { STUDENT_NAV } from "@/constants/nav";
import { PortalLayout } from "@/layouts/PortalLayout";

/**
 * Khung của mọi trang /student/* (đã được PrivateRoute + RoleRoute chặn theo vai trò ở AppRouter).
 * Mua khóa học và thanh toán cũng nằm trong khu này.
 */
export function StudentLayout() {
  return <PortalLayout areaLabel="Khu học viên" homeTo={ROUTES.student} profileTo={ROUTES.studentProfile} navItems={STUDENT_NAV} />;
}
