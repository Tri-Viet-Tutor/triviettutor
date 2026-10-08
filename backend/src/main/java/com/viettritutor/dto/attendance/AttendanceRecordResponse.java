package com.viettritutor.dto.attendance;

import com.viettritutor.entity.AttendanceRecord;
import com.viettritutor.enums.AttendanceStatus;

import java.time.OffsetDateTime;

public record AttendanceRecordResponse(
        Long recordId, Long studentId, AttendanceStatus status, String note,
        OffsetDateTime arrivedAt, Long recordedBy, OffsetDateTime recordedAt, boolean locked) {
    public static AttendanceRecordResponse from(AttendanceRecord record, boolean locked) {
        return new AttendanceRecordResponse(record.getId(), record.getStudentId(), record.getStatus(), record.getNote(),
                record.getArrivedAt(), record.getRecordedBy(), record.getRecordedAt(), locked);
    }
}
