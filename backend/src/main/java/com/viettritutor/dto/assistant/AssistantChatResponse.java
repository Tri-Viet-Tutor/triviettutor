package com.viettritutor.dto.assistant;

/** Câu trả lời và số câu hỏi còn lại trong ngày của người hỏi. */
public record AssistantChatResponse(String reply, int remainingToday) {}
