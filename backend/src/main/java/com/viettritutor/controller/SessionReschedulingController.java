package com.viettritutor.controller;

import com.viettritutor.common.api.ApiResponse;
import com.viettritutor.dto.leave.*;
import com.viettritutor.dto.schedule.SessionResponse;
import com.viettritutor.entity.User;
import com.viettritutor.security.CurrentUser;
import com.viettritutor.service.SessionReschedulingService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Min;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/admin/sessions/{sessionId}")
@PreAuthorize("hasRole('ADMIN')")
@RequiredArgsConstructor
@Validated
@Tag(name = "Session rescheduling")
public class SessionReschedulingController {
    private final SessionReschedulingService reschedulingService;

    @PostMapping("/makeup")
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(summary = "Create one makeup after checking the tutor and all active students")
    public ApiResponse<SessionResponse> makeup(@PathVariable @Min(1) Long sessionId,
                                              @Valid @RequestBody MakeupRequest input,
                                              @CurrentUser User admin) {
        return ApiResponse.ok(reschedulingService.makeup(sessionId, input, admin));
    }

    @PostMapping("/substitute")
    @Operation(summary = "Assign a substitute to this session without changing the class's primary tutor")
    public ApiResponse<SessionResponse> substitute(@PathVariable @Min(1) Long sessionId,
                                                  @Valid @RequestBody SubstituteRequest input,
                                                  @CurrentUser User admin) {
        return ApiResponse.ok(reschedulingService.substitute(sessionId, input, admin));
    }

    @PostMapping("/cancel")
    @Operation(summary = "Cancel a session with an audit reason and resolve pending requests")
    public ApiResponse<SessionResponse> cancel(@PathVariable @Min(1) Long sessionId,
                                              @Valid @RequestBody CancelSessionRequest input,
                                              @CurrentUser User admin) {
        return ApiResponse.ok(reschedulingService.cancel(sessionId, input, admin));
    }
}
