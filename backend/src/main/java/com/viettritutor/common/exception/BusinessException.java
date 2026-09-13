package com.viettritutor.common.exception;

import lombok.Getter;

/**
 * Application-specific business rule exception.
 *
 * Throw this when a business rule is violated (e.g., schedule conflict, class full).
 * The GlobalExceptionHandler maps it to the appropriate HTTP status and error code.
 *
 * Usage:
 *   throw new BusinessException(ErrorCode.SCHEDULE_CONFLICT);
 *   throw new BusinessException(ErrorCode.CLASS_FULL, "Class has reached maximum capacity");
 */
@Getter
public class BusinessException extends RuntimeException {

    private final ErrorCode errorCode;

    public BusinessException(ErrorCode errorCode) {
        super(errorCode.getDefaultMessage());
        this.errorCode = errorCode;
    }

    public BusinessException(ErrorCode errorCode, String message) {
        super(message);
        this.errorCode = errorCode;
    }
}
