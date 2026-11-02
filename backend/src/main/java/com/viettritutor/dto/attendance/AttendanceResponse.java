package com.viettritutor.dto.attendance;

import com.viettritutor.enums.SessionStatus;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;

public record AttendanceResponse(
        Long sessionId, SessionStatus sessionStatus, boolean locked, OffsetDateTime editDeadline,
        boolean teachingConfirmed, Long taughtByTutorId, boolean needsAdminReview,
        List<Long> studentIds, List<Long> missingStudentIds, List<AttendanceRecordResponse> records,
        Map<Long, String> studentNames, List<Long> excusedStudentIds) {}
