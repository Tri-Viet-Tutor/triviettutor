package com.viettritutor.controller;

import com.viettritutor.common.api.ApiResponse;
import com.viettritutor.dto.assignment.AvailabilityRequest;
import com.viettritutor.dto.assignment.AvailabilityResponse;
import com.viettritutor.entity.User;
import com.viettritutor.security.CurrentUser;
import com.viettritutor.service.TutorAvailabilityService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/tutor/availability")
@PreAuthorize("hasRole('TUTOR')")
@RequiredArgsConstructor
@Tag(name = "Tutor availability")
public class TutorAvailabilityController {
    private final TutorAvailabilityService availabilityService;

    @GetMapping
    @Operation(summary = "Get the authenticated tutor's availability by date")
    public ApiResponse<List<AvailabilityResponse>> getAvailability(@CurrentUser User tutor) {
        return ApiResponse.ok(availabilityService.getAvailability(tutor));
    }

    @PutMapping
    @Operation(summary = "Replace the authenticated tutor's availability; empty slots clears it")
    public ApiResponse<List<AvailabilityResponse>> replaceAvailability(
            @CurrentUser User tutor, @Valid @RequestBody AvailabilityRequest request) {
        return ApiResponse.ok(availabilityService.replaceAvailability(tutor, request));
    }
}
