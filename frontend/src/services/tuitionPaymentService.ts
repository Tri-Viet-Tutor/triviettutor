import { api } from "@/services/apiClient";
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
} from "@/interfaces/dto";

// Thanh toán học phí qua VNPay Sandbox: học viên chọn lớp → giữ chỗ (payment intent) → sang VNPay;
// quản trị xem giao dịch và hoàn tiền.

// Lấy `data` trong khung ApiResponse; thiếu dữ liệu thì ném lỗi
function unwrap<T>(response: ApiResponse<T>): T {
  if (!response.success || response.data === undefined) throw new Error("Missing API response");
  return response.data;
}
// GET /catalog/courses — các khóa admin đang bật bán (mọi tài khoản đã đăng nhập)
export async function listCatalogCourses(
  query: { subject?: string; gradeLevel?: GradeLevel; page?: number; size?: number } = {},
): Promise<PageResponse<CourseResponse>> {
  return unwrap((await api.get<ApiResponse<PageResponse<CourseResponse>>>("/catalog/courses", { params: query })).data);
}
// Danh sách lớp đang mở đăng ký (có lọc)
export async function listTuitionClasses(query: CatalogClassesQuery): Promise<PageResponse<TuitionClass>> {
  return unwrap((await api.get<ApiResponse<PageResponse<TuitionClass>>>("/catalog/classes", { params: query })).data);
}
// Chi tiết một lớp trên danh mục
export async function getTuitionClass(id: number): Promise<TuitionClass> {
  return unwrap((await api.get<ApiResponse<TuitionClass>>(`/catalog/classes/${id}`)).data);
}
// Tạo yêu cầu thanh toán và giữ chỗ trong lớp
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
// Lấy link thanh toán VNPay cho yêu cầu
export async function startVnpay(intentId: number): Promise<VnpayRedirect> {
  return unwrap((await api.post<ApiResponse<VnpayRedirect>>(`/payment-intents/${intentId}/vnpay`)).data);
}
// Chi tiết một yêu cầu thanh toán
export async function getIntent(intentId: number): Promise<IntentDetail> {
  return unwrap((await api.get<ApiResponse<IntentDetail>>(`/payment-intents/${intentId}`)).data);
}
// Hủy yêu cầu thanh toán và nhả chỗ
export async function cancelIntent(intentId: number): Promise<IntentDetail> {
  return unwrap((await api.delete<ApiResponse<IntentDetail>>(`/payment-intents/${intentId}`)).data);
}
// POST /payment-intents/{id}/reconcile — hỏi lại VNPay khi chưa nhận được xác nhận (IPN); gọi lặp lại vẫn an toàn
export async function reconcileIntent(intentId: number): Promise<IntentDetail> {
  return unwrap((await api.post<ApiResponse<IntentDetail>>(`/payment-intents/${intentId}/reconcile`)).data);
}
// Kiểm tra kết quả VNPay trả về khi quay lại web
export async function verifyVnpayReturn(search: string): Promise<IntentDetail> {
  return unwrap((await api.get<ApiResponse<IntentDetail>>("/payments/vnpay/return", { params: new URLSearchParams(search) })).data);
}
// Danh sách giao dịch học phí cho admin
export async function listPayments(status: PaymentStatus | "", page: number): Promise<PageResponse<TuitionPayment>> {
  return unwrap(
    (
      await api.get<ApiResponse<PageResponse<TuitionPayment>>>("/admin/payments", {
        params: { status: status || undefined, page, size: 20 },
      })
    ).data,
  );
}
// Hoàn tiền một giao dịch học phí
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
// Kiểm tra lại hoặc thử hoàn tiền lại một lần hoàn
export async function updateRefund(id: number, operation: "reconcile" | "retry"): Promise<TuitionRefund> {
  return unwrap((await api.post<ApiResponse<TuitionRefund>>(`/admin/refunds/${id}/${operation}`)).data);
}
