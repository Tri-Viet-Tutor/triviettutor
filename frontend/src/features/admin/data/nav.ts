import { ROUTES } from "@/constants/routes";
import type { PortalNavItem } from "@/features/portal/data/ui";

/** Các trang của khu quản trị. Ở điện thoại, Hồ sơ mở bằng nút tài khoản trên thanh trên. */
export const ADMIN_NAV: PortalNavItem[] = [
  { to: ROUTES.admin, label: "Tổng quan", icon: "home", end: true },
  { to: ROUTES.adminUsers, label: "Người dùng", icon: "group" },
  { to: ROUTES.adminSessions, label: "Buổi học", icon: "calendar_month" },
  { to: ROUTES.adminLeaveRequests, label: "Đơn xin nghỉ", shortLabel: "Đơn nghỉ", icon: "event_busy" },
  { to: ROUTES.adminAssignments, label: "Phân công gia sư", shortLabel: "Phân công", icon: "assignment_ind" },
  { to: ROUTES.adminPayments, label: "Thanh toán", icon: "payments", desktopOnly: true },
  { to: ROUTES.adminProfile, label: "Hồ sơ", icon: "person", desktopOnly: true },
];
