package com.viettritutor.common.exception;

import lombok.Getter;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;

/**
 * Enumeration of all business error codes.
 *
 * Each code maps to an HTTP status and a default human-readable message.
 * Used by GlobalExceptionHandler to produce consistent error responses.
 *
 * Frontend: map these codes to localized messages in the UI.
 */
@Getter
@RequiredArgsConstructor
public enum ErrorCode {

    // ── Auth ─────────────────────────────────────────────────────────────────
    INVALID_CREDENTIALS       (HttpStatus.UNAUTHORIZED,   "Invalid email or password"),
    EMAIL_ALREADY_EXISTS      (HttpStatus.CONFLICT,       "An account with this email already exists"),

    // ── Authorization ─────────────────────────────────────────────────────────
    ACCESS_DENIED             (HttpStatus.FORBIDDEN,      "You do not have permission to perform this action"),

    // ── Resource not found ────────────────────────────────────────────────────
    USER_NOT_FOUND            (HttpStatus.NOT_FOUND,      "User not found"),
    COURSE_NOT_FOUND          (HttpStatus.NOT_FOUND,      "Course not found"),
    CLASS_NOT_FOUND           (HttpStatus.NOT_FOUND,      "Class not found"),
    SESSION_NOT_FOUND         (HttpStatus.NOT_FOUND,      "Session not found"),
    ENROLLMENT_NOT_FOUND      (HttpStatus.NOT_FOUND,      "Enrollment not found"),

    // ── Schedule / Assignment (BR-03) ──────────────────────────────────────────
    SCHEDULE_CONFLICT         (HttpStatus.CONFLICT,       "This tutor has an overlapping session in another class"),
    STUDENT_SCHEDULE_CONFLICT (HttpStatus.CONFLICT,       "You are already enrolled in a class at this time"),

    // ── Enrollment (BR-02) ────────────────────────────────────────────────────
    CLASS_FULL                (HttpStatus.CONFLICT,       "This class has reached maximum capacity"),
    CLASS_NOT_ENROLLING       (HttpStatus.UNPROCESSABLE_ENTITY, "This class is not currently accepting enrollments"),
    ENROLLMENT_ALREADY_EXISTS (HttpStatus.CONFLICT,       "You are already enrolled in this class"),

    // ── Refund (BR-02.30–BR-02.32) ────────────────────────────────────────────
    REFUND_NOT_ALLOWED        (HttpStatus.UNPROCESSABLE_ENTITY, "Refund is not allowed at this stage"),

    // ── Attendance (BR-04) ────────────────────────────────────────────────────
    ATTENDANCE_LOCKED         (HttpStatus.UNPROCESSABLE_ENTITY, "Attendance is locked after 24 hours"),
    SESSION_NOT_IN_PROGRESS   (HttpStatus.UNPROCESSABLE_ENTITY, "Attendance can only be submitted for in-progress sessions"),

    // ── Class lifecycle ───────────────────────────────────────────────────────
    INVALID_STATUS_TRANSITION (HttpStatus.UNPROCESSABLE_ENTITY, "This status transition is not allowed");

    private final HttpStatus httpStatus;
    private final String defaultMessage;
}
