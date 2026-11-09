package com.viettritutor.service;

import com.viettritutor.common.api.PageResponse;
import com.viettritutor.common.exception.*;
import com.viettritutor.dto.notification.NotificationResponse;
import com.viettritutor.entity.*;
import com.viettritutor.repository.NotificationRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.*;
import java.time.format.DateTimeFormatter;
import java.time.temporal.ChronoUnit;

/** In-app notifications shown under the bell in every portal. Messages are Vietnamese, like the UI. */
@Service
@RequiredArgsConstructor
public class NotificationService {
    private static final DateTimeFormatter TIME = DateTimeFormatter.ofPattern("HH:mm dd/MM/yyyy");
    private final NotificationRepository notifications;
    private final Clock clock;

    /** Joins the caller's transaction so a rolled-back action never notifies anyone. */
    @Transactional
    public void send(Long userId, String type, String title, String message, String link) {
        notifications.save(Notification.builder().userId(userId).type(type).title(cut(title, 200))
                .message(cut(message, 1000)).link(link).createdAt(now()).build());
    }

    @Transactional(readOnly = true)
    public PageResponse<NotificationResponse> list(User actor, boolean unreadOnly, int page, int size) {
        if (page < 0 || size < 1 || size > 100) throw new BusinessException(ErrorCode.INVALID_PAGINATION);
        var pageable = PageRequest.of(page, size);
        var found = unreadOnly ? notifications.findByUserIdAndReadAtIsNullOrderByIdDesc(actor.getId(), pageable)
                : notifications.findByUserIdOrderByIdDesc(actor.getId(), pageable);
        return PageResponse.from(found.map(NotificationResponse::from));
    }

    @Transactional(readOnly = true)
    public long unreadCount(User actor) {
        return notifications.countByUserIdAndReadAtIsNull(actor.getId());
    }

    @Transactional
    public NotificationResponse markRead(Long id, User actor) {
        Notification n = notifications.findByIdAndUserId(id, actor.getId())
                .orElseThrow(() -> new BusinessException(ErrorCode.NOTIFICATION_NOT_FOUND));
        if (n.getReadAt() == null) n.setReadAt(now());
        return NotificationResponse.from(n);
    }

    @Transactional
    public int markAllRead(User actor) {
        return notifications.markAllRead(actor.getId(), now());
    }

    /** "08:30 12/06/2026" in the application time zone. */
    public String formatTime(OffsetDateTime time) {
        return time.atZoneSameInstant(clock.getZone()).format(TIME);
    }

    /** Human duration such as "1 ngày 2 giờ 5 phút"; under a minute reads "dưới 1 phút". */
    public static String duration(long seconds) {
        long days = seconds / 86400, hours = seconds % 86400 / 3600, minutes = seconds % 3600 / 60;
        var text = new StringBuilder();
        if (days > 0) text.append(days).append(" ngày ");
        if (hours > 0) text.append(hours).append(" giờ ");
        if (minutes > 0) text.append(minutes).append(" phút");
        return text.isEmpty() ? "dưới 1 phút" : text.toString().trim();
    }

    private OffsetDateTime now() { return OffsetDateTime.now(clock).truncatedTo(ChronoUnit.MICROS); }

    private static String cut(String value, int max) { return value.length() <= max ? value : value.substring(0, max - 1) + "…"; }
}
