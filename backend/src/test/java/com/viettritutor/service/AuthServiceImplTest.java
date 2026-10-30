package com.viettritutor.service;

import com.viettritutor.dto.auth.ForgotPasswordRequest;
import com.viettritutor.dto.auth.ResetPasswordRequest;
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
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.LocalDateTime;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AuthServiceImplTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private EmailVerificationRepository emailVerificationRepository;

    @Mock
    private PasswordResetTokenRepository passwordResetTokenRepository;

    @Mock
    private PasswordEncoder passwordEncoder;

    @Mock
    private JwtService jwtService;

    @Mock
    private AuthenticationManager authenticationManager;

    @Mock
    private EmailService emailService;

    @InjectMocks
    private AuthServiceImpl authService;

    @BeforeEach
    void setUp() {
        ReflectionTestUtils.setField(authService, "configuredFrontendUrl", "http://localhost:5173");
    }

    @Test
    void forgotPassword_whenUserExists_sendsEmailWithToken() {
        User user = User.builder()
                .id(1L)
                .email("test@example.com")
                .fullName("Test User")
                .password("encoded_pass")
                .enabled(true)
                .build();

        when(userRepository.findByEmail("test@example.com")).thenReturn(Optional.of(user));

        ForgotPasswordRequest request = ForgotPasswordRequest.builder()
                .email("test@example.com")
                .build();

        authService.forgotPassword(request);

        verify(passwordResetTokenRepository).deleteAllByUserId(1L);
        verify(passwordResetTokenRepository).save(any(PasswordResetToken.class));

        ArgumentCaptor<String> linkCaptor = ArgumentCaptor.forClass(String.class);
        verify(emailService).sendPasswordResetEmail(eq("test@example.com"), linkCaptor.capture());

        assertTrue(linkCaptor.getValue().startsWith("http://localhost:5173/reset-password?token="));
    }

    @Test
    void resetPassword_whenTokenValid_updatesPassword() {
        PasswordResetToken token = PasswordResetToken.builder()
                .id(10L)
                .userId(1L)
                .token("valid-uuid-token")
                .expiresAt(LocalDateTime.now().plusMinutes(10))
                .used(false)
                .build();

        User user = User.builder()
                .id(1L)
                .email("test@example.com")
                .password("old_pass")
                .enabled(true)
                .build();

        when(passwordResetTokenRepository.findByToken("valid-uuid-token")).thenReturn(Optional.of(token));
        when(userRepository.findById(1L)).thenReturn(Optional.of(user));
        when(passwordEncoder.encode("newPassword123")).thenReturn("new_encoded_pass");

        ResetPasswordRequest request = ResetPasswordRequest.builder()
                .token("valid-uuid-token")
                .newPassword("newPassword123")
                .build();

        authService.resetPassword(request);

        assertEquals("new_encoded_pass", user.getPassword());
        assertTrue(token.isUsed());
        verify(userRepository).save(user);
        verify(passwordResetTokenRepository).save(token);
    }
}
