// Hằng số của phần xác thực: mã OTP và giới hạn mật khẩu (theo backend).

// Mã OTP của backend có hiệu lực 5 phút (AuthService.sendNewOtp)
export const OTP_TTL_SECONDS = 5 * 60;

// Số chữ số của mã OTP
export const OTP_LENGTH = 6;

// Chờ bấy nhiêu giây mới cho bấm "Gửi lại mã" lần nữa (chỉ chặn ở giao diện)
export const RESEND_COOLDOWN_SECONDS = 60;

// Giới hạn mật khẩu của backend (RegisterRequest: 6 – 128 ký tự)
export const PASSWORD_MIN = 6;

export const PASSWORD_MAX = 128;
