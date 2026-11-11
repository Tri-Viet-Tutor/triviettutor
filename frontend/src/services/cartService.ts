import { api } from "@/services/apiClient";
import type { ApiResponse, CartCheckoutRequest, CartResponse, CartOrderResponse, PageResponse } from "@/interfaces/dto";

// Giỏ hàng và đơn nhiều lớp của học viên (backend: CartController, OrderController).
// Giỏ lưu ở máy chủ theo tài khoản: mỗi dòng là một môn; lúc đặt đơn học viên chọn lớp cụ thể cho từng môn,
// máy chủ tự tính giá (kể cả giảm theo sĩ số) và giữ giá trong thời hạn của đơn.

// Lấy phần data từ ApiResponse, thiếu thì báo lỗi
function unwrap<T>(response: ApiResponse<T>): T {
  if (!response.success || response.data === undefined) throw new Error("Missing API response");
  return response.data;
}

// GET /cart
export async function getCart(): Promise<CartResponse> {
  return unwrap((await api.get<ApiResponse<CartResponse>>("/cart")).data);
}

// POST /cart/items — thêm môn; môn đã có thì giữ nguyên
export async function addCartItem(subjectId: number): Promise<CartResponse> {
  return unwrap((await api.post<ApiResponse<CartResponse>>("/cart/items", { subjectId })).data);
}

// DELETE /cart/items/{itemId}
export async function removeCartItem(itemId: number): Promise<CartResponse> {
  return unwrap((await api.delete<ApiResponse<CartResponse>>(`/cart/items/${itemId}`)).data);
}

// DELETE /cart/items — xóa hết
export async function clearCart(): Promise<CartResponse> {
  return unwrap((await api.delete<ApiResponse<CartResponse>>("/cart/items")).data);
}

// POST /orders/checkout — đặt đơn cho cả giỏ; `key` giống nhau khi gửi lại thì không tạo đơn trùng
export async function checkoutCart(request: CartCheckoutRequest, key: string): Promise<CartOrderResponse> {
  return unwrap(
    (await api.post<ApiResponse<CartOrderResponse>>("/orders/checkout", request, { headers: { "Idempotency-Key": key } })).data,
  );
}

// POST /orders/{id}/payments/mock — thanh toán đơn bằng cổng thử nghiệm (chỉ khi máy chủ bật PAYMENT_MOCK_ENABLED)
export async function payOrderMock(orderId: number, key: string): Promise<CartOrderResponse> {
  return unwrap(
    (await api.post<ApiResponse<CartOrderResponse>>(`/orders/${orderId}/payments/mock`, undefined, { headers: { "Idempotency-Key": key } }))
      .data,
  );
}

// POST /orders/{id}/cancel — hủy đơn đang chờ thanh toán
export async function cancelOrder(orderId: number, reason: string, key: string): Promise<CartOrderResponse> {
  return unwrap(
    (await api.post<ApiResponse<CartOrderResponse>>(`/orders/${orderId}/cancel`, { reason }, { headers: { "Idempotency-Key": key } })).data,
  );
}

// GET /orders/my — lịch sử đơn học phí của tôi, mới nhất trước
export async function listMyOrders(page: number, size = 10): Promise<PageResponse<CartOrderResponse>> {
  return unwrap((await api.get<ApiResponse<PageResponse<CartOrderResponse>>>("/orders/my", { params: { page, size } })).data);
}
