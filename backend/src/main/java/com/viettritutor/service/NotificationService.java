package com.viettritutor.service;

import com.viettritutor.common.api.PageResponse;
import com.viettritutor.common.exception.*;
import com.viettritutor.dto.notification.NotificationResponse;
import com.viettritutor.entity.*;
import java.time.*;

/** In-app notifications shown under the bell in every portal. Messages are Vietnamese, like the UI. */
public interface NotificationService {

/** Joins the caller's transaction so a rolled-back action never notifies anyone. */
    void send(Long userId, String type, String title, String message, String link);
    PageResponse<NotificationResponse> list(User actor, boolean unreadOnly, int page, int size);
    long unreadCount(User actor);
    NotificationResponse markRead(Long id, User actor);
    int markAllRead(User actor);
/** "08:30 12/06/2026" in the application time zone. */
    String formatTime(OffsetDateTime time);
/** Human duration such as "1 ngày 2 giờ 5 phút"; under a minute reads "dưới 1 phút". */
    public static String duration(long seconds) {
        long days = seconds / 86400, hours = seconds % 86400 / 3600, minutes = seconds % 3600 / 60;
        var text = new StringBuilder();
        if (days > 0) text.append(days).append(" ngày ");
        if (hours > 0) text.append(hours).append(" giờ ");
        if (minutes > 0) text.append(minutes).append(" phút");
        return text.isEmpty() ? "dưới 1 phút" : text.toString().trim();
    }
}
