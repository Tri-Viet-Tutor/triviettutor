/** Đường dẫn API (tính từ baseURL /api/v1) — khớp với các controller của backend. */
export const API_ENDPOINTS = {
  auth: {
    login: "/auth/login",
    register: "/auth/register",
  },
} as const;
