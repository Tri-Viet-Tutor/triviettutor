package com.viettritutor.service;

import com.viettritutor.dto.assistant.*;
import com.viettritutor.dto.assistant.AssistantChatRequest.Turn;
import com.viettritutor.entity.User;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.*;

/** Chatbot tư vấn: đếm lượt hỏi, gom dữ liệu thật rồi nhờ Gemini trả lời chỉ dựa trên dữ liệu đó. */
@Service
@RequiredArgsConstructor
public class AssistantService {
    private final AssistantRateLimiter limiter;
    private final AssistantContextBuilder contextBuilder;
    private final GeminiClient gemini;
    private final AssistantSettingsService settings;

    public AssistantChatResponse chat(AssistantChatRequest input, User user, String clientIp) {
        gemini.requireConfigured();
        int remaining = limiter.acquire(user != null ? "user:" + user.getId() : "ip:" + clientIp);
        List<Turn> history = new ArrayList<>(input.history() == null ? List.of() : input.history());
        // Gemini yêu cầu hội thoại bắt đầu bằng lượt của người dùng.
        while (!history.isEmpty() && "assistant".equals(history.get(0).role())) history.remove(0);
        String reply = gemini.generate(settings.instructions() + contextBuilder.build(user), history, input.message().trim());
        return new AssistantChatResponse(reply, remaining);
    }
}
