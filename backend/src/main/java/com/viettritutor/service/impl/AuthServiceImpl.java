package com.viettritutor.service.impl;

import com.viettritutor.common.exception.BusinessException;
import com.viettritutor.common.exception.ErrorCode;
import com.viettritutor.dto.auth.AuthRequest;
import com.viettritutor.dto.auth.AuthResponse;
import com.viettritutor.dto.auth.RegisterRequest;
import com.viettritutor.dto.auth.RegisterResponse;
import com.viettritutor.dto.auth.ResendVerificationRequest;
import com.viettritutor.dto.auth.VerifyEmailRequest;
import com.viettritutor.dto.auth.ForgotPasswordRequest;
import com.viettritutor.dto.auth.ResetPasswordRequest;
import com.viettritutor.entity.EmailVerification;
import com.viettritutor.entity.PasswordResetToken;
import com.viettritutor.entity.User;
import com.viettritutor.repository.EmailVerificationRepository;
import com.viettritutor.repository.PasswordResetTokenRepository;
import com.viettritutor.repository.UserRepository;
import com.viettritutor.security.jwt.JwtService;
import com.viettritutor.service.AuthService;
import com.viettritutor.service.EmailService;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.DisabledException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;
import jakarta.servlet.http.HttpServletRequest;

import java.net.URI;
import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.Map;
import java.util.UUID;

/**
 * Authentication service implementation.
 *
 * Handles login, registration with email verification OTP, and password reset
 * flows.
 */
@Service
@RequiredArgsConstructor
public class AuthServiceImpl implements AuthService {

    private final UserRepository userRepository;
    private final EmailVerificationRepository emailVerificationRepository;
    private final PasswordResetTokenRepository passwordResetTokenRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final AuthenticationManager authenticationManager;
    private final EmailService emailService;

    @Value("${app.frontend-url}")
    private String configuredFrontendUrl;

    private static final SecureRandom RANDOM = new SecureRandom();

    @Override
    @Transactional(readOnly = true)
    public AuthResponse login(AuthRequest request) {
        try {
            authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(request.getEmail(), request.getPassword()));
        } catch (DisabledException ex) {
            throw new BusinessException(ErrorCode.ACCOUNT_NOT_VERIFIED);
        }

        User user = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new BusinessException(ErrorCode.USER_NOT_FOUND));

        if (!user.isEnabled()) {
            throw new BusinessException(ErrorCode.ACCOUNT_NOT_VERIFIED);
        }

        return buildAuthResponse(user);
    }

    @Override
    @Transactional
    public RegisterResponse register(RegisterRequest request) {
        if (userRepository.existsByEmail(request.getEmail())) {
            User existing = userRepository.findByEmail(request.getEmail()).orElse(null);
            if (existing != null && !existing.isEnabled()) {
                existing.setPassword(passwordEncoder.encode(request.getPassword()));
                existing.setFullName(request.getFullName());
                userRepository.save(existing);
                sendNewOtp(existing);
                return RegisterResponse.builder()
                        .email(existing.getEmail())
                        .message(
                                "Tài khoản chưa kích hoạt trước đó đã được cập nhật. Mã OTP mới đã được gửi tới email của bạn.")
                        .build();
            }
            throw new BusinessException(ErrorCode.EMAIL_ALREADY_EXISTS);
        }

        User user = User.builder()
                .email(request.getEmail())
                .password(passwordEncoder.encode(request.getPassword()))
                .fullName(request.getFullName())
                .role("ROLE_STUDENT")
                .enabled(false)
                .build();
        user = userRepository.save(user);

        sendNewOtp(user);

        return RegisterResponse.builder()
                .email(user.getEmail())
                .message("Đăng ký thành công. Vui lòng kiểm tra email để lấy mã OTP xác thực tài khoản.")
                .build();
    }

    @Override
    @Transactional
    public AuthResponse verifyEmail(VerifyEmailRequest request) {
        User user = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new BusinessException(ErrorCode.USER_NOT_FOUND));

        if (user.isEnabled()) {
            throw new BusinessException(ErrorCode.ACCOUNT_ALREADY_VERIFIED);
        }

        EmailVerification verification = emailVerificationRepository
                .findTopByEmailAndVerifiedFalseOrderByCreatedAtDesc(request.getEmail())
                .orElseThrow(() -> new BusinessException(ErrorCode.INVALID_OTP));

        if (verification.getExpiresAt().isBefore(LocalDateTime.now())) {
            throw new BusinessException(ErrorCode.OTP_EXPIRED);
        }

        if (!verification.getOtpCode().equals(request.getOtp().trim())) {
            throw new BusinessException(ErrorCode.INVALID_OTP);
        }

        verification.setVerified(true);
        emailVerificationRepository.save(verification);

        user.setEnabled(true);
        userRepository.save(user);

        return buildAuthResponse(user);
    }

    @Override
    @Transactional
    public RegisterResponse resendVerification(ResendVerificationRequest request) {
        User user = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new BusinessException(ErrorCode.USER_NOT_FOUND));

        if (user.isEnabled()) {
            throw new BusinessException(ErrorCode.ACCOUNT_ALREADY_VERIFIED);
        }

        sendNewOtp(user);

        return RegisterResponse.builder()
                .email(user.getEmail())
                .message("Mã OTP xác thực mới đã được gửi tới email của bạn.")
                .build();
    }

    private void sendNewOtp(User user) {
        String otpCode = String.format("%06d", RANDOM.nextInt(1_000_000));
        LocalDateTime expiresAt = LocalDateTime.now().plusMinutes(5);

        EmailVerification verification = EmailVerification.builder()
                .userId(user.getId())
                .email(user.getEmail())
                .otpCode(otpCode)
                .expiresAt(expiresAt)
                .verified(false)
                .build();
        emailVerificationRepository.save(verification);

        emailService.sendOtpEmail(user.getEmail(), otpCode);
    }

    private AuthResponse buildAuthResponse(User user) {
        Map<String, Object> claims = Map.of(
                "userId", user.getId(),
                "role", user.getRole());
        String token = jwtService.generateToken(claims, user);
        return AuthResponse.builder()
                .accessToken(token)
                .user(AuthResponse.UserInfo.builder()
                        .id(user.getId())
                        .email(user.getEmail())
                        .fullName(user.getFullName())
                        .role(user.getRole())
                        .build())
                .build();
    }

    @Override
    @Transactional
    public void forgotPassword(ForgotPasswordRequest request) {
        userRepository.findByEmail(request.getEmail().trim()).ifPresent(user -> {
            passwordResetTokenRepository.deleteAllByUserId(user.getId());

            String token = UUID.randomUUID().toString();
            LocalDateTime expiresAt = LocalDateTime.now().plusMinutes(15);

            PasswordResetToken resetToken = PasswordResetToken.builder()
                    .userId(user.getId())
                    .token(token)
                    .expiresAt(expiresAt)
                    .used(false)
                    .build();
            passwordResetTokenRepository.save(resetToken);

            String baseUrl = resolveBaseUrl(request.getFrontendUrl());
            String resetLink = baseUrl + "/reset-password?token=" + token;
            emailService.sendPasswordResetEmail(user.getEmail(), resetLink);
        });
    }

    private String resolveBaseUrl(String clientProvidedUrl) {
        // 1. Client explicitly provided URL (e.g. window.location.origin)
        if (clientProvidedUrl != null && !clientProvidedUrl.isBlank()) {
            return clientProvidedUrl.trim().replaceAll("/+$", "");
        }
        // 2. Request Origin / Referer header if available from current request
        try {
            ServletRequestAttributes attributes = (ServletRequestAttributes) RequestContextHolder.getRequestAttributes();
            if (attributes != null) {
                HttpServletRequest currentRequest = attributes.getRequest();
                String origin = currentRequest.getHeader("Origin");
                if (origin != null && !origin.isBlank()) {
                    return origin.trim().replaceAll("/+$", "");
                }
                String referer = currentRequest.getHeader("Referer");
                if (referer != null && !referer.isBlank()) {
                    URI uri = URI.create(referer);
                    return uri.getScheme() + "://" + uri.getAuthority();
                }
            }
        } catch (Exception ignored) {
        }
        // 3. Configured frontend URL from environment variable
        if (configuredFrontendUrl != null && !configuredFrontendUrl.isBlank()) {
            return configuredFrontendUrl.trim().replaceAll("/+$", "");
        }
        throw new BusinessException(ErrorCode.EMAIL_SEND_FAILED);
    }

    @Override
    @Transactional
    public void resetPassword(ResetPasswordRequest request) {
        PasswordResetToken resetToken = passwordResetTokenRepository.findByToken(request.getToken().trim())
                .orElseThrow(() -> new BusinessException(ErrorCode.INVALID_RESET_TOKEN));

        if (resetToken.isUsed()) {
            throw new BusinessException(ErrorCode.INVALID_RESET_TOKEN);
        }

        if (resetToken.getExpiresAt().isBefore(LocalDateTime.now())) {
            throw new BusinessException(ErrorCode.RESET_TOKEN_EXPIRED);
        }

        User user = userRepository.findById(resetToken.getUserId())
                .orElseThrow(() -> new BusinessException(ErrorCode.USER_NOT_FOUND));

        user.setPassword(passwordEncoder.encode(request.getNewPassword()));
        user.setEnabled(true);
        userRepository.save(user);

        resetToken.setUsed(true);
        passwordResetTokenRepository.save(resetToken);
    }
}
