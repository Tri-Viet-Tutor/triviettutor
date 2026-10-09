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
  /** Khu quản trị: tổng quan, người dùng, buổi học, đơn xin nghỉ, phân công gia sư, hồ sơ */
  admin: "/admin",
  adminUsers: "/admin/users",
  adminSessions: "/admin/sessions",
  adminLeaveRequests: "/admin/leave-requests",
  adminAssignments: "/admin/assignments",
  adminProfile: "/admin/profile",
  /** Khu gia sư: tổng quan, lịch dạy + điểm danh, lịch rảnh, xin nghỉ, hồ sơ */
  tutor: "/tutor",
  tutorSessions: "/tutor/sessions",
  tutorAvailability: "/tutor/availability",
  tutorLeave: "/tutor/leave",
  tutorProfile: "/tutor/profile",
  /** Khu học viên: tổng quan, lịch học, mua khóa học + thanh toán, xin nghỉ, hồ sơ */
  student: "/student",
  studentSchedule: "/student/schedule",
  studentCourses: "/student/courses",
  studentCheckout: "/student/checkout",
  studentLeave: "/student/leave",
  studentProfile: "/student/profile",
  forbidden: "/403",
} as const;
