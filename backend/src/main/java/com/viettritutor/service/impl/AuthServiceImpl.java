package com.viettritutor.service.impl;

import com.viettritutor.common.exception.BusinessException;
import com.viettritutor.common.exception.ErrorCode;
import com.viettritutor.dto.auth.AuthRequest;
import com.viettritutor.dto.auth.AuthResponse;
import com.viettritutor.dto.auth.RegisterRequest;
import com.viettritutor.dto.auth.RegisterResponse;
import com.viettritutor.dto.auth.ResendVerificationRequest;
import com.viettritutor.dto.auth.VerifyEmailRequest;
import com.viettritutor.entity.EmailVerification;
import com.viettritutor.entity.User;
import com.viettritutor.repository.EmailVerificationRepository;
import com.viettritutor.repository.UserRepository;
import com.viettritutor.security.jwt.JwtService;
import com.viettritutor.service.AuthService;
import com.viettritutor.service.EmailService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.DisabledException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.Map;

/**
 * Authentication service implementation.
 *
 * Handles login, registration with email verification OTP, and OTP validation.
 */
@Service
@RequiredArgsConstructor
public class AuthServiceImpl implements AuthService {

    private final UserRepository userRepository;
    private final EmailVerificationRepository emailVerificationRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final AuthenticationManager authenticationManager;
    private final EmailService emailService;

    private static final SecureRandom RANDOM = new SecureRandom();

    @Override
    @Transactional(readOnly = true)
    public AuthResponse login(AuthRequest request) {
        try {
            authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(request.getEmail(), request.getPassword())
            );
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
                        .message("Tài khoản chưa kích hoạt trước đó đã được cập nhật. Mã OTP mới đã được gửi tới email của bạn.")
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
                "role", user.getRole()
        );
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
}
