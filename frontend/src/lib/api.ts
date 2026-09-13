import axios from "axios";
import { useAuthStore } from "@/stores/authStore";

/**
 * Configured Axios instance for all API calls.
 *
 * - Base URL is read from VITE_API_BASE_URL env var (defaults to /api/v1 for the Vite proxy).
 * - Request interceptor attaches the JWT Bearer token from auth store.
 * - Response interceptor handles 401 → auto-logout.
 */
export const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? "/api/v1",
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
    if (error.response?.status === 401) {
      // Token expired or invalid — clear session and redirect to login
      useAuthStore.getState().logout();
      window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);
