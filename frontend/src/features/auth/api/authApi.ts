import { api } from "@/lib/api";
import type {
  ApiResponse,
  AuthResponse,
  RegisterResponse,
  ResendVerificationRequest,
  VerifyEmailRequest,
} from "@/types/api";

/*
 * Các lời gọi xác thực bổ sung cho lib/auth.ts (đăng nhập, đăng ký — giữ nguyên ở đó).
 */

/** POST /auth/verify-email — mã OTP đúng thì tài khoản được kích hoạt và nhận luôn phiên đăng nhập */
export async function verifyEmail(request: VerifyEmailRequest): Promise<AuthResponse> {
  const { data } = await api.post<ApiResponse<AuthResponse>>("/auth/verify-email", request);
  return data.data as AuthResponse;
}

/** POST /auth/resend-verification — gửi lại mã OTP kích hoạt (mã mới có hiệu lực 5 phút) */
export async function resendVerification(request: ResendVerificationRequest): Promise<RegisterResponse> {
  const { data } = await api.post<ApiResponse<RegisterResponse>>("/auth/resend-verification", request);
  return data.data as RegisterResponse;
}

/*
 * ── Quên mật khẩu & Đặt lại mật khẩu ──────────────────────────────────────────
 */

export interface ForgotPasswordRequest {
  email: string;
  frontendUrl?: string;
}

export interface ResetPasswordRequest {
  token: string;
  /** 6 – 128 ký tự, cùng giới hạn với mật khẩu lúc đăng ký */
  newPassword: string;
}

/** POST /auth/forgot-password — gửi liên kết đặt lại mật khẩu tới email */
export async function requestPasswordReset(request: ForgotPasswordRequest): Promise<void> {
  const payload = {
    ...request,
    frontendUrl: request.frontendUrl || (typeof window !== "undefined" ? window.location.origin : undefined),
  };
  await api.post("/auth/forgot-password", payload);
}

/** POST /auth/reset-password — đổi mật khẩu bằng token liên kết */
export async function resetPassword(request: ResetPasswordRequest): Promise<void> {
  await api.post("/auth/reset-password", request);
}
