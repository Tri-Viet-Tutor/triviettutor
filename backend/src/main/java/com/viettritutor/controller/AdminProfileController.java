package com.viettritutor.controller;

import com.viettritutor.common.api.ApiResponse;
import com.viettritutor.common.api.PageResponse;
import com.viettritutor.dto.user.MeResponse;
import com.viettritutor.service.AdminProfileService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/admin/profiles")
@RequiredArgsConstructor
@Tag(name = "Admin profiles", description = "Full tutor and student profiles")
public class AdminProfileController {
    private final AdminProfileService adminProfileService;

    @GetMapping
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "List full profiles", description = "Admin only. role must be ROLE_TUTOR or ROLE_STUDENT. Search matches email or full name, ignoring case.")
    public ApiResponse<PageResponse<MeResponse>> getProfiles(
            @RequestParam String role,
            @RequestParam(required = false) String search,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return ApiResponse.ok(adminProfileService.getProfiles(role, search, page, size));
    }
}
