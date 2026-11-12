import { api, unwrap } from "@/services/apiClient";
import type { ApiResponse } from "@/interfaces/dto";
import type { ClassRosterResponse, SessionRosterResponse } from "@/interfaces/classRoster.contract";

/**
 * Lấy danh sách học viên theo lớp (Gia sư và Admin).
 * Tuyệt đối không chứa số điện thoại, email, địa chỉ của học viên.
 */
export async function getClassRoster(classGroupId: number): Promise<ClassRosterResponse> {
  return unwrap(await api.get<ApiResponse<ClassRosterResponse>>(`/classes/${classGroupId}/roster`));
}

/**
 * Lấy danh sách học viên trong phòng/buổi học theo thời gian thực.
 */
export async function getSessionRoster(sessionId: number): Promise<SessionRosterResponse> {
  return unwrap(await api.get<ApiResponse<SessionRosterResponse>>(`/sessions/${sessionId}/roster`));
}
