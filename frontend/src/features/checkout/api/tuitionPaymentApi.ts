import { api } from "@/lib/api";
import type { ApiResponse, CatalogClassResponse, CatalogClassesQuery, ClassStatus, PageResponse } from "@/types/api";

export type PaymentStatus = "COMPLETED" | "FAILED" | "REQUIRES_REFUND" | "PARTIALLY_REFUNDED" | "REFUNDED";
export interface TuitionClass extends CatalogClassResponse {
  status: ClassStatus;
  reservedStudents: number;
  sessions?: { id: number; date: string; startTime: string; endTime: string }[];
}
export interface PaymentIntent {
  intentId: number;
  classGroupId: number;
  amount: number;
  status: "PENDING" | "COMPLETED" | "FAILED" | "EXPIRED";
  expiresAt: string;
}
export interface TuitionRefund {
  refundId: number;
  amount: number;
  refundPercentage: number;
  reason: string;
  status: "PENDING" | "COMPLETED" | "FAILED";
  refundedAt: string | null;
  providerResponseCode: string | null;
}
export interface TuitionPayment {
  paymentId: number;
  studentId: number;
  classGroupId: number;
  enrollmentId: number | null;
  amount: number;
  refundedAmount: number;
  method: "MOCK" | "VNPAY";
  status: PaymentStatus;
  transactionRef: string;
  refundReason: string | null;
  refunds: TuitionRefund[];
}
export interface IntentDetail {
  intent: PaymentIntent;
  cancelled: boolean;
  payment: TuitionPayment | null;
  enrollment: { enrollmentId: number; status: "ACTIVE" | "CANCELLED" | "REFUNDED" } | null;
}
export interface VnpayRedirect {
  intentId: number;
  transactionRef: string;
  amount: number;
  paymentUrl: string;
  expiresAt: string;
}

function unwrap<T>(response: ApiResponse<T>): T {
  if (!response.success || response.data === undefined) throw new Error("Missing API response");
  return response.data;
}
export async function listTuitionClasses(query: CatalogClassesQuery): Promise<PageResponse<TuitionClass>> {
  return unwrap((await api.get<ApiResponse<PageResponse<TuitionClass>>>("/catalog/classes", { params: query })).data);
}
export async function getTuitionClass(id: number): Promise<TuitionClass> {
  return unwrap((await api.get<ApiResponse<TuitionClass>>(`/catalog/classes/${id}`)).data);
}
export async function quoteTuition(classGroupId: number, key: string): Promise<PaymentIntent> {
  return unwrap((await api.post<ApiResponse<PaymentIntent>>("/payment-intents", { classGroupId }, {
    headers: { "Idempotency-Key": key },
  })).data);
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
  return unwrap((await api.get<ApiResponse<PageResponse<TuitionPayment>>>("/admin/payments", {
    params: { status: status || undefined, page, size: 20 },
  })).data);
}
export async function refundPayment(payment: TuitionPayment, reason: string, refundPercentage: number, key: string): Promise<TuitionRefund> {
  const path = payment.method === "VNPAY" ? `/admin/payments/${payment.paymentId}/refund`
    : `/admin/enrollments/${payment.enrollmentId}/refund`;
  return unwrap((await api.post<ApiResponse<TuitionRefund>>(path, { reason, refundPercentage }, {
    headers: { "Idempotency-Key": key },
  })).data);
}
export async function updateRefund(id: number, operation: "reconcile" | "retry"): Promise<TuitionRefund> {
  return unwrap((await api.post<ApiResponse<TuitionRefund>>(`/admin/refunds/${id}/${operation}`)).data);
}
