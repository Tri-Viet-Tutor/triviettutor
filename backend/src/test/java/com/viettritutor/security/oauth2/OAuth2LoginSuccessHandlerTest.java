package com.viettritutor.security.oauth2;

import com.viettritutor.entity.User;
import com.viettritutor.repository.UserRepository;
import com.viettritutor.security.jwt.JwtService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.oauth2.client.authentication.OAuth2AuthenticationToken;
import org.springframework.security.oauth2.core.user.DefaultOAuth2User;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyMap;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class OAuth2LoginSuccessHandlerTest {

    @Mock UserRepository userRepository;
    @Mock JwtService jwtService;
    @InjectMocks OAuth2LoginSuccessHandler handler;

    @BeforeEach
    void setUp() {
        ReflectionTestUtils.setField(handler, "configuredFrontendUrl", "https://app.example.test/");
    }

    @Test
    void successRedirectsToFrontendWithTokenInFragmentAndEndsServerSession() throws Exception {
        User user = User.builder().id(5L).email("g@example.test").fullName("G").role("ROLE_STUDENT")
                .googleId("sub-1").enabled(true).build();
        when(userRepository.findByGoogleId("sub-1")).thenReturn(Optional.of(user));
        when(jwtService.generateToken(anyMap(), any())).thenReturn("jwt.token.value");
        MockHttpServletRequest request = new MockHttpServletRequest();
        var session = request.getSession(true);
        MockHttpServletResponse response = new MockHttpServletResponse();

        handler.onAuthenticationSuccess(request, response, google("sub-1", "g@example.test", true));

        assertEquals("https://app.example.test/oauth2/success#token=jwt.token.value", response.getRedirectedUrl());
        assertTrue(((org.springframework.mock.web.MockHttpSession) session).isInvalid());
    }

    @Test
    void newGoogleUserIsCreatedAsVerifiedStudent() throws Exception {
        when(userRepository.findByGoogleId("sub-new")).thenReturn(Optional.empty());
        when(userRepository.findByEmail("new@example.test")).thenReturn(Optional.empty());
        when(userRepository.save(any(User.class))).thenAnswer(inv -> inv.getArgument(0));
        when(jwtService.generateToken(anyMap(), any())).thenReturn("t");
        MockHttpServletResponse response = new MockHttpServletResponse();

        handler.onAuthenticationSuccess(new MockHttpServletRequest(), response, google("sub-new", "new@example.test", true));

        verify(userRepository).save(argThat(u -> "ROLE_STUDENT".equals(u.getRole()) && u.isEnabled()));
        assertEquals("https://app.example.test/oauth2/success#token=t", response.getRedirectedUrl());
    }

    @Test
    void lockedUserIsRedirectedToLoginWithError() throws Exception {
        User user = User.builder().id(6L).email("l@example.test").fullName("L").role("ROLE_STUDENT")
                .googleId("sub-l").enabled(true).locked(true).build();
        when(userRepository.findByGoogleId("sub-l")).thenReturn(Optional.of(user));
        MockHttpServletResponse response = new MockHttpServletResponse();

        handler.onAuthenticationSuccess(new MockHttpServletRequest(), response, google("sub-l", "l@example.test", true));

        assertEquals("https://app.example.test/login?error=ACCOUNT_LOCKED", response.getRedirectedUrl());
        verifyNoInteractions(jwtService);
    }

    @Test
    void unverifiedGoogleEmailAndLinkConflictsRedirectWithErrors() throws Exception {
        MockHttpServletResponse unverified = new MockHttpServletResponse();
        handler.onAuthenticationSuccess(new MockHttpServletRequest(), unverified, google("s", "x@example.test", false));
        assertEquals("https://app.example.test/login?error=GOOGLE_EMAIL_NOT_VERIFIED", unverified.getRedirectedUrl());

        User other = User.builder().id(8L).email("other@example.test").fullName("O").role("ROLE_STUDENT")
                .googleId("sub-x").enabled(true).build();
        when(userRepository.findByGoogleId("sub-x")).thenReturn(Optional.of(other));
        MockHttpServletResponse mismatch = new MockHttpServletResponse();
        handler.onAuthenticationSuccess(new MockHttpServletRequest(), mismatch, google("sub-x", "changed@example.test", true));
        assertEquals("https://app.example.test/login?error=GOOGLE_ACCOUNT_CONFLICT", mismatch.getRedirectedUrl());
    }

    @Test
    void failureRedirectsToLoginWithError() throws Exception {
        MockHttpServletResponse response = new MockHttpServletResponse();
        handler.onAuthenticationFailure(new MockHttpServletRequest(), response, new BadCredentialsException("denied"));
        assertEquals("https://app.example.test/login?error=GOOGLE_LOGIN_FAILED", response.getRedirectedUrl());
    }

    private static OAuth2AuthenticationToken google(String sub, String email, boolean verified) {
        Map<String, Object> attributes = new HashMap<>();
        attributes.put("sub", sub);
        attributes.put("email", email);
        attributes.put("name", "Google User");
        attributes.put("email_verified", verified);
        DefaultOAuth2User principal = new DefaultOAuth2User(
                List.of(new SimpleGrantedAuthority("OAUTH2_USER")), attributes, "sub");
        return new OAuth2AuthenticationToken(principal, principal.getAuthorities(), "google");
    }
}
