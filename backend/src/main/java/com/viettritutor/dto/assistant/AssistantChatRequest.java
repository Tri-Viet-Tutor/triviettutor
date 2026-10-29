package com.viettritutor.dto.assistant;

import jakarta.validation.Valid;
import jakarta.validation.constraints.*;

import java.util.List;

/** Câu hỏi mới cùng vài lượt hội thoại gần nhất (FE giữ lịch sử, backend không lưu). */
public record AssistantChatRequest(
        @NotBlank @Size(max = 500) String message,
        @Size(max = 6) List<@Valid Turn> history) {

    public record Turn(
            @NotNull @Pattern(regexp = "user|assistant") String role,
            @NotBlank @Size(max = 2000) String text) {}
}
