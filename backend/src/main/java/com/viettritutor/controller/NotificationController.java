package com.viettritutor.controller;

import com.viettritutor.common.api.*;
import com.viettritutor.dto.notification.NotificationResponse;
import com.viettritutor.entity.User;
import com.viettritutor.security.CurrentUser;
import com.viettritutor.service.NotificationService;
import io.swagger.v3.oas.annotations.*;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.constraints.Positive;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/me/notifications")
@RequiredArgsConstructor
@Tag(name = "Notifications", description = "In-app notifications of the authenticated user, newest first.")
public class NotificationController {
    private final NotificationService notifications;

    @GetMapping
    @Operation(summary = "List my notifications", description = "unreadOnly filters unread ones. page >= 0, size 1-100.")
    public ApiResponse<PageResponse<NotificationResponse>> list(@RequestParam(defaultValue = "false") boolean unreadOnly,
            @RequestParam(defaultValue = "0") int page, @RequestParam(defaultValue = "20") int size,
            @Parameter(hidden = true) @CurrentUser User actor) {
        return ApiResponse.ok(notifications.list(actor, unreadOnly, page, size));
    }

    @GetMapping("/unread-count")
    @Operation(summary = "Count my unread notifications")
    public ApiResponse<Map<String, Long>> unreadCount(@Parameter(hidden = true) @CurrentUser User actor) {
        return ApiResponse.ok(Map.of("count", notifications.unreadCount(actor)));
    }

    @PatchMapping("/{notificationId}/read")
    @Operation(summary = "Mark one notification read")
    public ApiResponse<NotificationResponse> markRead(@PathVariable @Positive Long notificationId,
            @Parameter(hidden = true) @CurrentUser User actor) {
        return ApiResponse.ok(notifications.markRead(notificationId, actor));
    }

    @PatchMapping("/read-all")
    @Operation(summary = "Mark all my notifications read")
    public ApiResponse<Map<String, Integer>> markAllRead(@Parameter(hidden = true) @CurrentUser User actor) {
        return ApiResponse.ok(Map.of("updated", notifications.markAllRead(actor)));
    }
}
