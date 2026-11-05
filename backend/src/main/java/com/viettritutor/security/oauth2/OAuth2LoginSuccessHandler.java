package com.viettritutor.security.oauth2;

import com.viettritutor.entity.User;
import com.viettritutor.repository.UserRepository;
import com.viettritutor.security.jwt.JwtService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.client.authentication.OAuth2AuthenticationToken;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.security.web.authentication.AuthenticationFailureHandler;
import org.springframework.security.web.authentication.AuthenticationSuccessHandler;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.util.UriComponentsBuilder;

import java.io.IOException;
import java.util.HashMap;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;

/**
 * Completes Google login: links or creates the local account, then redirects the
 * browser to the frontend with the JWT in the URL fragment
 * ({@code ${app.frontend-url}/oauth2/success#token=...}). A fragment is never sent
 * to servers or written to access logs, unlike a query parameter.
 * Failures redirect to {@code ${app.frontend-url}/login?error=CODE}.
 */
@Component
@RequiredArgsConstructor
public class OAuth2LoginSuccessHandler
        implements AuthenticationSuccessHandler, AuthenticationFailureHandler {

    static final String ERROR_EMAIL_NOT_VERIFIED = "GOOGLE_EMAIL_NOT_VERIFIED";
    static final String ERROR_ACCOUNT_NOT_VERIFIED = "ACCOUNT_NOT_VERIFIED";
    static final String ERROR_ACCOUNT_LOCKED = "ACCOUNT_LOCKED";
    static final String ERROR_ACCOUNT_LINK = "GOOGLE_ACCOUNT_CONFLICT";
    static final String ERROR_LOGIN_FAILED = "GOOGLE_LOGIN_FAILED";

    private final UserRepository userRepository;
    private final JwtService jwtService;

    @Value("${app.frontend-url:http://localhost:5173}")
    private String configuredFrontendUrl;

    @Override
    @Transactional
    public void onAuthenticationSuccess(
            HttpServletRequest request,
            HttpServletResponse response,
            Authentication authentication
    ) throws IOException {
        // The JWT is the session; drop the server-side OAuth session so it cannot
        // keep authenticating cookie requests after logout or an admin lock.
        endServerSession(request);

        OAuth2User oauth2User = ((OAuth2AuthenticationToken) authentication).getPrincipal();

        String googleId = oauth2User.getAttribute("sub");
        String googleEmail = oauth2User.getAttribute("email");
        // Local accounts store emails trimmed and lower-case.
        String email = googleEmail == null ? null : googleEmail.trim().toLowerCase(Locale.ROOT);
        String name = oauth2User.getAttribute("name");
        Boolean emailVerified = oauth2User.getAttribute("email_verified");

        if (googleId == null || email == null || !Boolean.TRUE.equals(emailVerified)) {
            redirectError(response, ERROR_EMAIL_NOT_VERIFIED);
            return;
        }

        LinkResult result = findOrCreateUser(googleId, email, name);
        if (result.error() != null) {
            redirectError(response, result.error());
            return;
        }
        User user = result.user();

        if (user.isLocked()) {
            redirectError(response, ERROR_ACCOUNT_LOCKED);
            return;
        }
        if (!user.isEnabled()) {
            redirectError(response, ERROR_ACCOUNT_NOT_VERIFIED);
            return;
        }

        Map<String, Object> claims = new HashMap<>();
        claims.put("userId", user.getId());
        claims.put("role", user.getRole());
        String token = jwtService.generateToken(claims, user);

        response.sendRedirect(frontendBaseUrl() + "/oauth2/success#token=" + token);
    }

    /** Google rejected or the code exchange failed (user cancelled, bad client config, ...). */
    @Override
    public void onAuthenticationFailure(
            HttpServletRequest request,
            HttpServletResponse response,
            org.springframework.security.core.AuthenticationException exception
    ) throws IOException {
        endServerSession(request);
        redirectError(response, ERROR_LOGIN_FAILED);
    }

    private LinkResult findOrCreateUser(String googleId, String email, String name) {
        // 1. Google ID already linked to an account
        Optional<User> byGoogleId = userRepository.findByGoogleId(googleId);
        if (byGoogleId.isPresent()) {
            User user = byGoogleId.get();
            // Reject a Google identity whose email no longer matches the linked account.
            if (!user.getEmail().equalsIgnoreCase(email)) {
                return LinkResult.error(ERROR_ACCOUNT_LINK);
            }
            return LinkResult.of(user);
        }

        // 2. Google ID not linked yet: match by email
        Optional<User> byEmail = userRepository.findByEmail(email);
        if (byEmail.isPresent()) {
            User user = byEmail.get();
            if (user.isLocked()) {
                return LinkResult.error(ERROR_ACCOUNT_LOCKED);
            }
            // Local email not verified yet: do not link
            if (!user.isEnabled()) {
                return LinkResult.error(ERROR_ACCOUNT_NOT_VERIFIED);
            }
            // Only link when the account has no other Google ID
            if (user.getGoogleId() != null && !user.getGoogleId().equals(googleId)) {
                return LinkResult.error(ERROR_ACCOUNT_LINK);
            }
            user.setGoogleId(googleId);
            return LinkResult.of(userRepository.save(user));
        }

        // 3. No account uses this email yet: create a student account
        User user = User.builder()
                .email(email)
                .googleId(googleId)
                .fullName(name == null || name.isBlank() ? email : name)
                .role("ROLE_STUDENT")
                .enabled(true)
                .password(null)
                .build();
        return LinkResult.of(userRepository.save(user));
    }

    private void redirectError(HttpServletResponse response, String error) throws IOException {
        String url = UriComponentsBuilder
                .fromUriString(frontendBaseUrl() + "/login")
                .queryParam("error", error)
                .build()
                .encode()
                .toUriString();
        response.sendRedirect(url);
    }

    private static void endServerSession(HttpServletRequest request) {
        SecurityContextHolder.clearContext();
        HttpSession session = request.getSession(false);
        if (session != null) {
            session.invalidate();
        }
    }

    /** First entry of app.frontend-url (comma separated values are allowed). */
    private String frontendBaseUrl() {
        String first = configuredFrontendUrl == null ? "" : configuredFrontendUrl.split(",")[0].trim();
        return (first.isEmpty() ? "http://localhost:5173" : first).replaceAll("/+$", "");
    }

    private record LinkResult(User user, String error) {
        static LinkResult of(User user) {
            return new LinkResult(user, null);
        }

        static LinkResult error(String error) {
            return new LinkResult(null, error);
        }
    }
}
