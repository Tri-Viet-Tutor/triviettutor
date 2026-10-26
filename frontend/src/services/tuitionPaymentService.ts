import { api } from "@/services/api";
import type {
  ApiResponse,
  CatalogClassesQuery,
  CourseResponse,
  GradeLevel,
  IntentDetail,
  PageResponse,
  PaymentIntent,
  PaymentStatus,
  TuitionClass,
  TuitionPayment,
  TuitionRefund,
  VnpayRedirect,
} from "@/interfaces/api";

/*
 * Thanh toán học phí qua VNPay Sandbox: học viên chọn lớp → giữ chỗ (payment intent) → sang VNPay;
 * quản trị xem giao dịch và hoàn tiền.
 */

/** Lấy `data` trong khung ApiResponse; thiếu dữ liệu thì ném lỗi */
function unwrap<T>(response: ApiResponse<T>): T {
  if (!response.success || response.data === undefined) throw new Error("Missing API response");
  return response.data;
}
/** GET /catalog/courses — các khóa admin đang bật bán (mọi tài khoản đã đăng nhập) */
export async function listCatalogCourses(
  query: { subject?: string; gradeLevel?: GradeLevel; page?: number; size?: number } = {},
): Promise<PageResponse<CourseResponse>> {
  return unwrap((await api.get<ApiResponse<PageResponse<CourseResponse>>>("/catalog/courses", { params: query })).data);
}
export async function listTuitionClasses(query: CatalogClassesQuery): Promise<PageResponse<TuitionClass>> {
  return unwrap((await api.get<ApiResponse<PageResponse<TuitionClass>>>("/catalog/classes", { params: query })).data);
}
export async function getTuitionClass(id: number): Promise<TuitionClass> {
  return unwrap((await api.get<ApiResponse<TuitionClass>>(`/catalog/classes/${id}`)).data);
}
export async function quoteTuition(classGroupId: number, key: string): Promise<PaymentIntent> {
  return unwrap(
    (
      await api.post<ApiResponse<PaymentIntent>>(
        "/payment-intents",
        { classGroupId },
        {
          headers: { "Idempotency-Key": key },
        },
      )
    ).data,
  );
}
export async function startVnpay(intentId: number): Promise<VnpayRedirect> {
  return unwrap((await api.post<ApiResponse<VnpayRedirect>>(`/payment-intents/${intentId}/vnpay`)).data);
}
export async function getIntent(intentId: number): Promise<IntentDetail> {
  return unwrap((await api.get<ApiResponse<IntentDetail>>(`/payment-intents/${intentId}`)).data);
}
export async function cancelIntent(intentId: number): Promise<IntentDetail> {
  return unwrap((await api.delete<ApiResponse<IntentDetail>>(`/payment-intents/${intentId}`)).data);
}
export async function verifyVnpayReturn(search: string): Promise<IntentDetail> {
  return unwrap((await api.get<ApiResponse<IntentDetail>>("/payments/vnpay/return", { params: new URLSearchParams(search) })).data);
}
export async function listPayments(status: PaymentStatus | "", page: number): Promise<PageResponse<TuitionPayment>> {
  return unwrap(
    (
      await api.get<ApiResponse<PageResponse<TuitionPayment>>>("/admin/payments", {
        params: { status: status || undefined, page, size: 20 },
      })
    ).data,
  );
}
export async function refundPayment(
  payment: TuitionPayment,
  reason: string,
  refundPercentage: number,
  key: string,
): Promise<TuitionRefund> {
  const path =
    payment.method === "VNPAY" ? `/admin/payments/${payment.paymentId}/refund` : `/admin/enrollments/${payment.enrollmentId}/refund`;
  return unwrap(
    (
      await api.post<ApiResponse<TuitionRefund>>(
        path,
        { reason, refundPercentage },
        {
          headers: { "Idempotency-Key": key },
        },
      )
    ).data,
  );
}
export async function updateRefund(id: number, operation: "reconcile" | "retry"): Promise<TuitionRefund> {
  return unwrap((await api.post<ApiResponse<TuitionRefund>>(`/admin/refunds/${id}/${operation}`)).data);
}
