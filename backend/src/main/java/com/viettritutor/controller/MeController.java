package com.viettritutor.controller;

import com.viettritutor.common.api.ApiResponse;
import com.viettritutor.dto.user.MeResponse;
import com.viettritutor.dto.user.UnlinkGoogleRequest;
import com.viettritutor.entity.User;
import com.viettritutor.service.UserProfileService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/me")
@RequiredArgsConstructor
public class MeController {

    private final UserProfileService userProfileService;

    @DeleteMapping("/google/link")
    public ResponseEntity<ApiResponse<MeResponse>> unlinkGoogle(
            @AuthenticationPrincipal User principal,
            @Valid @RequestBody UnlinkGoogleRequest request
    ) {
        return ResponseEntity.ok(ApiResponse.ok(
                userProfileService.unlinkGoogle(principal, request)
        ));
    }
}
