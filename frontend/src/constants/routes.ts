/** Mọi đường dẫn trang của ứng dụng — không viết tay chuỗi đường dẫn ở nơi khác. */
export const ROUTES = {
  home: "/",
  subjects: "/cap-hoc-mon-hoc",
  tutorSearch: "/tim-gia-su",
  /** Trang "Mua khóa học" (trước đây là "Bảng học phí" ở /bang-hoc-phi — đường dẫn cũ tự chuyển sang đây) */
  pricing: "/mua-khoa-hoc",
  courseDetail: "/mua-khoa-hoc/:courseSlug",
  studentCourseDetail: "/student/catalog/:courseSlug",
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
  /** Backend chuyển về đây sau khi đăng nhập Google, token nằm trong phần #token=… */
  oauth2Success: "/oauth2/success",
  /** Khu quản trị: tổng quan, người dùng, buổi học, duyệt nghỉ / xếp bù, phân công gia sư, hồ sơ */
  admin: "/admin",
  adminUsers: "/admin/users",
  adminSessions: "/admin/sessions",
  /** Duyệt đơn xin nghỉ, xếp buổi học bù / dạy thay */
  adminReschedules: "/admin/reschedules",
  /** Đường dẫn cũ của trang duyệt nghỉ — tự chuyển sang adminReschedules */
  adminRescheduleLegacy: "/admin/leave-requests",
  adminAssignments: "/admin/assignments",
  adminPayments: "/admin/payments",
  adminProfile: "/admin/profile",
  /** Khóa học (khung chương trình), lớp học và bảng lương gia sư */
  adminCourses: "/admin/courses",
  adminClasses: "/admin/classes",
  adminPayroll: "/admin/payroll",
  adminReviews: "/admin/reviews",
  /** Khu gia sư: tổng quan, lịch dạy + điểm danh, lịch rảnh, xin nghỉ, hồ sơ */
  tutor: "/tutor",
  tutorSessions: "/tutor/sessions",
  tutorAvailability: "/tutor/availability",
  tutorLeave: "/tutor/leave",
  tutorProfile: "/tutor/profile",
  tutorAssignmentsCreate: "/tutor/sessions/:sessionId/assignments/new",
  /** Thu nhập theo tháng */
  tutorPayroll: "/tutor/payroll",
  /** Bài tập / bài kiểm tra: danh sách, tạo mới (?buoi=<mã buổi>), soạn + chấm một bài */
  tutorHomeworks: "/tutor/homeworks",
  tutorHomeworkNew: "/tutor/homeworks/new",
  tutorHomeworkDetail: "/tutor/homeworks/:homeworkId",
  tutorReviews: "/tutor/reviews",
  /** Khu học viên: tổng quan, lịch học, mua khóa học + thanh toán, xin nghỉ, hồ sơ */
  student: "/student",
  studentSchedule: "/student/schedule",
  /** Danh sách lớp / khóa đang mở đăng ký để mua */
  studentCatalog: "/student/catalog",
  /** Đường dẫn cũ của trang mua khóa học — tự chuyển sang studentCatalog */
  studentCatalogLegacy: "/student/courses",
  studentCheckout: "/student/checkout",
  studentWallet: "/student/wallet",
  /** Giỏ hàng: chọn lớp cho từng môn rồi đặt đơn nhiều lớp */
  studentCart: "/student/cart",
  studentLeave: "/student/leave",
  /** Bài tập về nhà ở các lớp đang học: làm, lưu nháp, nộp và xem điểm */
  studentHomework: "/student/homework",
  /** Làm một bài: nhập mật khẩu, làm, nộp, xem điểm và nhận xét */
  studentHomeworkDetail: "/student/homework/:homeworkId",
  studentFeedback: "/student/feedback",
  /** Các lớp đã đóng học phí */
  studentEnrollments: "/student/classes",
  studentProfile: "/student/profile",
  /** Phòng học trực tuyến LiveKit SFU (chia sẻ màn hình, bảng trắng, video 1-nhiều) */
  classroom: "/classroom/:sessionId",
  forbidden: "/403",
} as const;

/** Trang một bài tập của gia sư hoặc học viên */
export function homeworkPath(homeworkId: number, role: "tutor" | "student"): string {
  return (role === "tutor" ? ROUTES.tutorHomeworkDetail : ROUTES.studentHomeworkDetail).replace(":homeworkId", String(homeworkId));
}

export function courseDetailPath(slug: string, student = false): string {
  return (student ? ROUTES.studentCourseDetail : ROUTES.courseDetail).replace(":courseSlug", encodeURIComponent(slug));
}
