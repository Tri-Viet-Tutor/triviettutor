import { api, unwrap } from "@/services/apiClient";
import type { ApiResponse } from "@/interfaces/dto";
import type { AssistantReply, AssistantTurn } from "@/interfaces/dto";

// Số lượt gần nhất gửi kèm để chatbot hiểu ngữ cảnh (backend nhận tối đa 6)
const HISTORY_LIMIT = 6;

// POST /assistant/chat — công khai; đã đăng nhập thì token được gắn sẵn để chatbot xem lịch của chính mình.
export async function askAssistant(message: string, history: AssistantTurn[]): Promise<AssistantReply> {
  return unwrap(
    await api.post<ApiResponse<AssistantReply>>("/assistant/chat", {
      message,
      history: history.slice(-HISTORY_LIMIT).map((turn) => ({ role: turn.role, text: turn.text.slice(0, 2000) })),
    }),
  );
}
