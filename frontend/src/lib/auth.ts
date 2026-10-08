import { api } from "@/lib/api";
import type { AuthUser } from "@/stores/authStore";

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

interface AuthResponse {
  accessToken: string;
  user: AuthUser;
}

export interface AuthCredentials {
  email: string;
  password: string;
}

export async function login(credentials: AuthCredentials) {
  const { data } = await api.post<ApiResponse<AuthResponse>>("/auth/login", credentials);
  return data.data;
}

export async function registerStudent(input: AuthCredentials & { fullName: string }) {
  const { data } = await api.post<ApiResponse<AuthResponse>>("/auth/register", input);
  return data.data;
}

export function getRoleHome(role: string) {
  switch (role) {
    case "ROLE_ADMIN": return "/admin";
    case "ROLE_TUTOR": return "/tutor";
    case "ROLE_STUDENT": return "/student";
    default: return "/403";
  }
}
