package com.viettritutor.service;

import com.viettritutor.dto.assistant.*;
import com.viettritutor.entity.User;
import java.util.*;

/** Chatbot tư vấn: đếm lượt hỏi, gom dữ liệu thật rồi nhờ Gemini trả lời chỉ dựa trên dữ liệu đó. */
public interface AssistantService {

    AssistantChatResponse chat(AssistantChatRequest input, User user, String clientIp);
}
