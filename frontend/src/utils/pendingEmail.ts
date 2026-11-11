import type { PendingEmail } from "@/interfaces/auth";

// Khóa lưu trong sessionStorage
const STORAGE_KEY = "viettritutor-pending-email";

// Email đang chờ nhập mã OTP và lúc mã được gửi, giữ trong sessionStorage để tải lại trang
// vẫn còn và đồng hồ đếm ngược không chạy lại từ đầu.
// Mọi thao tác bọc try/catch vì trình duyệt có thể chặn bộ nhớ (chế độ ẩn danh…).

// Đọc bản ghi đang lưu; dữ liệu hỏng hoặc bị chặn thì trả null
function readPending(): PendingEmail | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    const parsed = raw ? (JSON.parse(raw) as PendingEmail) : null;
    return parsed && typeof parsed.email === "string" ? parsed : null;
  } catch {
    return null;
  }
}

// Ghi nhớ email đang chờ mã OTP.
// @param otpJustSent true khi vừa có một mã được gửi đi (đăng ký xong, bấm gửi lại…)
// @param resumeCheckout true khi đang mua khóa học dở; bỏ trống thì giữ giá trị đã ghi cho cùng email
export function savePendingEmail(email: string, otpJustSent = false, resumeCheckout?: boolean): void {
  const previous = readPending();
  const sameEmail = previous?.email === email;
  const sentAt = otpJustSent ? Date.now() : sameEmail ? previous.sentAt : undefined;
  const resume = resumeCheckout ?? (sameEmail ? previous.resumeCheckout : undefined);
  const phone = sameEmail ? previous.phone : undefined;
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ email, sentAt, resumeCheckout: resume, phone } satisfies PendingEmail));
  } catch {
    // Không lưu được thì trang OTP sẽ hỏi lại email
  }
}

// Email đang chờ nhập mã; chuỗi rỗng nếu không có
export function readPendingEmail(): string {
  return readPending()?.email ?? "";
}

// Số giây đã trôi qua từ lúc gửi mã OTP tới email này; null nếu không biết mã được gửi lúc nào
export function secondsSinceOtpSent(email: string): number | null {
  const pending = readPending();
  if (!pending?.sentAt || pending.email !== email) return null;
  return Math.max(0, Math.floor((Date.now() - pending.sentAt) / 1000));
}

// Ghi nhớ số điện thoại nhập lúc đăng ký cho email đang chờ mã (gọi sau savePendingEmail)
export function savePendingPhone(email: string, phone: string): void {
  const pending = readPending();
  if (pending?.email !== email) return;
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ ...pending, phone } satisfies PendingEmail));
  } catch {
    // Không lưu được thì học viên tự thêm số ở trang Hồ sơ
  }
}

// Số điện thoại nhập lúc đăng ký của email này; chuỗi rỗng nếu không có
export function readPendingPhone(email: string): string {
  const pending = readPending();
  return pending?.email === email ? (pending.phone ?? "") : "";
}

// Email đang chờ xác thực có phải của một lần mua khóa học dở hay không
export function pendingResumesCheckout(): boolean {
  return readPending()?.resumeCheckout === true;
}

// Xóa email đang chờ (xác thực xong hoặc bỏ dở)
export function clearPendingEmail(): void {
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // Trình duyệt chặn storage thì bỏ qua
  }
}
