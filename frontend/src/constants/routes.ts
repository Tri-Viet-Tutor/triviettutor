/** Mọi đường dẫn trang của ứng dụng — không viết tay chuỗi đường dẫn ở nơi khác. */
export const ROUTES = {
  home: "/",
  subjects: "/cap-hoc-mon-hoc",
  tutorSearch: "/tim-gia-su",
  /** Trang "Mua khóa học" (trước đây là "Bảng học phí" ở /bang-hoc-phi — đường dẫn cũ tự chuyển sang đây) */
  pricing: "/mua-khoa-hoc",
  pricingLegacy: "/bang-hoc-phi",
  /** Thanh toán các khóa trong giỏ */
  checkout: "/thanh-toan",
  contact: "/lien-he",
  /** Trang liên hệ, cuộn thẳng tới form */
  contactForm: "/lien-he#form-lien-he",
  login: "/login",
  register: "/register",
  /** Nhập mã OTP gửi qua email để kích hoạt tài khoản */
  verifyEmail: "/verify-email",
  forgotPassword: "/forgot-password",
  resetPassword: "/reset-password",
  admin: "/admin",
  adminSessions: "/admin/sessions",
  tutor: "/tutor",
  tutorSessions: "/tutor/sessions",
  student: "/student",
  studentSchedule: "/student/schedule",
  forbidden: "/403",
} as const;
