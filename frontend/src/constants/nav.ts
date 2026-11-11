import { ROUTES } from "@/constants/routes";
import type { PortalNavItem } from "@/interfaces/ui";

/* Các mục trên thanh điều hướng của khu quản trị, gia sư và học viên. */

/** Các trang của khu quản trị. Hồ sơ mở từ menu avatar trên thanh trên. */
export const ADMIN_NAV: PortalNavItem[] = [
  { to: ROUTES.admin, label: "Tổng quan", icon: "home", end: true },
  { to: ROUTES.adminUsers, label: "Người dùng", icon: "group" },
  { to: ROUTES.adminSessions, label: "Buổi học", icon: "calendar_month" },
  { to: ROUTES.adminReschedules, label: "Duyệt nghỉ / xếp bù", shortLabel: "Duyệt nghỉ", icon: "event_busy" },
  { to: ROUTES.adminAssignments, label: "Phân công dạy thay", shortLabel: "Dạy thay", icon: "assignment_ind" },
  { to: ROUTES.adminCourses, label: "Khóa học", icon: "menu_book", desktopOnly: true },
  { to: ROUTES.adminClasses, label: "Lớp học", icon: "school", desktopOnly: true },
  { to: ROUTES.adminPayments, label: "Thanh toán", icon: "payments", desktopOnly: true },
  { to: ROUTES.adminPayroll, label: "Bảng lương", icon: "account_balance_wallet", desktopOnly: true },
  { to: ROUTES.adminReviews, label: "Đánh giá gia sư", icon: "reviews", desktopOnly: true },
  { to: ROUTES.adminSettings, label: "Cài đặt hệ thống", shortLabel: "Cài đặt", icon: "settings", desktopOnly: true },
];

/** Các trang của khu học viên. Hồ sơ mở từ menu avatar trên thanh trên. */
export const STUDENT_NAV: PortalNavItem[] = [
  { to: ROUTES.student, label: "Tổng quan", icon: "home", end: true },
  { to: ROUTES.studentSchedule, label: "Lịch học", icon: "calendar_month" },
  { to: ROUTES.studentEnrollments, label: "Lớp của tôi", shortLabel: "Lớp", icon: "local_library" },
  { to: ROUTES.studentHomework, label: "Bài tập", icon: "assignment" },
  { to: ROUTES.studentFeedback, label: "Đánh giá", icon: "reviews", desktopOnly: true },
  { to: ROUTES.studentCatalog, label: "Khóa học đang mở", shortLabel: "Khóa học", icon: "storefront" },
  { to: ROUTES.studentLeave, label: "Xin nghỉ", icon: "event_busy" },
  { to: ROUTES.studentWallet, label: "Ví của tôi", shortLabel: "Ví", icon: "account_balance_wallet" },
];

/** Các trang của khu gia sư. Hồ sơ mở từ menu avatar trên thanh trên. */
export const TUTOR_NAV: PortalNavItem[] = [
  { to: ROUTES.tutor, label: "Tổng quan", icon: "home", end: true },
  { to: ROUTES.tutorClasses, label: "Lớp phụ trách", icon: "school" },
  { to: ROUTES.tutorSessions, label: "Lịch dạy", icon: "calendar_month" },
  { to: ROUTES.tutorHomeworks, label: "Bài tập", icon: "assignment" },
  { to: ROUTES.tutorAvailability, label: "Lịch rảnh", icon: "event_available" },
  { to: ROUTES.tutorLeave, label: "Xin nghỉ", icon: "event_busy" },
  { to: ROUTES.tutorPayroll, label: "Thu nhập", icon: "account_balance_wallet" },
  { to: ROUTES.tutorReviews, label: "Đánh giá", icon: "reviews" },
];
