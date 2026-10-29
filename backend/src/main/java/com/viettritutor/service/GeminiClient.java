package com.viettritutor.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.viettritutor.common.exception.*;
import com.viettritutor.config.AssistantProperties;
import com.viettritutor.dto.assistant.AssistantChatRequest.Turn;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.MediaType;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import java.util.*;

/** Gọi Gemini generateContent. API key gửi qua header, không nằm trong URL hay log. */
@Component
@RequiredArgsConstructor
public class GeminiClient {
    private static final Logger log = LoggerFactory.getLogger(GeminiClient.class);
    private final AssistantProperties properties;

    public void requireConfigured() {
        if (!properties.configured()) throw new BusinessException(ErrorCode.ASSISTANT_UNAVAILABLE);
    }

    public String generate(String systemPrompt, List<Turn> history, String message) {
        requireConfigured();
        List<Map<String, Object>> contents = new ArrayList<>();
        for (Turn turn : history) {
            contents.add(content("assistant".equals(turn.role()) ? "model" : "user", turn.text()));
        }
        contents.add(content("user", message));
        Map<String, Object> body = Map.of(
                "systemInstruction", Map.of("parts", List.of(Map.of("text", systemPrompt))),
                "contents", contents,
                // thinkingLevel minimal (dòng Gemini 3): trả lời tra cứu không cần suy luận dài, tiết kiệm token.
                "generationConfig", Map.of("temperature", 0.2, "maxOutputTokens", properties.getMaxOutputTokens(),
                        "thinkingConfig", Map.of("thinkingLevel", "minimal")));
        try {
            JsonNode response = post(body);
            StringBuilder reply = new StringBuilder();
            for (JsonNode part : response.path("candidates").path(0).path("content").path("parts")) {
                reply.append(part.path("text").asText(""));
            }
            if (reply.isEmpty()) {
                log.warn("Gemini returned no text, finishReason={}",
                        response.path("candidates").path(0).path("finishReason").asText("none"));
                throw new IllegalStateException("Empty Gemini reply");
            }
            return reply.toString().trim();
        } catch (RuntimeException exception) {
            log.warn("Gemini request failed: {}", exception.toString());
            throw new BusinessException(ErrorCode.ASSISTANT_UNAVAILABLE);
        }
    }

    protected JsonNode post(Map<String, Object> body) {
        var factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(properties.getTimeoutSeconds() * 1000);
        factory.setReadTimeout(properties.getTimeoutSeconds() * 1000);
        return RestClient.builder().requestFactory(factory).build().post()
                .uri(properties.getGeminiApiUrl() + "/models/{model}:generateContent", properties.getGeminiModel())
                .header("x-goog-api-key", properties.getGeminiApiKey())
                .contentType(MediaType.APPLICATION_JSON).body(body).retrieve().body(JsonNode.class);
    }

    private static Map<String, Object> content(String role, String text) {
        return Map.of("role", role, "parts", List.of(Map.of("text", text)));
    }
}
