import { API_ENDPOINTS } from "@/constants/api";
import { api } from "@/lib/api";
import type { ApiResponse, AuthRequest, AuthResponse, RegisterRequest } from "@/types/api";

/* Gọi API xác thực. Backend trả về khung { success, data: { accessToken, user } }. */

async function login(request: AuthRequest): Promise<AuthResponse> {
  const response = await api.post<ApiResponse<AuthResponse>>(API_ENDPOINTS.auth.login, request);
  return response.data.data as AuthResponse;
}

/** Đăng ký luôn tạo tài khoản học sinh và trả về phiên đăng nhập như login. */
async function register(request: RegisterRequest): Promise<AuthResponse> {
  const response = await api.post<ApiResponse<AuthResponse>>(API_ENDPOINTS.auth.register, request);
  return response.data.data as AuthResponse;
}

export const authService = { login, register };
