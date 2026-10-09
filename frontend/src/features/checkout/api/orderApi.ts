import { api } from "@/lib/api";
import {
  cartTotal,
  createDemoVnpayPayment,
  PAYMENT_CODE_TTL_SECONDS,
  PAYMENT_DEMO,
  type CustomerInfo,
  type PurchasableCourse,
  type VnpayPayment,
} from "@/features/checkout/data/checkout";
import type { ApiResponse } from "@/types/api";

/*
 * Đặt mua khóa học và thanh toán qua VNPay.
 *
 * Mặc định chạy ở chế độ DEMO (PAYMENT_DEMO trong data/checkout.ts): mã thanh toán tạo ngay trên
 * trình duyệt, không gọi máy chủ, không có giao dịch thật.
 *
 * Khi tắt demo (VITE_PAYMENT_DEMO=false), frontend chỉ làm ba việc:
 *   1. POST /orders/checkout — gửi các khóa và thông tin học viên, nhận về đường dẫn VNPay đã ký;
 *   2. chuyển người mua sang đường dẫn đó (mã QR và ô nhập thẻ nằm trên trang của VNPay);
 *   3. khi VNPay trả người mua về /thanh-toan?vnp_..., gửi nguyên các tham số đó cho
 *      GET /payments/vnpay/return để máy chủ kiểm tra chữ ký và cho biết đơn đã thanh toán chưa.
 * Frontend không ký, không giữ khóa bí mật và không tự quyết "đã thanh toán".
 *
 * LƯU Ý: backend CHƯA có các endpoint này. Mô tả đầy đủ cho người làm backend nằm ở
 * docs/VNPAY_BACKEND_API.md.
 */

export interface CheckoutRequest {
  courses: PurchasableCourse[];
  /** Thông tin học viên điền ở bước 1 */
  customer: CustomerInfo;
}

/** (Đề xuất) Kết quả của POST /orders/checkout */
interface OrderResponse {
  orderId: number;
  orderCode: string;
  /** Tổng tiền máy chủ chốt cho đơn (VND) */
  totalAmount: number;
  /** Đường dẫn thanh toán VNPay đã ký */
  paymentUrl: string;
  /** Thời điểm đường dẫn hết hạn (ISO 8601) */
  expiresAt?: string;
}

/** Thanh toán đang chờ, kèm mã đơn phía máy chủ (không có ở chế độ demo) */
export interface PendingPayment extends VnpayPayment {
  orderId?: number;
}

/** Số giây còn lại tới `expiresAt`; không đọc được thì dùng thời hạn mặc định */
function secondsUntil(expiresAt: string | undefined): number {
  const expires = expiresAt ? Date.parse(expiresAt) : NaN;
  if (Number.isNaN(expires)) return PAYMENT_CODE_TTL_SECONDS;
  return Math.max(0, Math.floor((expires - Date.now()) / 1000));
}

/** Tạo đơn và lấy mã thanh toán VNPay (khách chưa có tài khoản hoặc học viên đang đăng nhập) */
export async function createVnpayPayment(request: CheckoutRequest): Promise<PendingPayment> {
  if (PAYMENT_DEMO) return createDemoVnpayPayment(cartTotal(request.courses));

  // Không gửi số tiền: máy chủ tự tính từ mã môn
  const { data } = await api.post<ApiResponse<OrderResponse>>("/orders/checkout", {
    subjects: request.courses.map((course) => course.subject),
    gradeLevel: request.customer.gradeLevel,
    deliveryMode: request.customer.deliveryMode,
    fullName: request.customer.fullName,
    email: request.customer.email,
    paymentMethod: "VNPAY",
  });
  const order = data.data as OrderResponse;
  return {
    orderId: order.orderId,
    orderCode: order.orderCode,
    amount: order.totalAmount,
    qrContent: "",
    paymentUrl: order.paymentUrl,
    ttlSeconds: secondsUntil(order.expiresAt),
    demo: false,
  };
}

/** Ghi nhận thanh toán của bản DEMO (chỉ trên trình duyệt). Thanh toán thật được xác nhận qua `fetchVnpayResult`. */
export async function confirmPayment(payment: PendingPayment): Promise<PendingPayment> {
  return payment;
}

/** (Đề xuất) Kết quả của GET /payments/vnpay/return */
export interface VnpayResult {
  orderCode: string;
  /** Số tiền của đơn (VND) */
  amount: number;
  /** PAID: đã thanh toán · PENDING_PAYMENT: VNPay chưa xác nhận xong · FAILED: không thành công hoặc bị hủy */
  status: "PAID" | "PENDING_PAYMENT" | "FAILED";
  /** Họ tên và email đã điền lúc đặt mua */
  fullName: string;
  email: string;
  /** Email này đã có tài khoản kích hoạt hay chưa */
  accountExists: boolean;
}

/** Đường dẫn hiện tại có phải VNPay vừa trả người mua về hay không */
export function hasVnpayReturn(search: string): boolean {
  const params = new URLSearchParams(search);
  return params.has("vnp_TxnRef") && params.has("vnp_SecureHash");
}

/** Gửi nguyên các tham số VNPay trả về cho máy chủ kiểm tra chữ ký và lấy trạng thái đơn */
export async function fetchVnpayResult(search: string): Promise<VnpayResult> {
  const { data } = await api.get<ApiResponse<VnpayResult>>("/payments/vnpay/return", {
    params: Object.fromEntries(new URLSearchParams(search)),
  });
  return data.data as VnpayResult;
}
