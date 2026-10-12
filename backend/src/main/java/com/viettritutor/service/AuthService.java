package com.viettritutor.service;

import com.viettritutor.dto.auth.AuthRequest;
import com.viettritutor.dto.auth.AuthResponse;
import com.viettritutor.dto.auth.RegisterRequest;
import com.viettritutor.dto.auth.RegisterResponse;
import com.viettritutor.dto.auth.ResendVerificationRequest;
import com.viettritutor.dto.auth.VerifyEmailRequest;

public interface AuthService {
    AuthResponse login(AuthRequest request);
    RegisterResponse register(RegisterRequest request);
    AuthResponse verifyEmail(VerifyEmailRequest request);
    RegisterResponse resendVerification(ResendVerificationRequest request);
}
