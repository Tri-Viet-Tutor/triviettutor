package com.viettritutor.security.oauth2;
import com.viettritutor.entity.User;
import com.viettritutor.repository.UserRepository;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.client.authentication.OAuth2AuthenticationToken;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.security.web.authentication.SimpleUrlAuthenticationSuccessHandler;
import org.springframework.stereotype.Component;

import java.io.IOException;

@Component
@RequiredArgsConstructor
public class OAuth2LoginSuccessHandler
        extends SimpleUrlAuthenticationSuccessHandler {

    private final UserRepository userRepository;

    @Override
    public void onAuthenticationSuccess(
            HttpServletRequest request,
            HttpServletResponse response,
            Authentication authentication)
            throws IOException, ServletException {

        OAuth2AuthenticationToken oauthToken =
                (OAuth2AuthenticationToken) authentication;

        OAuth2User oauthUser = oauthToken.getPrincipal();

        String googleId = oauthUser.getAttribute("sub");
        String email = oauthUser.getAttribute("email");
        String fullName = oauthUser.getAttribute("name");

        System.out.println("Google ID: " + googleId);
        System.out.println("Email: " + email);
        System.out.println("Name: " + fullName);

        User user = userRepository.findByEmail(email)
                .orElseGet(() -> createGoogleUser(
                        email,
                        fullName,
                        googleId
                ));


        response.sendRedirect("http://localhost:3000");
    }

    private User createGoogleUser(
            String email,
            String fullName,
            String googleId) {

        User user = User.builder()
                .email(email)
                .fullName(fullName)
                .googleId(googleId)
                .password(null)
                .role("ROLE_STUDENT")
                .enabled(true)
                .build();

        return userRepository.save(user);
    }
}
