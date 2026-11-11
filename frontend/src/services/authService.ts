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
  MeResponse,
} from "@/interfaces/dto";
import { api, unwrap } from "@/services/apiClient";

// Các lời gọi API xác thực: đăng nhập, đăng ký, xác thực email bằng OTP, quên / đặt lại mật khẩu.

// POST /auth/login — đăng nhập bằng email + mật khẩu, nhận JWT và thông tin người dùng
export async function login(credentials: AuthRequest): Promise<AuthResponse> {
  return unwrap(await api.post<ApiResponse<AuthResponse>>("/auth/login", credentials));
}

// POST /auth/register — đăng ký tài khoản học viên (chưa kích hoạt; backend gửi mã OTP qua email)
export async function registerStudent(input: RegisterRequest): Promise<RegisterResponse> {
  return unwrap(await api.post<ApiResponse<RegisterResponse>>("/auth/register", input));
}

// Trang chủ của từng vai trò sau khi đăng nhập; vai trò lạ thì về trang 403.
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

// POST /auth/verify-email — mã OTP đúng thì tài khoản được kích hoạt và nhận luôn phiên đăng nhập
export async function verifyEmail(request: VerifyEmailRequest): Promise<AuthResponse> {
  return unwrap(await api.post<ApiResponse<AuthResponse>>("/auth/verify-email", request));
}

// POST /auth/resend-verification — gửi lại mã OTP kích hoạt (mã mới có hiệu lực 5 phút)
export async function resendVerification(request: ResendVerificationRequest): Promise<RegisterResponse> {
  return unwrap(await api.post<ApiResponse<RegisterResponse>>("/auth/resend-verification", request));
}

// ── Quên mật khẩu & Đặt lại mật khẩu ──────────────────────────────────────────

// POST /auth/forgot-password — gửi liên kết đặt lại mật khẩu tới email
export async function requestPasswordReset(request: ForgotPasswordRequest): Promise<void> {
  // Không gửi địa chỉ trang: backend luôn dựng liên kết từ FRONTEND_URL đã cấu hình (chống giả mạo liên kết).
  await api.post("/auth/forgot-password", { email: request.email });
}

// ── Đăng nhập bằng Google ─────────────────────────────────────────────────────

// Gốc (origin) của backend. Proxy của Vite chỉ chuyển tiếp /api nên luồng OAuth2 phải đi thẳng tới backend:
// - VITE_API_BASE_URL là địa chỉ đầy đủ (https://api.example.com/api/v1) → lấy origin của nó;
// - đang chạy dev với đường dẫn tương đối → dùng VITE_API_PROXY_TARGET (mặc định http://localhost:8080);
// - còn lại (frontend và backend chung tên miền) → origin của trang hiện tại.
export function backendOrigin(): string {
  const base = import.meta.env.VITE_API_BASE_URL;
  if (base && /^https?:\/\//i.test(base)) return new URL(base).origin;
  if (import.meta.env.DEV) return (import.meta.env.VITE_API_PROXY_TARGET || "http://localhost:8080").replace(/\/+$/, "");
  return window.location.origin;
}

// Chỉ hiện nút Google khi VITE_GOOGLE_LOGIN_ENABLED=true (backend đã có GOOGLE_CLIENT_ID / SECRET thật)
export const GOOGLE_LOGIN_ENABLED = import.meta.env.VITE_GOOGLE_LOGIN_ENABLED === "true";

// Địa chỉ bắt đầu đăng nhập Google của Spring Security; xong backend chuyển về /oauth2/success#token=…
export function googleLoginUrl(): string {
    // Không đặt VITE_OAUTH2_BASE_URL thì dùng origin của backend như các lời gọi API (không cố định localhost).
    const oauthBaseUrl = import.meta.env.VITE_OAUTH2_BASE_URL || backendOrigin();

    return `${oauthBaseUrl.replace(/\/+$/, "")}/oauth2/authorization/google`;
}

// GET /me bằng token vừa nhận (chưa lưu vào store) — dùng ở trang hoàn tất đăng nhập Google
export async function fetchMeWithToken(token: string): Promise<MeResponse> {
  return unwrap(await api.get<ApiResponse<MeResponse>>("/me", { headers: { Authorization: `Bearer ${token}` } }));
}

// POST /auth/reset-password — đổi mật khẩu bằng token liên kết
export async function resetPassword(request: ResetPasswordRequest): Promise<void> {
  await api.post("/auth/reset-password", request);
}
