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
    INVALID_OTP               (HttpStatus.BAD_REQUEST,    "Invalid verification code"),
    OTP_EXPIRED               (HttpStatus.BAD_REQUEST,    "Verification code has expired"),
    ACCOUNT_NOT_VERIFIED      (HttpStatus.FORBIDDEN,      "Account has not been verified yet"),
    ACCOUNT_ALREADY_VERIFIED  (HttpStatus.BAD_REQUEST,    "Account is already verified"),
    INVALID_RESET_TOKEN       (HttpStatus.BAD_REQUEST,    "Invalid password reset token"),
    RESET_TOKEN_EXPIRED       (HttpStatus.BAD_REQUEST,    "Password reset token has expired"),
    EMAIL_SEND_FAILED         (HttpStatus.INTERNAL_SERVER_ERROR, "Failed to send verification email. Please try again later"),
    OTP_ATTEMPTS_EXCEEDED     (HttpStatus.TOO_MANY_REQUESTS, "Too many incorrect codes; request a new verification code"),
    OTP_RESEND_TOO_SOON       (HttpStatus.TOO_MANY_REQUESTS, "Please wait before requesting another verification code"),
    ACCOUNT_LOCKED            (HttpStatus.FORBIDDEN,      "This account has been locked by an administrator"),
    GOOGLE_NOT_LINKED         (HttpStatus.UNPROCESSABLE_ENTITY, "This account is not linked to a Google account"),
    GOOGLE_UNLINK_NOT_ALLOWED (HttpStatus.UNPROCESSABLE_ENTITY, "Cannot unlink Google account; it is the only login method for this account"),

    // ── Authorization ─────────────────────────────────────────────────────────
    ACCESS_DENIED             (HttpStatus.FORBIDDEN,      "You do not have permission to perform this action"),
    INVALID_PROFILE_FIELD     (HttpStatus.BAD_REQUEST,    "This field cannot be changed for your role"),
    INVALID_ROLE_FILTER       (HttpStatus.BAD_REQUEST,    "Role must be ROLE_ADMIN, ROLE_TUTOR or ROLE_STUDENT"),
    INVALID_PAGINATION        (HttpStatus.BAD_REQUEST,    "Page must be non-negative and size must be between 1 and 100"),
    CANNOT_LOCK_SELF          (HttpStatus.UNPROCESSABLE_ENTITY, "You cannot lock your own account"),

    // ── Resource not found ────────────────────────────────────────────────────
    USER_NOT_FOUND            (HttpStatus.NOT_FOUND,      "User not found"),
    USER_NOT_TUTOR            (HttpStatus.UNPROCESSABLE_ENTITY, "This user is not a tutor"),
    COURSE_NOT_FOUND          (HttpStatus.NOT_FOUND,      "Course not found"),
    COURSE_IN_USE             (HttpStatus.CONFLICT,       "This course already has classes or orders; stop selling it instead"),
    CLASS_IN_USE              (HttpStatus.CONFLICT,       "This class has students, payments or teaching history; cancel it instead"),
    USER_IN_USE               (HttpStatus.CONFLICT,       "This user already has classes, payments or teaching history and cannot be deleted"),
    RATING_NOT_FOUND          (HttpStatus.NOT_FOUND,      "Rating not found"),
    RATING_ALREADY_EXISTS     (HttpStatus.CONFLICT,       "You have already rated this tutor"),
    RATING_NOT_ELIGIBLE       (HttpStatus.UNPROCESSABLE_ENTITY, "You can only rate a tutor who teaches a class you are enrolled in"),
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
    SESSION_ALREADY_TAUGHT    (HttpStatus.UNPROCESSABLE_ENTITY, "This session already has attendance or a teaching confirmation"),
    MEETING_NOT_AVAILABLE     (HttpStatus.UNPROCESSABLE_ENTITY, "The classroom is not open for this session right now"),
    MEETING_LOGS_UNAVAILABLE  (HttpStatus.SERVICE_UNAVAILABLE, "Meeting logs are temporarily unavailable"),
    INVALID_PAYROLL_PERIOD (HttpStatus.BAD_REQUEST, "Invalid payroll year or month"),
    INVALID_PAYROLL_KEY (HttpStatus.BAD_REQUEST, "Provide Idempotency-Key with 1-100 letters, digits or . _ : -"),
    PAYROLL_KEY_CONFLICT (HttpStatus.CONFLICT, "This idempotency key belongs to another payroll period"),
    PAYROLL_PERIOD_NOT_ENDED (HttpStatus.UNPROCESSABLE_ENTITY, "Only an ended month can be finalized"),
    PAYROLL_UNRESOLVED_SESSIONS (HttpStatus.UNPROCESSABLE_ENTITY, "Resolve teaching sessions before finalizing payroll"),
    INVALID_PAYROLL_SALARY (HttpStatus.UNPROCESSABLE_ENTITY, "Tutor salary and session rate must be configured and non-negative"),
    PAYROLL_FINALIZED         (HttpStatus.UNPROCESSABLE_ENTITY, "This session belongs to finalized payroll"),
    SESSION_STATE_CHANGED     (HttpStatus.CONFLICT, "The session changed concurrently; retry the operation"),

    // ── Schedule / Assignment (BR-03) ──────────────────────────────────────────
    SCHEDULE_CONFLICT         (HttpStatus.CONFLICT,       "This tutor has an overlapping session in another class"),
    INVALID_AVAILABILITY      (HttpStatus.BAD_REQUEST,    "Availability slots are invalid"),
    INVALID_TUTOR             (HttpStatus.UNPROCESSABLE_ENTITY, "The selected user is not a tutor"),
    CLASS_NOT_ASSIGNABLE      (HttpStatus.UNPROCESSABLE_ENTITY, "This class is not ready for tutor assignment"),
    CLASS_TUTOR_REQUIRED      (HttpStatus.UNPROCESSABLE_ENTITY, "Assign a tutor before opening enrollment"),
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
    CLASS_PAYMENT_NOT_READY   (HttpStatus.UNPROCESSABLE_ENTITY, "The class requires an active course and a complete future schedule"),
    WALLET_INSUFFICIENT_FUNDS (HttpStatus.CONFLICT, "Wallet balance is insufficient"),
    WALLET_INVALID_TOPUP_AMOUNT (HttpStatus.BAD_REQUEST, "Top-up amount is outside the configured whole VND limits"),
    WALLET_TOPUP_NOT_FOUND (HttpStatus.NOT_FOUND, "Wallet top-up not found"),
    WALLET_BALANCE_LIMIT (HttpStatus.CONFLICT, "Wallet balance exceeds its storage limit; contact the center"),
    PAYMENT_INTENT_NOT_FOUND  (HttpStatus.NOT_FOUND, "Payment intent not found"),
    PAYMENT_NOT_FOUND         (HttpStatus.NOT_FOUND, "Payment not found"),
    PAYMENT_INTENT_EXPIRED    (HttpStatus.UNPROCESSABLE_ENTITY, "Payment intent has expired; create a new intent"),
    PAYMENT_INTENT_NOT_PENDING (HttpStatus.UNPROCESSABLE_ENTITY, "Payment intent can no longer be confirmed"),
    PAYMENT_PRICE_CHANGED     (HttpStatus.CONFLICT, "The course price has changed; create a new payment intent"),
    PAYMENT_MOCK_DISABLED     (HttpStatus.UNPROCESSABLE_ENTITY, "Mock payments are not enabled in this environment"),
    PAYMENT_GATEWAY_DISABLED  (HttpStatus.SERVICE_UNAVAILABLE, "VNPay Sandbox is not configured"),
    PAYMENT_GATEWAY_ERROR     (HttpStatus.BAD_GATEWAY, "Could not verify the VNPay response"),
    INVALID_PAYMENT_SIGNATURE (HttpStatus.BAD_REQUEST, "Invalid VNPay signature or callback parameters"),
    INVALID_PAYMENT_RETURN_URL (HttpStatus.BAD_REQUEST, "The payment return origin is not allowed"),
    PAYMENT_PROVIDER_CONFLICT (HttpStatus.CONFLICT, "The payment intent is already bound to another payment method"),
    PAYMENT_RESERVATION_EXISTS (HttpStatus.CONFLICT, "You already hold a seat in this class"),
    REFUND_NOT_FOUND          (HttpStatus.NOT_FOUND, "Refund not found"),
    INVALID_IDEMPOTENCY_KEY    (HttpStatus.BAD_REQUEST, "Idempotency-Key must contain 1 to 100 non-whitespace ASCII characters"),
    IDEMPOTENCY_CONFLICT       (HttpStatus.CONFLICT, "This idempotency key was already used with different request data"),
    REFUND_ALREADY_SETTLED     (HttpStatus.CONFLICT, "The enrollment refund has already been settled"),
    INVALID_REFUND_PERCENTAGE  (HttpStatus.UNPROCESSABLE_ENTITY, "This case requires a full refund or a positive refund amount"),

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
    ACTUAL_TUTOR_CHANGE_NOT_ALLOWED (HttpStatus.UNPROCESSABLE_ENTITY, "The actual tutor can only be corrected for a started, active session"),
    TUTOR_DISABLED            (HttpStatus.UNPROCESSABLE_ENTITY, "The selected tutor account is disabled"),

    // ── Class lifecycle ───────────────────────────────────────────────────────
    INVALID_CLASS_CONFIGURATION (HttpStatus.BAD_REQUEST, "Invalid class dates, schedule, or course duration"),
    COURSE_INACTIVE (HttpStatus.UNPROCESSABLE_ENTITY, "The course is inactive"),
    CLASS_REFUND_REQUIRED (HttpStatus.UNPROCESSABLE_ENTITY, "Refund and deactivate paid enrollments before cancelling this class"),
    CLASS_CONVERSION_NOT_ALLOWED (HttpStatus.UNPROCESSABLE_ENTITY, "Conversion requires a failed group class with exactly one active student"),
    CLASS_CONVERSION_CONFLICT (HttpStatus.CONFLICT, "A different conversion request already exists for this class"),
    INVALID_FEE_RESOLUTION (HttpStatus.BAD_REQUEST, "Invalid paid amount, adjustment, or settlement evidence"),
    SUBJECT_NOT_FOUND (HttpStatus.NOT_FOUND, "Subject not found"),
    CART_ITEM_NOT_FOUND (HttpStatus.NOT_FOUND, "Cart item not found"),
    CART_LIMIT_EXCEEDED (HttpStatus.UNPROCESSABLE_ENTITY, "Cart allows at most 20 subjects"),
    CART_CHANGED (HttpStatus.CONFLICT, "Cart changed; read the cart and select all items again"),
    INVALID_CHECKOUT (HttpStatus.BAD_REQUEST, "Select each cart item and class exactly once"),
    ORDER_SUBJECT_MISMATCH (HttpStatus.CONFLICT, "The selected class does not belong to the cart subject/course"),
    ORDER_NOT_FOUND (HttpStatus.NOT_FOUND, "Order not found"),
    ORDER_EXPIRED (HttpStatus.UNPROCESSABLE_ENTITY, "Order expired; checkout again"),
    ORDER_NOT_PENDING (HttpStatus.UNPROCESSABLE_ENTITY, "Order is no longer pending payment"),
    ORDER_CANCEL_CONFLICT (HttpStatus.CONFLICT, "Order was cancelled with a different reason"),

    INVALID_HOMEWORK_DATE_RANGE (HttpStatus.BAD_REQUEST, "from must not be later than to"),
    HOMEWORK_NOT_FOUND (HttpStatus.NOT_FOUND, "Homework not found"),
    HOMEWORK_LOCKED (HttpStatus.UNPROCESSABLE_ENTITY, "Closed homework cannot be edited or reopened"),
    HOMEWORK_PUBLISHED_EDIT_RESTRICTED (HttpStatus.UNPROCESSABLE_ENTITY, "Published content is immutable; only extend the deadline or increase maxScore"),
    HOMEWORK_DEADLINE_PASSED (HttpStatus.UNPROCESSABLE_ENTITY, "The homework deadline has been reached"),
    HOMEWORK_INVALID_DEADLINE (HttpStatus.BAD_REQUEST, "The homework deadline must be in the future"),
    HOMEWORK_NOT_ACCEPTING (HttpStatus.UNPROCESSABLE_ENTITY, "Homework is not accepting student work"),
    HOMEWORK_SESSION_CANCELLED (HttpStatus.UNPROCESSABLE_ENTITY, "The session is cancelled"),
    LEARNING_VERSION_CONFLICT (HttpStatus.CONFLICT, "The record has changed; reload its current version"),
    INVALID_RESOURCE_URL (HttpStatus.BAD_REQUEST, "Resource URL must use HTTPS without user information"),
    INVALID_FILE (HttpStatus.BAD_REQUEST, "The file is empty, too large or of an unsupported type"),
    FILE_NOT_FOUND (HttpStatus.NOT_FOUND, "File not found"),
    SUBMISSION_NOT_FOUND (HttpStatus.NOT_FOUND, "Submission not found"),
    SUBMISSION_NOT_STARTED (HttpStatus.UNPROCESSABLE_ENTITY, "Start the homework before saving or submitting"),
    SUBMISSION_LOCKED (HttpStatus.UNPROCESSABLE_ENTITY, "The submission state does not permit this action"),
    EMPTY_SUBMISSION (HttpStatus.BAD_REQUEST, "Provide content or a resource URL before submitting"),
    SUBMISSION_NOT_SUBMITTED (HttpStatus.UNPROCESSABLE_ENTITY, "Only submitted work can be graded"),
    INVALID_SUBMISSION_FILTER (HttpStatus.BAD_REQUEST, "The submission list supports SUBMITTED or GRADED"),
    INVALID_HOMEWORK_SCORE (HttpStatus.BAD_REQUEST, "Score must not exceed maxScore"),
    GRADING_REASON_REQUIRED (HttpStatus.BAD_REQUEST, "An audit reason is required to revise a grade"),
    INVALID_STATUS_TRANSITION (HttpStatus.UNPROCESSABLE_ENTITY, "This status transition is not allowed"),
    AVATAR_NOT_FOUND (HttpStatus.NOT_FOUND, "Avatar not found"),
    INVALID_AVATAR (HttpStatus.BAD_REQUEST, "Avatar must be a valid PNG or JPEG image"),
    AVATAR_TOO_LARGE (HttpStatus.BAD_REQUEST, "Avatar must not exceed 2 MB"),

    // ── Generic web errors ───────────────────────────────────────
    RESOURCE_NOT_FOUND (HttpStatus.NOT_FOUND, "The requested resource does not exist"),
    METHOD_NOT_ALLOWED (HttpStatus.METHOD_NOT_ALLOWED, "This HTTP method is not supported for this resource"),
    MISSING_REQUEST_PART (HttpStatus.BAD_REQUEST, "A required request parameter or file is missing"),
    FILE_TOO_LARGE (HttpStatus.PAYLOAD_TOO_LARGE, "The uploaded file is too large"),
    UNSUPPORTED_MEDIA_TYPE (HttpStatus.UNSUPPORTED_MEDIA_TYPE, "This Content-Type is not supported for this resource"),

    // ── Assistant chatbot ─────────────────────────────────────────
    ASSISTANT_RATE_LIMITED (HttpStatus.TOO_MANY_REQUESTS, "Too many assistant questions; try again later"),
    ASSISTANT_UNAVAILABLE (HttpStatus.SERVICE_UNAVAILABLE, "The assistant is not available right now"),
    // Not 401: the caller is signed in, and the web client logs out on any 401.
    WRONG_CURRENT_PASSWORD (HttpStatus.BAD_REQUEST, "Current password is incorrect");

    private final HttpStatus httpStatus;
    private final String defaultMessage;
}
