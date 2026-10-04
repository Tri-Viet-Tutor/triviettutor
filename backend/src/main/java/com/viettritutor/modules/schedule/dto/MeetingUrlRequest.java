package com.viettritutor.modules.schedule.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record MeetingUrlRequest(
        @NotBlank(message = "meetingUrl is required")
        @Size(max = 2048, message = "meetingUrl must not exceed 2048 characters")
        String meetingUrl) {
}
