import type { ApiResponse, AvailabilityRequest, AvailabilityResponse } from "@/interfaces/dto";
import { api } from "@/services/apiClient";

// API riêng của gia sư (TutorAvailabilityController) — backend ĐÃ có.

// GET /tutor/availability — các khung giờ rảnh tôi đã khai
export async function fetchAvailability(): Promise<AvailabilityResponse[]> {
  const { data } = await api.get<ApiResponse<AvailabilityResponse[]>>("/tutor/availability");
  // Chưa khai khung nào thì backend có thể bỏ trống `data`
  return data.data ?? [];
}

// PUT /tutor/availability — thay toàn bộ lịch rảnh bằng danh sách mới (gửi danh sách rỗng là xóa hết)
export async function replaceAvailability(request: AvailabilityRequest): Promise<AvailabilityResponse[]> {
  const { data } = await api.put<ApiResponse<AvailabilityResponse[]>>("/tutor/availability", request);
  return data.data ?? [];
}
