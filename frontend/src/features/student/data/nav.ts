import { ROUTES } from "@/constants/routes";
import type { PortalNavItem } from "@/features/portal/data/ui";

/** Các trang của khu học viên — thanh bên (máy tính) và thanh dưới (điện thoại) dùng chung */
export const STUDENT_NAV: PortalNavItem[] = [
  { to: ROUTES.student, label: "Tổng quan", icon: "home", end: true },
  { to: ROUTES.studentSchedule, label: "Lịch học", icon: "calendar_month" },
  { to: ROUTES.studentCourses, label: "Mua khóa học", shortLabel: "Khóa học", icon: "storefront" },
  { to: ROUTES.studentLeave, label: "Xin nghỉ", icon: "event_busy" },
  { to: ROUTES.studentProfile, label: "Hồ sơ", icon: "person" },
];
