package com.viettritutor.dto.attendance;

import com.viettritutor.enums.SessionStatus;

import java.time.*;

public record TeachingSessionResponse(
        Long sessionId, Long classGroupId, Long originalSessionId, LocalDate date,
        LocalTime startTime, LocalTime endTime, SessionStatus status,
        Long scheduledTutorId, Long actualTutorId, Long taughtByTutorId,
        Long teachingConfirmedBy, OffsetDateTime teachingConfirmedAt,
        boolean attendanceLocked, boolean needsAdminReview,
        String cancellationReason, Long scheduledTutorAtCancellation, Long actualTutorAtCancellation) {}
