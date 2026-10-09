const STORAGE_KEY = "viettritutor-pending-email";

interface PendingEmail {
  email: string;
  /** Thời điểm (ms) mã OTP gần nhất được gửi tới email này, nếu biết */
  sentAt?: number;
}

/*
 * Email đang chờ nhập mã OTP và lúc mã được gửi, giữ trong sessionStorage để tải lại trang
 * vẫn còn và đồng hồ đếm ngược không chạy lại từ đầu.
 * Mọi thao tác bọc try/catch vì trình duyệt có thể chặn bộ nhớ (chế độ ẩn danh…).
 */

function readPending(): PendingEmail | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    const parsed = raw ? (JSON.parse(raw) as PendingEmail) : null;
    return parsed && typeof parsed.email === "string" ? parsed : null;
  } catch {
    return null;
  }
}

/**
 * Ghi nhớ email đang chờ mã OTP.
 * @param otpJustSent true khi vừa có một mã được gửi đi (đăng ký xong, bấm gửi lại…)
 */
export function savePendingEmail(email: string, otpJustSent = false): void {
  const previous = readPending();
  const sentAt = otpJustSent ? Date.now() : previous?.email === email ? previous.sentAt : undefined;
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ email, sentAt } satisfies PendingEmail));
  } catch {
    // Không lưu được thì trang OTP sẽ hỏi lại email
  }
}

export function readPendingEmail(): string {
  return readPending()?.email ?? "";
}

/** Số giây đã trôi qua từ lúc gửi mã OTP tới email này; null nếu không biết mã được gửi lúc nào */
export function secondsSinceOtpSent(email: string): number | null {
  const pending = readPending();
  if (!pending?.sentAt || pending.email !== email) return null;
  return Math.max(0, Math.floor((Date.now() - pending.sentAt) / 1000));
}

export function clearPendingEmail(): void {
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // Bỏ qua
  }
}

/** Dữ liệu các trang xác thực truyền cho nhau qua router state */
export interface AuthLocationState {
  /** Email điền sẵn */
  email?: string;
  /** Câu báo thành công hiện ở đầu trang kế tiếp */
  notice?: string;
}
