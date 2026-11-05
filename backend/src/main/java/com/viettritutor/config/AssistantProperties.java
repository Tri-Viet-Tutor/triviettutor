package com.viettritutor.config;

import jakarta.annotation.PostConstruct;
import lombok.*;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

/**
 * Cấu hình chatbot AI (app.assistant). API key chỉ nằm ở backend, không bao giờ trả xuống FE.
 * Các giới hạn số câu hỏi giúp không tốn phí API ngoài dự kiến.
 */
@Component @ConfigurationProperties(prefix = "app.assistant")
@Getter @Setter
public class AssistantProperties {
    private String geminiApiKey;
    private String geminiModel;
    private String geminiApiUrl;
    private int timeoutSeconds;
    private int maxOutputTokens;
    private int maxPerMinute;
    private int maxPerDay;
    private int globalMaxPerDay;

    public boolean configured() {
        return geminiApiKey != null && !geminiApiKey.isBlank();
    }

    @PostConstruct
    public void validate() {
        if (geminiModel == null || !geminiModel.matches("[a-zA-Z0-9.\\-]+")
                || geminiApiUrl == null || !geminiApiUrl.startsWith("https://")
                || timeoutSeconds < 1 || timeoutSeconds > 120 || maxOutputTokens < 64 || maxOutputTokens > 4096
                || maxPerMinute < 1 || maxPerDay < maxPerMinute || globalMaxPerDay < maxPerDay) {
            throw new IllegalStateException("Invalid assistant configuration: check GEMINI_MODEL, GEMINI_API_URL, "
                    + "ASSISTANT_TIMEOUT_SECONDS, ASSISTANT_MAX_OUTPUT_TOKENS, ASSISTANT_MAX_PER_MINUTE, "
                    + "ASSISTANT_MAX_PER_DAY, ASSISTANT_GLOBAL_MAX_PER_DAY");
        }
    }
}
