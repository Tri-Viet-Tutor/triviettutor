package com.viettritutor.controller;

import com.viettritutor.common.api.ApiResponse;
import com.viettritutor.dto.user.MeResponse;
import com.viettritutor.entity.User;
import com.viettritutor.security.CurrentUser;
import com.viettritutor.service.UserProfileService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/me")
@RequiredArgsConstructor
@Tag(name = "My profile", description = "Current authenticated user's profile")
public class MeController {
    private final UserProfileService userProfileService;

    @GetMapping
    @Operation(summary = "Get my profile", description = "Available to every authenticated role. Returns only the caller's profile.")
    public ResponseEntity<ApiResponse<MeResponse>> getMe(@Parameter(hidden = true) @CurrentUser User user) {
        return ResponseEntity.ok(ApiResponse.ok(userProfileService.getMyProfile(user)));
    }
}
