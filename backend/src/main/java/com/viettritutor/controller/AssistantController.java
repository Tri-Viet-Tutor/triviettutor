package com.viettritutor.controller;

import com.viettritutor.common.api.ApiResponse;
import com.viettritutor.dto.assistant.*;
import com.viettritutor.entity.User;
import com.viettritutor.security.CurrentUser;
import com.viettritutor.service.AssistantService;
import io.swagger.v3.oas.annotations.*;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/assistant")
@RequiredArgsConstructor
@Tag(name = "Assistant", description = "AI chatbot about courses, open classes, fees and leave/makeup rules")
public class AssistantController {
    private final AssistantService assistant;

    @PostMapping("/chat")
    @Operation(summary = "Ask the assistant",
            description = "Public. Signed-in tutors/students also get their own schedule for the next 30 days. "
                    + "Limited per minute and per day; returns 429 ASSISTANT_RATE_LIMITED when exceeded.")
    public ApiResponse<AssistantChatResponse> chat(@Valid @RequestBody AssistantChatRequest input,
                                                   @Parameter(hidden = true) @CurrentUser User user,
                                                   HttpServletRequest request) {
        return ApiResponse.ok(assistant.chat(input, user, request.getRemoteAddr()));
    }
}
