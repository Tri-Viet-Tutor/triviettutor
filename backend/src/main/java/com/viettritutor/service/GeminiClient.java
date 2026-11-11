package com.viettritutor.service;

import com.viettritutor.common.exception.*;
import com.viettritutor.dto.assistant.AssistantChatRequest.Turn;
import java.util.*;

/** Gọi Gemini generateContent. API key gửi qua header, không nằm trong URL hay log. */
public interface GeminiClient {

    void requireConfigured();
    String generate(String systemPrompt, List<Turn> history, String message);
}
