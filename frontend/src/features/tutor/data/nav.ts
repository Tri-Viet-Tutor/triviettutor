import { ROUTES } from "@/constants/routes";
import type { PortalNavItem } from "@/features/portal/data/ui";

/** Các trang của khu gia sư */
export const TUTOR_NAV: PortalNavItem[] = [
  { to: ROUTES.tutor, label: "Tổng quan", icon: "home", end: true },
  { to: ROUTES.tutorSessions, label: "Lịch dạy", icon: "calendar_month" },
  { to: ROUTES.tutorAvailability, label: "Lịch rảnh", icon: "event_available" },
  { to: ROUTES.tutorLeave, label: "Xin nghỉ", icon: "event_busy" },
  { to: ROUTES.tutorProfile, label: "Hồ sơ", icon: "person" },
];
