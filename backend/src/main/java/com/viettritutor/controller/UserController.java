package com.viettritutor.controller;

import com.viettritutor.common.api.ApiResponse;
import com.viettritutor.common.api.PageResponse;
import com.viettritutor.dto.user.AdminUserResponse;
import com.viettritutor.dto.user.CreateTutorRequest;
import com.viettritutor.dto.user.MeResponse;
import com.viettritutor.dto.user.UpdateTutorProfileRequest;
import com.viettritutor.service.AdminUserService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/admin/users")
@RequiredArgsConstructor
@Tag(name = "Users", description = "User administration")
public class UserController {
    private final AdminUserService adminUserService;

    @GetMapping
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "List and search users", description = "Admin only. Search matches email or full name, ignoring case.")
    public ApiResponse<PageResponse<AdminUserResponse>> getUsers(
            @RequestParam(required = false) String role,
            @RequestParam(required = false) String search,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return ApiResponse.ok(adminUserService.getUsers(role, search, page, size));
    }

    @PostMapping("/tutors")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Create a tutor account", description = "Admin only. Creates the user and tutor profile together.")
    public ResponseEntity<ApiResponse<MeResponse>> createTutor(@Valid @RequestBody CreateTutorRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok(adminUserService.createTutor(request)));
    }

    @PutMapping("/{userId}/tutor-profile")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Update a tutor profile", description = "Admin only. Updates compensation and biography for an existing tutor.")
    public ApiResponse<MeResponse> updateTutorProfile(
            @PathVariable Long userId,
            @Valid @RequestBody UpdateTutorProfileRequest request) {
        return ApiResponse.ok(adminUserService.updateTutorProfile(userId, request));
    }
}
