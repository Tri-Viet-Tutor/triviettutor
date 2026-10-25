import { getApiError } from "@/services/api";

const MESSAGES: Record<string, string> = {
  WALLET_INSUFFICIENT_FUNDS: "Số dư ví chưa đủ. Bạn có thể nạp thêm hoặc thanh toán trực tiếp bằng VNPay.",
  WALLET_INVALID_TOPUP_AMOUNT: "Số tiền nạp phải là VND nguyên và nằm trong giới hạn hiển thị.",
  WALLET_TOPUP_NOT_FOUND: "Không tìm thấy yêu cầu nạp tiền của bạn.",
  WALLET_BALANCE_LIMIT: "Ví đã đạt giới hạn số dư. Vui lòng liên hệ trung tâm.",
  PAYMENT_PROVIDER_CONFLICT: "Yêu cầu đã bắt đầu bằng phương thức khác. Hãy tiếp tục hoặc hủy yêu cầu đó.",
  PAYMENT_GATEWAY_DISABLED: "VNPay Sandbox chưa được cấu hình. Vui lòng liên hệ trung tâm.",
  INVALID_PAYMENT_SIGNATURE: "Không xác minh được kết quả VNPay. Hãy kiểm tra lại trạng thái yêu cầu.",
  INVALID_PAYMENT_RETURN_URL: "Địa chỉ trở về chưa được trung tâm cấu hình.",
  IDEMPOTENCY_CONFLICT: "Yêu cầu đã được dùng với dữ liệu khác. Hãy tạo yêu cầu mới.",
  VALIDATION_ERROR: "Vui lòng kiểm tra số tiền nạp.",
};
export function walletError(error: unknown): string {
  return MESSAGES[getApiError(error).errorCode ?? ""] ?? "Chưa xử lý được yêu cầu ví. Vui lòng thử lại.";
}
export interface TopupAttempt {
  amount: number;
  key: string;
  id?: number;
}
export function readTopup(userId: number): TopupAttempt | null {
  try {
    const saved: Partial<TopupAttempt> = JSON.parse(sessionStorage.getItem(`wallet-topup-${userId}`) ?? "null") ?? {};
    return Number.isSafeInteger(saved.amount) &&
      Number(saved.amount) > 0 &&
      typeof saved.key === "string" &&
      (saved.id === undefined || (Number.isSafeInteger(saved.id) && saved.id > 0))
      ? (saved as TopupAttempt)
      : null;
  } catch {
    return null;
  }
}
export function saveTopup(userId: number, attempt: TopupAttempt): void {
  try {
    sessionStorage.setItem(`wallet-topup-${userId}`, JSON.stringify(attempt));
  } catch {
    /* Signed return still recovers the top-up. */
  }
}
