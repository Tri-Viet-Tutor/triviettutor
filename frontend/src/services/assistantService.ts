import { api, unwrap } from "@/services/api";
import type { ApiResponse } from "@/interfaces/api";

/** Một lượt trong hội thoại với chatbot (FE giữ lịch sử, backend không lưu) */
export interface AssistantTurn {
  role: "user" | "assistant";
  text: string;
}

export interface AssistantReply {
  reply: string;
  /** Số câu hỏi còn lại trong ngày */
  remainingToday: number;
}

/** Số lượt gần nhất gửi kèm để chatbot hiểu ngữ cảnh (backend nhận tối đa 6) */
const HISTORY_LIMIT = 6;

/** POST /assistant/chat — công khai; đã đăng nhập thì token được gắn sẵn để chatbot xem lịch của chính mình. */
export async function askAssistant(message: string, history: AssistantTurn[]): Promise<AssistantReply> {
  return unwrap(
    await api.post<ApiResponse<AssistantReply>>("/assistant/chat", {
      message,
      history: history.slice(-HISTORY_LIMIT).map((turn) => ({ role: turn.role, text: turn.text.slice(0, 2000) })),
    }),
  );
}
