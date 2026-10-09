/** Mọi đường dẫn trang của ứng dụng — không viết tay chuỗi đường dẫn ở nơi khác. */
export const ROUTES = {
  home: "/",
  subjects: "/cap-hoc-mon-hoc",
  tutorSearch: "/tim-gia-su",
  pricing: "/bang-hoc-phi",
  contact: "/lien-he",
  /** Trang liên hệ, cuộn thẳng tới form */
  contactForm: "/lien-he#form-lien-he",
  login: "/login",
  register: "/register",
  admin: "/admin",
  adminSessions: "/admin/sessions",
  tutor: "/tutor",
  tutorSessions: "/tutor/sessions",
  student: "/student",
  studentSchedule: "/student/schedule",
  forbidden: "/403",
} as const;
