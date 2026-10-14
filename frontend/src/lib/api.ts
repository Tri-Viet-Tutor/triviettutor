import axios, { isAxiosError } from "axios";
import { useAuthStore } from "@/stores/authStore";
import { ROUTES } from "@/constants/routes";
import type { ApiResponse, ErrorCode } from "@/types/api";

/**
 * Configured Axios instance for all API calls.
 *
 * - Base URL is read from VITE_API_BASE_URL env var (defaults to /api/v1 for the Vite proxy).
 * - Request interceptor attaches the JWT Bearer token from auth store.
 * - Response interceptor handles 401 → auto-logout.
 *
 * Every endpoint answers with the backend's ApiResponse envelope
 * ({ success, data, message, errorCode }) — see src/types/api.ts.
 */
export const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || "/api/v1",
  headers: {
    "Content-Type": "application/json",
  },
});

// ── Request interceptor — attach JWT ─────────────────────────────────────────
api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ── Response interceptor — handle 401 ────────────────────────────────────────
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && useAuthStore.getState().token &&
        !error.config?.url?.startsWith("/auth/")) {
      // Token expired or invalid — clear session and redirect to login
      useAuthStore.getState().logout();
      window.location.href = ROUTES.login;
    }
    return Promise.reject(error);
  }
);

// ── Error helpers ────────────────────────────────────────────────────────────

export interface ApiError {
  /** Human-readable message from the backend envelope */
  message?: string;
  /** Machine-readable code — map it to UI text where needed */
  errorCode?: ErrorCode;
  /** For VALIDATION_ERROR: field name → message (the envelope's `data`) */
  fieldErrors?: Record<string, string>;
}

/** Read the backend's error envelope out of a failed request. */
export function getApiError(error: unknown): ApiError {
  if (!isAxiosError<ApiResponse<unknown>>(error) || !error.response?.data) return {};
  const { message, errorCode, data } = error.response.data;
  const fieldErrors =
    errorCode === "VALIDATION_ERROR" && data && typeof data === "object"
      ? (data as Record<string, string>)
      : undefined;
  return { message, errorCode, fieldErrors };
}
