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
import org.springframework.security.authentication.LockedException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.Locale;
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

    @Value("${app.frontend-url:http://localhost:5173}")
    private String configuredFrontendUrl;

    private static final SecureRandom RANDOM = new SecureRandom();

    /** Wrong OTP entries allowed per code before a resend is required. */
    static final int MAX_OTP_ATTEMPTS = 5;

    /** Minimum seconds between two OTP emails to the same address. */
    static final long OTP_RESEND_COOLDOWN_SECONDS = 60;

    @Override
    @Transactional(readOnly = true)
    public AuthResponse login(AuthRequest request) {
        String email = normalizeEmail(request.getEmail());
        try {
            authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(email, request.getPassword()));
        } catch (LockedException ex) {
            throw new BusinessException(ErrorCode.ACCOUNT_LOCKED);
        } catch (DisabledException ex) {
            throw new BusinessException(ErrorCode.ACCOUNT_NOT_VERIFIED);
        }

        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new BusinessException(ErrorCode.USER_NOT_FOUND));

        if (user.isLocked()) {
            throw new BusinessException(ErrorCode.ACCOUNT_LOCKED);
        }
        if (!user.isEnabled()) {
            throw new BusinessException(ErrorCode.ACCOUNT_NOT_VERIFIED);
        }

        return buildAuthResponse(user);
    }

    @Override
    @Transactional
    public RegisterResponse register(RegisterRequest request) {
        String email = normalizeEmail(request.getEmail());
        if (userRepository.existsByEmailIgnoreCase(email)) {
            User existing = userRepository.findByEmail(email).orElse(null);
            if (existing != null && !existing.isEnabled()) {
                ensureResendAllowed(existing.getEmail());
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
                .email(email)
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

    /**
     * Failed attempts must persist even though the method then throws, so business
     * errors do not roll back this transaction (only reads precede each throw).
     */
    @Override
    @Transactional(noRollbackFor = BusinessException.class)
    public AuthResponse verifyEmail(VerifyEmailRequest request) {
        String email = normalizeEmail(request.getEmail());
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new BusinessException(ErrorCode.USER_NOT_FOUND));

        if (user.isEnabled()) {
            throw new BusinessException(ErrorCode.ACCOUNT_ALREADY_VERIFIED);
        }

        EmailVerification verification = emailVerificationRepository
                .findTopByEmailAndVerifiedFalseOrderByCreatedAtDesc(email)
                .orElseThrow(() -> new BusinessException(ErrorCode.INVALID_OTP));

        if (verification.getFailedAttempts() >= MAX_OTP_ATTEMPTS) {
            throw new BusinessException(ErrorCode.OTP_ATTEMPTS_EXCEEDED);
        }

        if (verification.getExpiresAt().isBefore(LocalDateTime.now())) {
            throw new BusinessException(ErrorCode.OTP_EXPIRED);
        }

        if (!otpMatches(verification.getOtpCode(), request.getOtp())) {
            // Atomic conditional UPDATE: concurrent guesses cannot exceed the limit.
            int updated = emailVerificationRepository.incrementFailedAttempts(verification.getId(), MAX_OTP_ATTEMPTS);
            boolean exhausted = updated == 0 || verification.getFailedAttempts() + 1 >= MAX_OTP_ATTEMPTS;
            throw new BusinessException(exhausted ? ErrorCode.OTP_ATTEMPTS_EXCEEDED : ErrorCode.INVALID_OTP);
        }

        if (user.isLocked()) {
            throw new BusinessException(ErrorCode.ACCOUNT_LOCKED);
        }

        verification.setVerified(true);
        emailVerificationRepository.save(verification);

        user.setEnabled(true);
        userRepository.save(user);

        return buildAuthResponse(user);
    }

    /**
     * Emails are stored trimmed and lower-case, so "A@x.com" and "a@x.com" are one account
     * (users.email is unique only case-sensitively).
     */
    static String normalizeEmail(String email) {
        return email == null ? null : email.trim().toLowerCase(Locale.ROOT);
    }

    private static boolean otpMatches(String expected, String submitted) {
        if (submitted == null) {
            return false;
        }
        return MessageDigest.isEqual(
                expected.getBytes(StandardCharsets.UTF_8),
                submitted.trim().getBytes(StandardCharsets.UTF_8));
    }

    /** At most one OTP email per address per cooldown window (resend and re-register paths). */
    private void ensureResendAllowed(String email) {
        emailVerificationRepository.findTopByEmailOrderByCreatedAtDesc(email)
                .map(EmailVerification::getCreatedAt)
                .filter(lastSent -> lastSent.isAfter(LocalDateTime.now().minusSeconds(OTP_RESEND_COOLDOWN_SECONDS)))
                .ifPresent(lastSent -> {
                    throw new BusinessException(ErrorCode.OTP_RESEND_TOO_SOON);
                });
    }

    @Override
    @Transactional
    public RegisterResponse resendVerification(ResendVerificationRequest request) {
        User user = userRepository.findByEmail(normalizeEmail(request.getEmail()))
                .orElseThrow(() -> new BusinessException(ErrorCode.USER_NOT_FOUND));

        if (user.isEnabled()) {
            throw new BusinessException(ErrorCode.ACCOUNT_ALREADY_VERIFIED);
        }

        ensureResendAllowed(user.getEmail());
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
        userRepository.findByEmail(normalizeEmail(request.getEmail())).ifPresent(user -> {
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

            String resetLink = frontendBaseUrl() + "/reset-password?token=" + token;
            emailService.sendPasswordResetEmail(user.getEmail(), resetLink);
        });
    }

    /**
     * The reset link host always comes from server configuration (app.frontend-url),
     * never from the request body or Origin/Referer headers, so an attacker cannot
     * make the emailed link point at a host they control.
     * If several origins are configured (comma separated), the first one is used.
     */
    private String frontendBaseUrl() {
        String first = configuredFrontendUrl == null ? "" : configuredFrontendUrl.split(",")[0].trim();
        if (first.isEmpty()) {
            throw new BusinessException(ErrorCode.EMAIL_SEND_FAILED);
        }
        return first.replaceAll("/+$", "");
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
