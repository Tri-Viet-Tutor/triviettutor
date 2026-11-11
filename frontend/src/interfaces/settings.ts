import type { IsoDateTime } from "@/interfaces/dto";

// Cài đặt hệ thống của quản trị viên — khớp dto.settings của backend (AdminSettingsController).

// GET / PUT /admin/settings/attendance (ATT-01)
export interface AttendanceSettings {
  // Số phút ở trong phòng học trực tuyến thì được tính có mặt; 0 = tắt
  autoPresentMinutes: number;
  enabled: boolean;
  updatedAt: IsoDateTime | null;
  updatedByName: string | null;
}

// Nguồn API key của trợ lý AI: lưu trong DB (quản trị nhập), biến môi trường GEMINI_API_KEY, hoặc chưa có
export type AssistantKeySource = "DATABASE" | "ENVIRONMENT" | "NONE";

// GET / PUT /admin/settings/assistant (AI-01). API key không bao giờ được trả về, chỉ có 4 ký tự cuối.
export interface AssistantSettings {
  apiKeyConfigured: boolean;
  apiKeySource: AssistantKeySource;
  apiKeyHint: string | null;
  // Prompt tư vấn đang dùng (tùy chỉnh hoặc mặc định)
  systemPrompt: string;
  customPrompt: boolean;
  defaultPrompt: string;
  model: string;
  updatedAt: IsoDateTime | null;
  updatedByName: string | null;
}

// Trường null/không gửi = giữ nguyên; apiKey "" = xóa key đã lưu; systemPrompt "" = về mặc định
export interface AssistantSettingsRequest {
  apiKey?: string | null;
  systemPrompt?: string | null;
}
