package com.viettritutor.service.impl;
import com.viettritutor.service.*;
import com.viettritutor.service.NotificationService;

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
public class NotificationServiceImpl implements NotificationService {
    private static final DateTimeFormatter TIME = DateTimeFormatter.ofPattern("HH:mm dd/MM/yyyy");
    private final NotificationRepository notifications;
    private final Clock clock;

    /** Joins the caller's transaction so a rolled-back action never notifies anyone. */
    @Override
    @Transactional
    public void send(Long userId, String type, String title, String message, String link) {
        notifications.save(Notification.builder().userId(userId).type(type).title(cut(title, 200))
                .message(cut(message, 1000)).link(link).createdAt(now()).build());
    }

    @Override
    @Transactional(readOnly = true)
    public PageResponse<NotificationResponse> list(User actor, boolean unreadOnly, int page, int size) {
        if (page < 0 || size < 1 || size > 100) throw new BusinessException(ErrorCode.INVALID_PAGINATION);
        var pageable = PageRequest.of(page, size);
        var found = unreadOnly ? notifications.findByUserIdAndReadAtIsNullOrderByIdDesc(actor.getId(), pageable)
                : notifications.findByUserIdOrderByIdDesc(actor.getId(), pageable);
        return PageResponse.from(found.map(NotificationResponse::from));
    }

    @Override
    @Transactional(readOnly = true)
    public long unreadCount(User actor) {
        return notifications.countByUserIdAndReadAtIsNull(actor.getId());
    }

    @Override
    @Transactional
    public NotificationResponse markRead(Long id, User actor) {
        Notification n = notifications.findByIdAndUserId(id, actor.getId())
                .orElseThrow(() -> new BusinessException(ErrorCode.NOTIFICATION_NOT_FOUND));
        if (n.getReadAt() == null) n.setReadAt(now());
        return NotificationResponse.from(n);
    }

    @Override
    @Transactional
    public int markAllRead(User actor) {
        return notifications.markAllRead(actor.getId(), now());
    }

    /** "08:30 12/06/2026" in the application time zone. */
    @Override
    public String formatTime(OffsetDateTime time) {
        return time.atZoneSameInstant(clock.getZone()).format(TIME);
    }

    

    private OffsetDateTime now() { return OffsetDateTime.now(clock).truncatedTo(ChronoUnit.MICROS); }

    private static String cut(String value, int max) { return value.length() <= max ? value : value.substring(0, max - 1) + "…"; }
}
