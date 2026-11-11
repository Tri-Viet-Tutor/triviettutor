import { ROUTES } from "@/constants/routes";
import type { PortalNavItem, PublicNavItem } from "@/interfaces/ui";

// Các mục trên thanh điều hướng của khu quản trị, gia sư và học viên.

// Menu chính của các trang công khai. Thanh đầu trang chia 3 mục đầu sang trang trái
// của "cuốn sách", phần còn lại sang trang phải, nên thứ tự ở đây quyết định bố cục.
export const PUBLIC_NAV: PublicNavItem[] = [
  { label: "Trang chủ", to: ROUTES.home },
  { label: "Khối lớp / Môn học", to: ROUTES.subjects },
  { label: "Tìm gia sư", to: ROUTES.tutorSearch },
  { label: "Mua khóa học", to: ROUTES.pricing },
  { label: "Liên hệ", to: ROUTES.contact },
];

// Số mục nằm ở trang trái của menu hình cuốn sách
export const PUBLIC_NAV_LEFT_COUNT = 3;

// Chân trang dùng lại menu chính: bỏ Trang chủ, đổi Liên hệ thành form đăng ký tư vấn
export const PUBLIC_FOOTER_LINKS: PublicNavItem[] = [
  ...PUBLIC_NAV.filter((item) => item.to !== ROUTES.home && item.to !== ROUTES.contact),
  { label: "Đăng ký tư vấn", to: ROUTES.contactForm },
];

// Các trang của khu quản trị. Hồ sơ mở từ menu avatar trên thanh trên.
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

// Các trang của khu học viên. Hồ sơ mở từ menu avatar trên thanh trên.
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

// Các trang của khu gia sư. Hồ sơ mở từ menu avatar trên thanh trên.
export const TUTOR_NAV: PortalNavItem[] = [
  { to: ROUTES.tutor, label: "Tổng quan", icon: "home", end: true },
  { to: ROUTES.tutorSessions, label: "Lịch dạy", icon: "calendar_month" },
  { to: ROUTES.tutorClasses, label: "Lớp của tôi", shortLabel: "Lớp", icon: "local_library" },
  { to: ROUTES.tutorHomeworks, label: "Bài tập", icon: "assignment" },
  { to: ROUTES.tutorAvailability, label: "Lịch rảnh", icon: "event_available" },
  { to: ROUTES.tutorLeave, label: "Xin nghỉ", icon: "event_busy" },
  { to: ROUTES.tutorPayroll, label: "Thu nhập", icon: "account_balance_wallet" },
  { to: ROUTES.tutorReviews, label: "Đánh giá", icon: "reviews" },
];
