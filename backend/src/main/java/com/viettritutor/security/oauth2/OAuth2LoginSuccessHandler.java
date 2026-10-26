
package com.viettritutor.security.oauth2;

import com.viettritutor.entity.User;
import com.viettritutor.repository.UserRepository;
import com.viettritutor.security.jwt.JwtService;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.client.authentication.OAuth2AuthenticationToken;
import org.springframework.security.oauth2.core.OAuth2AuthenticationException;
import org.springframework.security.oauth2.core.OAuth2Error;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.security.web.authentication.AuthenticationSuccessHandler;
import org.springframework.security.web.authentication.SimpleUrlAuthenticationSuccessHandler;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.util.UriComponentsBuilder;

import java.io.IOException;
import java.util.HashMap;
import java.util.Map;
import java.util.Optional;

@Component
@RequiredArgsConstructor
public class OAuth2LoginSuccessHandler
        implements AuthenticationSuccessHandler {

    private final UserRepository userRepository;
    private final JwtService jwtService;
    private static final String FRONTEND_URL = "http://localhost:5173";

    @Override
    @Transactional
    public void onAuthenticationSuccess(
            HttpServletRequest request,
            HttpServletResponse response,
            Authentication authentication
    ) throws IOException {

        OAuth2User oauth2User =
                ((OAuth2AuthenticationToken) authentication)
                        .getPrincipal();

        String googleId = oauth2User.getAttribute("sub");
        String email = oauth2User.getAttribute("email");
        String name = oauth2User.getAttribute("name");
        Boolean emailVerified =
                oauth2User.getAttribute("email_verified");

        if (googleId == null
                || email == null
                || !Boolean.TRUE.equals(emailVerified)) {
            redirectError(response, "GOOGLE_EMAIL_NOT_VERIFIED");
            return;
        }

        User user = findOrCreateUser(
                googleId, email, name
        );

        if (user == null) {
            redirectError(response, "ACCOUNT_NOT_VERIFIED");
            return;
        }

        if (!user.isEnabled()) {
            redirectError(response, "ACCOUNT_DISABLED");
            return;
        }

        Map<String, Object> claims = new HashMap<>();
        claims.put("userId", user.getId());
        claims.put("role", user.getRole());

        String token = jwtService.generateToken(claims, user);

        String redirectUrl = UriComponentsBuilder
                .fromUriString(FRONTEND_URL + "/oauth2/success")
                .queryParam("token", token)
                .build()
                .encode()
                .toUriString();

        response.setStatus(HttpServletResponse.SC_OK);
        response.setContentType("text/plain;charset=UTF-8");
        response.getWriter().write(
                "Google Login successful. User ID: " + user.getId()
        );
        //response.sendRedirect(redirectUrl);
    }

    private User findOrCreateUser(
            String googleId,
            String email,
            String name
    ) {
        // 1. Google ID đã liên kết với một tài khoản
        Optional<User> byGoogleId =
                userRepository.findByGoogleId(googleId);

        if (byGoogleId.isPresent()) {
            User user = byGoogleId.get();

            // Không chấp nhận danh tính Google có email
            // không khớp với email đã liên kết.
            if (!user.getEmail().equalsIgnoreCase(email)) {
                throw new OAuth2AuthenticationException(
                        new OAuth2Error("account_link_mismatch")
                );
            }

            return user;
        }

        // 2. Google ID chưa liên kết: tìm theo email
        Optional<User> byEmail =
                userRepository.findByEmail(email);

        if (byEmail.isPresent()) {
            User user = byEmail.get();

            // Email local chưa được xác thực
            if (!user.isEnabled()) {
                return null;
            }

            // Chỉ liên kết nếu tài khoản chưa có Google ID
            if (user.getGoogleId() != null
                    && !user.getGoogleId().equals(googleId)) {
                throw new OAuth2AuthenticationException(
                        new OAuth2Error("account_link_conflict")
                );
            }

            user.setGoogleId(googleId);
            return userRepository.save(user);
        }

        // 3. Chưa có tài khoản nào dùng email này
        User user = User.builder()
                .email(email)
                .googleId(googleId)
                .fullName(name)
                .role("ROLE_STUDENT")
                .enabled(true)
                .password(null)
                .build();

        return userRepository.save(user);
    }

    private void redirectError(
            HttpServletResponse response,
            String error
    ) throws IOException {
        String url = UriComponentsBuilder
                .fromUriString(FRONTEND_URL + "/login")
                .queryParam("error", error)
                .build()
                .encode()
                .toUriString();

        response.sendRedirect(url);
    }
}
