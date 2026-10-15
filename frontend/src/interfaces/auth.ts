import type { InputHTMLAttributes, ReactNode } from "react";
import type { AuthResponse } from "@/interfaces/api";

/* Kiểu dữ liệu về đăng nhập / xác thực dùng ở phía giao diện. */

/** Người dùng đang đăng nhập (AuthResponse.user của backend). */
export interface AuthUser {
  id: number;
  email: string;
  fullName: string;
  role: string;
}

/** Dữ liệu các trang xác thực truyền cho nhau qua router state */
export interface AuthLocationState {
  /** Email điền sẵn */
  email?: string;
  /** Câu báo thành công hiện ở đầu trang kế tiếp */
  notice?: string;
  /** Đăng nhập / xác thực xong thì quay lại trang thanh toán thay vì vào trang của vai trò */
  resumeCheckout?: boolean;
}

// ── components/auth ──
/** Props của AuthField */
export interface AuthFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  id: string;
  /** Nhãn của ô */
  label: string;
  /** Câu báo lỗi của ô (nếu có) */
  error?: string;
  /** Phần nằm bên phải nhãn, ví dụ liên kết "Quên mật khẩu?" */
  labelAction?: ReactNode;
}

/** Props của AuthHeading */
export interface AuthHeadingProps {
  /** Tên trang */
  title: string;
  /** Dòng hướng dẫn ngắn */
  description?: string;
}

/** Kiểu hộp báo: lỗi, thành công, ghi chú */
export type AuthNoticeTone = "error" | "success" | "info";

/** Props của AuthNotice */
export interface AuthNoticeProps {
  tone: AuthNoticeTone;
  children: ReactNode;
}

/** Props của AuthSubmitButton */
export interface AuthSubmitButtonProps {
  id?: string;
  /** Chữ trên nút */
  label: string;
  /** Chữ hiện trong lúc đang gửi */
  pendingLabel: string;
  /** Đang gửi — khóa nút và đổi chữ */
  isPending: boolean;
  disabled?: boolean;
}

/** Props của BackHomeLink */
export interface BackHomeLinkProps {
  /** "onPhoto": chữ trắng trên tấm ảnh xanh; "onLight": chữ xanh trên nền trắng */
  tone: "onPhoto" | "onLight";
  className?: string;
}

/** Props của EmailOtpForm */
export interface EmailOtpFormProps {
  /** Email vừa nhận mã — đổi email thì đặt `key={email}` để form làm lại từ đầu */
  email: string;
  /** Mã đúng: tài khoản đã kích hoạt (và phiên đăng nhập đã được lưu, trừ khi `signIn` là false) */
  onVerified: (response: AuthResponse) => void;
  /** false: chỉ kích hoạt tài khoản, không đăng nhập luôn — người dùng tự đăng nhập sau. Mặc định true */
  signIn?: boolean;
  /** Bấm "Đổi email" */
  onChangeEmail: () => void;
  /** Căn giữa dòng mô tả (trang xác thực) hay căn trái (trong trang thanh toán) */
  align?: "center" | "left";
  /** Trạng thái gửi kèm khi dẫn sang trang đăng nhập (tài khoản đã kích hoạt từ trước) */
  loginState?: AuthLocationState;
}

/** Props của OtpInput */
export interface OtpInputProps {
  /** Các chữ số đã nhập; vị trí còn trống ở giữa được giữ bằng dấu cách */
  value: string;
  onChange: (value: string) => void;
  /** Số ô (số chữ số của mã) */
  length: number;
  /** Tô viền đỏ khi mã sai */
  invalid?: boolean;
  disabled?: boolean;
}

// ── pages/auth ──
/** Giá trị form trong ForgotPasswordPage — kiểm tra bằng `forgotSchema` */
export interface ForgotFormValues {
  email: string;
}

/** Giá trị form trong LoginPage — kiểm tra bằng `loginSchema` */
export interface LoginFormValues {
  email: string;
  password: string;
}

/** Giá trị form trong RegisterPage — kiểm tra bằng `registerSchema` */
export interface RegisterFormValues {
  fullName: string;
  email: string;
  /** Đã bỏ khoảng trắng / dấu chấm / gạch nối, dạng 0xxxxxxxxx hoặc +84xxxxxxxxx */
  phone: string;
  password: string;
  confirmPassword: string;
}

/** Giá trị form trong ResetPasswordPage — kiểm tra bằng `resetSchema` */
export interface ResetFormValues {
  email: string;
  newPassword: string;
  confirmPassword: string;
}

// ── stores/authStore.ts ──
export interface AuthState {
  /** JWT access token — null khi chưa đăng nhập */
  token: string | null;
  /** Thông tin người dùng lấy từ kết quả đăng nhập / đăng ký (AuthResponse.user) */
  user: AuthUser | null;
  /** Lưu JWT (AuthResponse.accessToken) và thông tin người dùng sau khi đăng nhập / đăng ký */
  setAuth: (token: string, user: AuthUser) => void;
  /** Xóa phiên (đăng xuất hoặc gặp 401) */
  logout: () => void;
  /** true khi đang có token hợp lệ */
  isAuthenticated: boolean;
}

// ── utils/pendingEmail.ts ──
export interface PendingEmail {
  email: string;
  /** Thời điểm (ms) mã OTP gần nhất được gửi tới email này, nếu biết */
  sentAt?: number;
  /** Xác thực xong thì quay lại trang thanh toán (đang mua khóa học dở) */
  resumeCheckout?: boolean;
  /** Số điện thoại nhập lúc đăng ký — lưu vào hồ sơ (PUT /me) sau khi xác thực xong */
  phone?: string;
}
