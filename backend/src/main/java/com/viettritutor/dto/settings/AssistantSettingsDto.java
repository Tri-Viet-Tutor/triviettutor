package com.viettritutor.dto.settings;

import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

import java.time.OffsetDateTime;

/** AI-01: chatbot API key and advisory prompt managed by an admin. The key is write-only. */
public final class AssistantSettingsDto {
    private AssistantSettingsDto() {}

    /**
     * Null fields are left unchanged. apiKey "" removes the saved key (the environment key is used again);
     * systemPrompt "" resets the prompt to the default.
     */
    public record Request(
            @Size(max = 200) @Pattern(regexp = "^$|^\\S{10,200}$", message = "API key must be 10-200 characters without spaces") String apiKey,
            @Size(max = 4000) String systemPrompt) {}

    /** apiKeySource: DATABASE, ENVIRONMENT or NONE. apiKeyHint shows only the last 4 characters. */
    public record Response(boolean apiKeyConfigured, String apiKeySource, String apiKeyHint, String systemPrompt,
                           boolean customPrompt, String defaultPrompt, String model, OffsetDateTime updatedAt,
                           String updatedByName) {}
}
