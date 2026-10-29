package com.viettritutor.service;

import com.viettritutor.common.exception.BusinessException;
import com.viettritutor.common.exception.ErrorCode;
import com.viettritutor.dto.auth.AuthRequest;
import com.viettritutor.dto.auth.ForgotPasswordRequest;
import com.viettritutor.dto.auth.ResendVerificationRequest;
import com.viettritutor.dto.auth.ResetPasswordRequest;
import com.viettritutor.dto.auth.VerifyEmailRequest;
import com.viettritutor.entity.EmailVerification;
import com.viettritutor.entity.PasswordResetToken;
import com.viettritutor.entity.User;
import com.viettritutor.repository.EmailVerificationRepository;
import com.viettritutor.repository.PasswordResetTokenRepository;
import com.viettritutor.repository.UserRepository;
import com.viettritutor.security.jwt.JwtService;
import com.viettritutor.service.impl.AuthServiceImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.LockedException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

import java.time.LocalDateTime;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

/** Reset-link host, OTP brute-force limits and account lock in AuthServiceImpl. */
@ExtendWith(MockitoExtension.class)
class AuthSecurityTest {

    @Mock UserRepository userRepository;
    @Mock EmailVerificationRepository emailVerificationRepository;
    @Mock PasswordResetTokenRepository passwordResetTokenRepository;
    @Mock PasswordEncoder passwordEncoder;
    @Mock JwtService jwtService;
    @Mock AuthenticationManager authenticationManager;
    @Mock EmailService emailService;

    @InjectMocks AuthServiceImpl authService;

    @BeforeEach
    void setUp() {
        ReflectionTestUtils.setField(authService, "configuredFrontendUrl", "https://app.example.test/, https://other.example.test");
    }

    // ── 1. Reset link host ────────────────────────────────────────────────────

    @Test
    void resetLinkIgnoresOriginAndRefererHeaders() {
        MockHttpServletRequest http = new MockHttpServletRequest();
        http.addHeader("Origin", "https://evil.example");
        http.addHeader("Referer", "https://evil.example/forgot");
        RequestContextHolder.setRequestAttributes(new ServletRequestAttributes(http));
        try {
            User user = User.builder().id(1L).email("a@example.test").fullName("A").enabled(true).build();
            when(userRepository.findByEmail("a@example.test")).thenReturn(Optional.of(user));

            authService.forgotPassword(ForgotPasswordRequest.builder().email("a@example.test").build());

            ArgumentCaptor<String> link = ArgumentCaptor.forClass(String.class);
            verify(emailService).sendPasswordResetEmail(eq("a@example.test"), link.capture());
            assertTrue(link.getValue().startsWith("https://app.example.test/reset-password?token="), link.getValue());
            assertFalse(link.getValue().contains("evil"));
        } finally {
            RequestContextHolder.resetRequestAttributes();
        }
    }

    // ── 3. OTP brute force ────────────────────────────────────────────────────

    @Test
    void wrongOtpIncrementsAttemptsAndFifthFailureLocksCode() {
        User user = unverifiedUser();
        EmailVerification code = otp("123456", 3, LocalDateTime.now().minusMinutes(1));
        when(userRepository.findByEmail(user.getEmail())).thenReturn(Optional.of(user));
        when(emailVerificationRepository.findTopByEmailAndVerifiedFalseOrderByCreatedAtDesc(user.getEmail()))
                .thenReturn(Optional.of(code));

        assertCode(ErrorCode.INVALID_OTP, () -> authService.verifyEmail(otpRequest(user, "000000")));
        assertEquals(4, code.getFailedAttempts());
        assertCode(ErrorCode.OTP_ATTEMPTS_EXCEEDED, () -> authService.verifyEmail(otpRequest(user, "000001")));
        assertEquals(5, code.getFailedAttempts());

        // Even the correct code is refused now; a resend is required.
        assertCode(ErrorCode.OTP_ATTEMPTS_EXCEEDED, () -> authService.verifyEmail(otpRequest(user, "123456")));
        assertFalse(user.isEnabled());
        verify(emailVerificationRepository, times(2)).save(code);
    }

    @Test
    void correctOtpUnderLimitActivatesAccount() {
        User user = unverifiedUser();
        EmailVerification code = otp("123456", 4, LocalDateTime.now().minusMinutes(1));
        when(userRepository.findByEmail(user.getEmail())).thenReturn(Optional.of(user));
        when(emailVerificationRepository.findTopByEmailAndVerifiedFalseOrderByCreatedAtDesc(user.getEmail()))
                .thenReturn(Optional.of(code));
        when(jwtService.generateToken(any(), any())).thenReturn("jwt");

        assertEquals("jwt", authService.verifyEmail(otpRequest(user, " 123456 ")).getAccessToken());
        assertTrue(user.isEnabled());
        assertTrue(code.isVerified());
    }

    @Test
    void verifyEmailRollbackRulesKeepFailedAttempts() throws Exception {
        var tx = AuthServiceImpl.class.getMethod("verifyEmail", VerifyEmailRequest.class)
                .getAnnotation(org.springframework.transaction.annotation.Transactional.class);
        assertArrayEquals(new Class<?>[]{BusinessException.class}, tx.noRollbackFor());
    }

    @Test
    void resendWithinCooldownIsRejected() {
        User user = unverifiedUser();
        when(userRepository.findByEmail(user.getEmail())).thenReturn(Optional.of(user));
        when(emailVerificationRepository.findTopByEmailOrderByCreatedAtDesc(user.getEmail()))
                .thenReturn(Optional.of(otp("111111", 0, LocalDateTime.now().minusSeconds(20))));

        assertCode(ErrorCode.OTP_RESEND_TOO_SOON,
                () -> authService.resendVerification(new ResendVerificationRequest(user.getEmail())));
        verify(emailService, never()).sendOtpEmail(anyString(), anyString());
    }

    @Test
    void resendAfterCooldownSendsFreshCode() {
        User user = unverifiedUser();
        when(userRepository.findByEmail(user.getEmail())).thenReturn(Optional.of(user));
        when(emailVerificationRepository.findTopByEmailOrderByCreatedAtDesc(user.getEmail()))
                .thenReturn(Optional.of(otp("111111", 5, LocalDateTime.now().minusSeconds(61))));

        authService.resendVerification(new ResendVerificationRequest(user.getEmail()));

        ArgumentCaptor<EmailVerification> saved = ArgumentCaptor.forClass(EmailVerification.class);
        verify(emailVerificationRepository).save(saved.capture());
        assertEquals(0, saved.getValue().getFailedAttempts());
        verify(emailService).sendOtpEmail(eq(user.getEmail()), anyString());
    }

    // ── 5. Account lock ───────────────────────────────────────────────────────

    @Test
    void loginOfLockedAccountReturnsAccountLocked() {
        when(authenticationManager.authenticate(any())).thenThrow(new LockedException("locked"));
        AuthRequest request = new AuthRequest();
        request.setEmail("x@example.test");
        request.setPassword("password1");
        assertCode(ErrorCode.ACCOUNT_LOCKED, () -> authService.login(request));
    }

    @Test
    void passwordResetDoesNotUnlock() {
        User user = User.builder().id(7L).email("l@example.test").fullName("L").enabled(true).locked(true).build();
        PasswordResetToken token = PasswordResetToken.builder().id(1L).userId(7L).token("t")
                .expiresAt(LocalDateTime.now().plusMinutes(5)).used(false).build();
        when(passwordResetTokenRepository.findByToken("t")).thenReturn(Optional.of(token));
        when(userRepository.findById(7L)).thenReturn(Optional.of(user));
        when(passwordEncoder.encode("newPassword1")).thenReturn("enc");

        authService.resetPassword(ResetPasswordRequest.builder().token("t").newPassword("newPassword1").build());

        assertTrue(user.isLocked());
        assertEquals("enc", user.getPassword());
    }

    private static User unverifiedUser() {
        return User.builder().id(3L).email("otp@example.test").fullName("Otp").role("ROLE_STUDENT").enabled(false).build();
    }

    private static EmailVerification otp(String value, int failures, LocalDateTime createdAt) {
        return EmailVerification.builder().id(9L).userId(3L).email("otp@example.test").otpCode(value)
                .expiresAt(LocalDateTime.now().plusMinutes(4)).failedAttempts(failures).createdAt(createdAt).build();
    }

    private static VerifyEmailRequest otpRequest(User user, String code) {
        return new VerifyEmailRequest(user.getEmail(), code);
    }

    private static void assertCode(ErrorCode expected, org.junit.jupiter.api.function.Executable call) {
        BusinessException ex = assertThrows(BusinessException.class, call);
        assertEquals(expected, ex.getErrorCode());
    }
}
