package com.viettritutor.controller;

import com.viettritutor.common.api.ApiResponse;
import com.viettritutor.dto.auth.*;
import com.viettritutor.service.AuthService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

/**
 * Authentication controller.
 * Base path: /api/v1/auth (public — no JWT required per SecurityConfig)
 */
@RestController
@RequestMapping("/api/v1/auth")
@RequiredArgsConstructor
@Tag(name = "Authentication", description = "Login, registration and email verification endpoints")
public class AuthController {

    private final AuthService authService;

    @Operation(summary = "Login and obtain JWT")
    @PostMapping("/login")
    public ResponseEntity<ApiResponse<AuthResponse>> login(
            @Valid @RequestBody AuthRequest request) {
        return ResponseEntity.ok(ApiResponse.ok(authService.login(request)));
    }

    @Operation(summary = "Register a new student account and send verification OTP email (BR-01.04)")
    @PostMapping("/register")
    public ResponseEntity<ApiResponse<RegisterResponse>> register(
            @Valid @RequestBody RegisterRequest request) {
        return ResponseEntity.ok(ApiResponse.ok(authService.register(request)));
    }

    @Operation(summary = "Verify account using OTP code received via email")
    @PostMapping("/verify-email")
    public ResponseEntity<ApiResponse<AuthResponse>> verifyEmail(
            @Valid @RequestBody VerifyEmailRequest request) {
        return ResponseEntity.ok(ApiResponse.ok(authService.verifyEmail(request)));
    }

    @Operation(summary = "Resend verification OTP email")
    @PostMapping("/resend-verification")
    public ResponseEntity<ApiResponse<RegisterResponse>> resendVerification(
            @Valid @RequestBody ResendVerificationRequest request) {
        return ResponseEntity.ok(ApiResponse.ok(authService.resendVerification(request)));
    }
}
