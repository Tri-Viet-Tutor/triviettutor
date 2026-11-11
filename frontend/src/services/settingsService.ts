import type { ApiResponse } from "@/interfaces/dto";
import type { AssistantSettings, AssistantSettingsRequest, AttendanceSettings } from "@/interfaces/settings";
import { api, unwrap } from "@/services/apiClient";

// Cài đặt hệ thống của quản trị viên (AdminSettingsController, ROLE_ADMIN).

// GET /admin/settings/attendance — ngưỡng phút tự điểm danh có mặt qua phòng học trực tuyến
export async function fetchAttendanceSettings(): Promise<AttendanceSettings> {
  return unwrap(await api.get<ApiResponse<AttendanceSettings>>("/admin/settings/attendance"));
}

// PUT /admin/settings/attendance — đổi ngưỡng (1–240 phút; 0 = tắt tự điểm danh)
export async function updateAttendanceSettings(autoPresentMinutes: number): Promise<AttendanceSettings> {
  return unwrap(await api.put<ApiResponse<AttendanceSettings>>("/admin/settings/attendance", { autoPresentMinutes }));
}

// GET /admin/settings/assistant — cấu hình trợ lý AI (AI-01); không trả API key, chỉ 4 ký tự cuối
export async function fetchAssistantSettings(): Promise<AssistantSettings> {
  return unwrap(await api.get<ApiResponse<AssistantSettings>>("/admin/settings/assistant"));
}

// PUT /admin/settings/assistant — đổi API key (lưu mã hóa) và/hoặc prompt tư vấn
export async function updateAssistantSettings(body: AssistantSettingsRequest): Promise<AssistantSettings> {
  return unwrap(await api.put<ApiResponse<AssistantSettings>>("/admin/settings/assistant", body));
}
