import { ROUTES } from "@/constants/routes";
import type {
  ApiResponse,
  AuthRequest,
  AuthResponse,
  RegisterRequest,
  RegisterResponse,
  ResendVerificationRequest,
  VerifyEmailRequest,
  ForgotPasswordRequest,
  ResetPasswordRequest,
} from "@/interfaces/api";
import { api, unwrap } from "@/services/api";

/* Các lời gọi API xác thực: đăng nhập, đăng ký, xác thực email bằng OTP, quên / đặt lại mật khẩu. */

/** POST /auth/login — đăng nhập bằng email + mật khẩu, nhận JWT và thông tin người dùng */
export async function login(credentials: AuthRequest): Promise<AuthResponse> {
  return unwrap(await api.post<ApiResponse<AuthResponse>>("/auth/login", credentials));
}

/** POST /auth/register — đăng ký tài khoản học viên (chưa kích hoạt; backend gửi mã OTP qua email) */
export async function registerStudent(input: RegisterRequest): Promise<RegisterResponse> {
  return unwrap(await api.post<ApiResponse<RegisterResponse>>("/auth/register", input));
}

/** Trang chủ của từng vai trò sau khi đăng nhập; vai trò lạ thì về trang 403. */
export function getRoleHome(role: string) {
  switch (role) {
    case "ROLE_ADMIN":
      return ROUTES.admin;
    case "ROLE_TUTOR":
      return ROUTES.tutor;
    case "ROLE_STUDENT":
      return ROUTES.student;
    default:
      return ROUTES.forbidden;
  }
}

/** POST /auth/verify-email — mã OTP đúng thì tài khoản được kích hoạt và nhận luôn phiên đăng nhập */
export async function verifyEmail(request: VerifyEmailRequest): Promise<AuthResponse> {
  return unwrap(await api.post<ApiResponse<AuthResponse>>("/auth/verify-email", request));
}

/** POST /auth/resend-verification — gửi lại mã OTP kích hoạt (mã mới có hiệu lực 5 phút) */
export async function resendVerification(request: ResendVerificationRequest): Promise<RegisterResponse> {
  return unwrap(await api.post<ApiResponse<RegisterResponse>>("/auth/resend-verification", request));
}

/*
 * ── Quên mật khẩu & Đặt lại mật khẩu ──────────────────────────────────────────
 */

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
