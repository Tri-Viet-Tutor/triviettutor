package com.viettritutor.common.api;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.Builder;
import lombok.Getter;

/**
 * Standard API response envelope.
 *
 * All REST endpoints should return this wrapper to give consumers
 * a consistent structure regardless of success or error.
 *
 * Success: { "success": true, "data": {...} }
 * Error: { "success": false, "message": "...", "errorCode": "SCHEDULE_CONFLICT"
 * }
 *
 * @param <T> type of the data payload
 */
@Getter
@Builder
@JsonInclude(JsonInclude.Include.NON_NULL)
public class ApiResponse<T> {

    private final boolean success;
    private final T data;
    private final String message;
    private final String errorCode;

    // ── Factory methods ───────────────────────────────────────────────────────

    public static <T> ApiResponse<T> ok(T data) {
        return ApiResponse.<T>builder().success(true).data(data).build();
    }

    public static <T> ApiResponse<T> ok() {
        return ApiResponse.<T>builder().success(true).build();
    }

    public static <T> ApiResponse<T> error(String message, String errorCode) {
        return ApiResponse.<T>builder()
                .success(false)
                .message(message)
                .errorCode(errorCode)
                .build();
    }
}
