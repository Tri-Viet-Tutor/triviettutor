package com.viettritutor.service;

import com.viettritutor.dto.auth.AuthRequest;
import com.viettritutor.dto.auth.AuthResponse;
import com.viettritutor.dto.auth.RegisterRequest;
import com.viettritutor.dto.auth.RegisterResponse;
import com.viettritutor.dto.auth.ResendVerificationRequest;
import com.viettritutor.dto.auth.VerifyEmailRequest;

import com.viettritutor.dto.auth.ForgotPasswordRequest;
import com.viettritutor.dto.auth.ResetPasswordRequest;

public interface AuthService {
    AuthResponse login(AuthRequest request);
    RegisterResponse register(RegisterRequest request);
    AuthResponse verifyEmail(VerifyEmailRequest request);
    RegisterResponse resendVerification(ResendVerificationRequest request);
    void forgotPassword(ForgotPasswordRequest request);
    void resetPassword(ResetPasswordRequest request);
}
