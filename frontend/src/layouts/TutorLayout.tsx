import { ROUTES } from "@/constants/routes";
import { TUTOR_NAV } from "@/features/tutor/data/nav";
import { PortalLayout } from "@/layouts/PortalLayout";

/**
 * TutorLayout
 *
 * Khung của mọi trang /tutor/* (đã được PrivateRoute + RoleRoute chặn theo vai trò ở AppRouter).
 */
export function TutorLayout() {
  return <PortalLayout areaLabel="Khu gia sư" homeTo={ROUTES.tutor} profileTo={ROUTES.tutorProfile} navItems={TUTOR_NAV} />;
}
