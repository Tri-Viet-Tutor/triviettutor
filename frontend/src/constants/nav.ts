import { ROUTES } from "@/constants/routes";
import type { PortalNavItem } from "@/interfaces/ui";

/* Các mục trên thanh điều hướng của khu quản trị, gia sư và học viên. */

/** Các trang của khu quản trị. Ở điện thoại, Hồ sơ mở bằng nút tài khoản trên thanh trên. */
export const ADMIN_NAV: PortalNavItem[] = [
  { to: ROUTES.admin, label: "Tổng quan", icon: "home", end: true },
  { to: ROUTES.adminUsers, label: "Người dùng", icon: "group" },
  { to: ROUTES.adminSessions, label: "Buổi học", icon: "calendar_month" },
  { to: ROUTES.adminReschedules, label: "Duyệt nghỉ / xếp bù", shortLabel: "Duyệt nghỉ", icon: "event_busy" },
  { to: ROUTES.adminAssignments, label: "Phân công gia sư", shortLabel: "Phân công", icon: "assignment_ind" },
  { to: ROUTES.adminProfile, label: "Hồ sơ", icon: "person", desktopOnly: true },
];

/** Các trang của khu học viên — thanh bên (máy tính) và thanh dưới (điện thoại) dùng chung */
export const STUDENT_NAV: PortalNavItem[] = [
  { to: ROUTES.student, label: "Tổng quan", icon: "home", end: true },
  { to: ROUTES.studentSchedule, label: "Lịch học", icon: "calendar_month" },
  { to: ROUTES.studentCatalog, label: "Khóa học đang mở", shortLabel: "Khóa học", icon: "storefront" },
  { to: ROUTES.studentLeave, label: "Xin nghỉ", icon: "event_busy" },
  { to: ROUTES.studentProfile, label: "Hồ sơ", icon: "person" },
];

/** Các trang của khu gia sư */
export const TUTOR_NAV: PortalNavItem[] = [
  { to: ROUTES.tutor, label: "Tổng quan", icon: "home", end: true },
  { to: ROUTES.tutorSessions, label: "Lịch dạy", icon: "calendar_month" },
  { to: ROUTES.tutorAvailability, label: "Lịch rảnh", icon: "event_available" },
  { to: ROUTES.tutorLeave, label: "Xin nghỉ", icon: "event_busy" },
  { to: ROUTES.tutorProfile, label: "Hồ sơ", icon: "person" },
];
