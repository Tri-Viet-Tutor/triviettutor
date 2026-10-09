import type { Role } from "@/types/api";

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
  tutor: "/tutor",
  student: "/student",
  forbidden: "/403",
} as const;

/** Trang đích của từng vai trò sau khi đăng nhập. */
export const HOME_BY_ROLE: Record<Role, string> = {
  ROLE_ADMIN: ROUTES.admin,
  ROLE_TUTOR: ROUTES.tutor,
  ROLE_STUDENT: ROUTES.student,
};
