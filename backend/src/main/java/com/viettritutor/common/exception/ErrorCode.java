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
    UNAUTHORIZED              (HttpStatus.UNAUTHORIZED,   "Authentication is required"),
    INVALID_CREDENTIALS       (HttpStatus.UNAUTHORIZED,   "Invalid email or password"),
    EMAIL_ALREADY_EXISTS      (HttpStatus.CONFLICT,       "An account with this email already exists"),

    // ── Authorization ─────────────────────────────────────────────────────────
    ACCESS_DENIED             (HttpStatus.FORBIDDEN,      "You do not have permission to perform this action"),
    INVALID_PROFILE_FIELD     (HttpStatus.BAD_REQUEST,    "This field cannot be changed for your role"),

    // ── Resource not found ────────────────────────────────────────────────────
    USER_NOT_FOUND            (HttpStatus.NOT_FOUND,      "User not found"),
    COURSE_NOT_FOUND          (HttpStatus.NOT_FOUND,      "Course not found"),
    CLASS_NOT_FOUND           (HttpStatus.NOT_FOUND,      "Class not found"),
    SESSION_NOT_FOUND         (HttpStatus.NOT_FOUND,      "Session not found"),
    ENROLLMENT_NOT_FOUND      (HttpStatus.NOT_FOUND,      "Enrollment not found"),
    LEAVE_REQUEST_NOT_FOUND   (HttpStatus.NOT_FOUND, "Leave request not found"),
    LEAVE_REQUEST_ALREADY_PENDING (HttpStatus.CONFLICT, "You already have a pending leave request for this session"),
    LEAVE_REQUEST_ALREADY_RESOLVED (HttpStatus.CONFLICT, "This leave request has already been resolved"),
    LEAVE_REQUEST_SESSION_MISMATCH (HttpStatus.UNPROCESSABLE_ENTITY, "The leave request belongs to another session"),
    LEAVE_RESOLUTION_NOT_ALLOWED (HttpStatus.UNPROCESSABLE_ENTITY, "This resolution is not allowed for the leave request"),
    SESSION_NOT_EDITABLE      (HttpStatus.UNPROCESSABLE_ENTITY, "This session cannot be changed"),
    SESSION_ALREADY_CANCELLED (HttpStatus.CONFLICT, "This session has already been cancelled"),
    MAKEUP_ALREADY_EXISTS     (HttpStatus.CONFLICT, "This session already has a makeup session"),
    INVALID_MAKEUP_TIME       (HttpStatus.BAD_REQUEST, "Makeup must start in the future and end after its start time"),
    PAYROLL_FINALIZED         (HttpStatus.UNPROCESSABLE_ENTITY, "This session belongs to finalized payroll"),
    SESSION_STATE_CHANGED     (HttpStatus.CONFLICT, "The session changed concurrently; retry the operation"),

    // ── Schedule / Assignment (BR-03) ──────────────────────────────────────────
    SCHEDULE_CONFLICT         (HttpStatus.CONFLICT,       "This tutor has an overlapping session in another class"),
    INVALID_AVAILABILITY      (HttpStatus.BAD_REQUEST,    "Availability slots are invalid"),
    INVALID_TUTOR             (HttpStatus.UNPROCESSABLE_ENTITY, "The selected user is not a tutor"),
    CLASS_NOT_ASSIGNABLE      (HttpStatus.UNPROCESSABLE_ENTITY, "This class is not ready for tutor assignment"),
    CLASS_ALREADY_ASSIGNED    (HttpStatus.CONFLICT, "This class already has a primary tutor"),
    ASSIGNMENT_NOT_FOUND       (HttpStatus.NOT_FOUND, "This class has no active tutor assignment"),
    TUTOR_ALREADY_ASSIGNED    (HttpStatus.CONFLICT, "The selected tutor is already assigned to this class"),
    NO_ASSIGNABLE_SESSIONS    (HttpStatus.UNPROCESSABLE_ENTITY, "This class has no future sessions eligible for assignment"),
    STUDENT_SCHEDULE_CONFLICT (HttpStatus.CONFLICT,       "You are already enrolled in a class at this time"),
    SESSION_CONFIG_MISMATCH   (HttpStatus.CONFLICT,       "Existing sessions do not match the class schedule configuration"),
    INVALID_DATE_RANGE        (HttpStatus.BAD_REQUEST,    "The 'from' date must not be after the 'to' date"),
    INVALID_MEETING_URL       (HttpStatus.BAD_REQUEST,    "Meeting URL must be a valid HTTPS URL"),

    // ── Enrollment (BR-02) ────────────────────────────────────────────────────
    CLASS_FULL                (HttpStatus.CONFLICT,       "This class has reached maximum capacity"),
    CLASS_NOT_ENROLLING       (HttpStatus.UNPROCESSABLE_ENTITY, "This class is not currently accepting enrollments"),
    ENROLLMENT_ALREADY_EXISTS (HttpStatus.CONFLICT,       "You are already enrolled in this class"),

    // ── Refund (BR-02.30–BR-02.32) ────────────────────────────────────────────
    REFUND_NOT_ALLOWED        (HttpStatus.UNPROCESSABLE_ENTITY, "Refund is not allowed at this stage"),

    // ── Attendance (BR-04) ────────────────────────────────────────────────────
    ATTENDANCE_LOCKED         (HttpStatus.UNPROCESSABLE_ENTITY, "Attendance is locked after 24 hours"),
    SESSION_NOT_IN_PROGRESS   (HttpStatus.UNPROCESSABLE_ENTITY, "Attendance can only be submitted for in-progress sessions"),
    ATTENDANCE_NOT_FOUND      (HttpStatus.NOT_FOUND, "Attendance record not found"),
    INVALID_ATTENDANCE       (HttpStatus.BAD_REQUEST, "Invalid attendance records or arrival time"),
    ATTENDANCE_STUDENT_NOT_ENROLLED (HttpStatus.UNPROCESSABLE_ENTITY, "The student is not in this session's eligible roster"),
    ATTENDANCE_REASON_REQUIRED (HttpStatus.BAD_REQUEST, "An audit reason is required"),
    ATTENDANCE_NOT_LOCKED     (HttpStatus.UNPROCESSABLE_ENTITY, "Use the attendance submission API while attendance is unlocked"),
    ATTENDANCE_SESSION_NOT_ENDED (HttpStatus.UNPROCESSABLE_ENTITY, "Attendance cannot be finalized before the session ends"),
    ATTENDANCE_EXCUSED_NOT_ALLOWED (HttpStatus.UNPROCESSABLE_ENTITY, "Excused attendance requires approved student leave with at least 24 hours notice"),

    // ── Class lifecycle ───────────────────────────────────────────────────────
    INVALID_STATUS_TRANSITION (HttpStatus.UNPROCESSABLE_ENTITY, "This status transition is not allowed");

    private final HttpStatus httpStatus;
    private final String defaultMessage;
}
