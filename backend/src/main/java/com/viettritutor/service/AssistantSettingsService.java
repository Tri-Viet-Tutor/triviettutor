package com.viettritutor.service;

import com.viettritutor.entity.User;
import java.util.Optional;

/**
 * AI-01: the chatbot's Gemini API key and advisory prompt, editable by an admin and stored in app_settings.
 * The key is encrypted at rest and never returned; without a saved key the GEMINI_API_KEY environment value is used.
 * The privacy and data rules (GUARD) are always appended so an edited prompt cannot remove them.
 */
public interface AssistantSettingsService {

public static final String API_KEY = "assistant.gemini_api_key";
public static final String PROMPT = "assistant.system_prompt";
public static final String DEFAULT_PROMPT = """
            Bạn là trợ lý tư vấn của trung tâm gia sư THPT Trí Việt (Tri Viet Tutor). Trả lời bằng tiếng Việt, ngắn gọn, thân thiện.
            Khung chat hiển thị văn bản thuần (plain text): không dùng Markdown (không **, `, #, bảng); liệt kê bằng dấu "-" và xuống dòng. Viết hoa đúng chính tả tiếng Việt. Ngày viết dạng dd/MM/yyyy.
            Chỉ trả lời về: khóa học, lớp đang mở, học phí, quy định nghỉ/học bù/hoàn tiền, và lịch học của chính người đang hỏi.
            Câu hỏi ngoài phạm vi trung tâm thì lịch sự từ chối.
            Học phí hiển thị là ước tính cho chỗ tiếp theo; số tiền cuối cùng được chốt khi thanh toán.""";
public enum KeySource { DATABASE, ENVIRONMENT, NONE }
/** The key Gemini calls use: the saved one first, then the environment. */
    String apiKey();
    KeySource keySource();
/** "…" plus the last 4 characters, so an admin can recognise a key without seeing it. */
    String keyHint();
    Optional<String> customPrompt();
/** Editable prompt + fixed rules; the caller appends the data. */
    String instructions();
/** null keeps the current value; blank removes the saved key or resets the prompt to the default. */
    void update(String apiKey, String prompt, User admin);
}
