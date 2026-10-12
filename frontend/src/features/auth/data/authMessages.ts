import { isAxiosError } from "axios";
import { getApiError } from "@/lib/api";
import type { ErrorCode } from "@/types/api";

/** Mã OTP của backend có hiệu lực 5 phút (AuthService.sendNewOtp) */
export const OTP_TTL_SECONDS = 5 * 60;
export const OTP_LENGTH = 6;
/** Chờ bấy nhiêu giây mới cho bấm "Gửi lại mã" lần nữa (chỉ chặn ở giao diện) */
export const RESEND_COOLDOWN_SECONDS = 60;

/** Giới hạn mật khẩu của backend (RegisterRequest: 6 – 128 ký tự) */
export const PASSWORD_MIN = 6;
export const PASSWORD_MAX = 128;

/* Câu báo lỗi tiếng Việt cho các mã lỗi xác thực của backend */
const AUTH_ERROR_TEXT: Partial<Record<ErrorCode, string>> = {
  INVALID_CREDENTIALS: "Email hoặc mật khẩu không đúng.",
  ACCOUNT_NOT_VERIFIED: "Tài khoản chưa được kích hoạt. Hãy nhập mã xác thực đã gửi tới email của bạn.",
  ACCOUNT_ALREADY_VERIFIED: "Tài khoản này đã được kích hoạt. Bạn có thể đăng nhập.",
  EMAIL_ALREADY_EXISTS: "Email này đã có tài khoản.",
  INVALID_OTP: "Mã xác thực không đúng.",
  OTP_EXPIRED: "Mã xác thực đã hết hạn. Hãy bấm gửi lại mã.",
  INVALID_RESET_TOKEN: "Liên kết đặt lại mật khẩu không hợp lệ hoặc đã qua sử dụng. Vui lòng gửi lại yêu cầu.",
  RESET_TOKEN_EXPIRED: "Liên kết đặt lại mật khẩu đã hết hạn (sau 15 phút). Vui lòng gửi lại yêu cầu.",
  EMAIL_SEND_FAILED: "Chưa gửi được email. Vui lòng thử lại sau ít phút.",
  USER_NOT_FOUND: "Không tìm thấy tài khoản với email này.",
  VALIDATION_ERROR: "Thông tin chưa hợp lệ. Vui lòng kiểm tra lại.",
  // (Đề xuất) backend chỉ cho tạo tài khoản khi email đã có đơn thanh toán xong
  PAYMENT_REQUIRED: "Email này chưa có đơn đã thanh toán. Hãy mua khóa học trước.",
};

/** Đổi lỗi của một lời gọi API thành câu báo cho người dùng. */
export function authErrorMessage(error: unknown, fallback = "Có lỗi xảy ra. Vui lòng thử lại."): string {
  if (isAxiosError(error) && !error.response) return "Không kết nối được máy chủ. Vui lòng thử lại sau.";
  const { errorCode } = getApiError(error);
  return (errorCode && AUTH_ERROR_TEXT[errorCode]) || fallback;
}

/** Mã lỗi của lời gọi API (nếu backend có trả về) */
export function authErrorCode(error: unknown): ErrorCode | undefined {
  return getApiError(error).errorCode;
}
