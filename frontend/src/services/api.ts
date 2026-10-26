import axios, { type AxiosResponse, isAxiosError } from "axios";
import { ROUTES } from "@/constants/routes";
import type { ApiResponse, ErrorCode, ApiError } from "@/interfaces/api";
import { useAuthStore } from "@/stores/authStore";
import { saveCheckoutReturn } from "@/utils/checkoutReturn";

/**
 * Axios dùng chung cho mọi lời gọi API.
 *
 * - Base URL lấy từ biến môi trường VITE_API_BASE_URL (mặc định /api/v1, đi qua proxy của Vite).
 * - Interceptor request: gắn JWT (Bearer) lấy từ authStore.
 * - Interceptor response: gặp 401 thì tự đăng xuất.
 *
 * Mọi endpoint đều trả về khung ApiResponse của backend
 * ({ success, data, message, errorCode }) — xem src/interfaces/api.ts.
 */
export const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || "/api/v1",
  headers: {
    "Content-Type": "application/json",
  },
});

//Interceptor request — gắn JWT
api.interceptors.request.use((config) => {
  // Public auth requests must work even when a stored session token has expired.
  if (config.url?.startsWith("/auth/")) {
    config.headers.delete("Authorization");
    return config;
  }

  const token = useAuthStore.getState().token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

//Interceptor response — xử lý 401 
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Bỏ qua các API /auth/* (sai mật khẩu cũng trả 401) và lúc chưa đăng nhập
    const isSessionExpired =
      error.response?.status === 401 && Boolean(useAuthStore.getState().token) && !error.config?.url?.startsWith("/auth/");
    if (isSessionExpired) {
      saveCheckoutReturn(window.location.pathname + window.location.search);
      // Token hết hạn hoặc không hợp lệ — xóa phiên rồi đưa về trang đăng nhập
      useAuthStore.getState().logout();
      window.location.href = ROUTES.login;
    }
    return Promise.reject(error);
  },
);

//Đọc dữ liệu từ khung ApiResponse

/**
 * Lấy phần `data` trong khung ApiResponse của một request thành công.
 * Dùng cho các API luôn trả dữ liệu khi thành công (lỗi đã bị axios ném ra trước đó).
 */
export function unwrap<T>(response: AxiosResponse<ApiResponse<T>>): T {
  return response.data.data as T;
}

//Đọc lỗi từ backend
/** Câu báo khi không gọi được tới máy chủ (mất mạng, máy chủ tắt…) */
const NETWORK_ERROR_TEXT = "Không kết nối được máy chủ. Vui lòng thử lại sau.";

/** Đọc khung lỗi của backend từ một request thất bại; không phải lỗi Axios thì trả về object rỗng. */
export function getApiError(error: unknown): ApiError {
  if (!isAxiosError<ApiResponse<unknown>>(error) || !error.response?.data) return {};
  const { message, errorCode, data } = error.response.data;
  const fieldErrors = errorCode === "VALIDATION_ERROR" && data && typeof data === "object" ? (data as Record<string, string>) : undefined;
  return { message, errorCode, fieldErrors };
}

/**
 * Đổi lỗi của một lời gọi API thành câu báo cho người dùng:
 * mất kết nối thì báo riêng; có mã lỗi nằm trong bảng `messages` thì dùng câu đó; còn lại dùng `fallback`.
 */
export function apiErrorMessage(error: unknown, messages: Partial<Record<ErrorCode, string>>, fallback: string): string {
  if (isAxiosError(error) && !error.response) return NETWORK_ERROR_TEXT;
  const { errorCode } = getApiError(error);
  return (errorCode && messages[errorCode]) || fallback;
}
