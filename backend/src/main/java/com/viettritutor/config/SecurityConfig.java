package com.viettritutor.config;

import com.viettritutor.security.jwt.JwtAuthFilter;
import com.viettritutor.security.RestAuthenticationEntryPoint;
import com.viettritutor.security.oauth2.OAuth2LoginSuccessHandler;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

/**
 * Spring Security configuration.
 *
 * URL access rules implement BR-01.10 permission matrix:
 *   /api/v1/auth/**          — public (login, register)
 *   GET /api/v1/catalog/**   — public (guests browse courses, classes and subjects)
 *   /api/v1/admin/**         — ROLE_ADMIN only
 *   /api/v1/tutor/**         — ROLE_TUTOR only
 *   /api/v1/enrollments/**   — ROLE_STUDENT only
 *   all others               — authenticated
 *
 * NOTE: URL rules are a first defense. Services must also check ownership
 * (e.g., tutor can only modify sessions they are assigned to).
 */
@Configuration
@EnableWebSecurity
@EnableMethodSecurity
@RequiredArgsConstructor
public class SecurityConfig {

    private final JwtAuthFilter jwtAuthFilter;
    private final RestAuthenticationEntryPoint authenticationEntryPoint;
    private final OAuth2LoginSuccessHandler oAuth2LoginSuccessHandler;

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        return http
                .cors(cors -> {})
                .csrf(AbstractHttpConfigurer::disable)
                .sessionManagement(sm -> sm.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .exceptionHandling(errors -> errors
                        .authenticationEntryPoint(authenticationEntryPoint)
                        .accessDeniedHandler((request, response, exception) -> {
                            response.setStatus(403);
                            response.setContentType("application/json");
                            response.getWriter().write("{\"success\":false,\"message\":\"Access denied\",\"errorCode\":\"ACCESS_DENIED\"}");
                        }))
                .oauth2Login(oauth2 -> oauth2.successHandler(oAuth2LoginSuccessHandler))
                .authorizeHttpRequests(auth -> auth
                        // Public endpoints
                        .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()
                        .requestMatchers("/api/v1/auth/**").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/v1/payments/vnpay/ipn").permitAll()
                        .requestMatchers(HttpMethod.POST, "/api/v1/meetings/webhook").permitAll()
                        .requestMatchers(HttpMethod.POST, "/api/v1/assistant/chat").permitAll()
                        .requestMatchers("/error").permitAll()
                        // Swagger / OpenAPI docs (dev-friendly)
                        .requestMatchers(
                                "/swagger-ui.html",
                                "/swagger-ui/**",
                                "/v3/api-docs/**",
                                "/api-docs/**"
                        ).permitAll()
                        // Role-restricted prefixes
                        .requestMatchers("/api/v1/admin/**").hasRole("ADMIN")
                        .requestMatchers("/api/v1/tutor/**").hasRole("TUTOR")
                        .requestMatchers("/api/v1/enrollments/**").hasRole("STUDENT")
                        .requestMatchers("/api/v1/cart", "/api/v1/cart/**").hasRole("STUDENT")
                        .requestMatchers(HttpMethod.GET, "/api/v1/orders/my").hasRole("STUDENT")
                        .requestMatchers(HttpMethod.GET, "/api/v1/orders/*").hasAnyRole("ADMIN", "STUDENT")
                        .requestMatchers("/api/v1/orders/**").hasRole("STUDENT")
                        .requestMatchers("/api/v1/payment-intents/**").hasRole("STUDENT")
                        .requestMatchers(HttpMethod.GET, "/api/v1/payments/*").hasAnyRole("ADMIN", "STUDENT")
                        .requestMatchers(HttpMethod.POST, "/api/v1/sessions/*/leave").hasAnyRole("TUTOR", "STUDENT")
                        .requestMatchers(HttpMethod.GET, "/api/v1/me/leave-requests").hasAnyRole("TUTOR", "STUDENT")
                        .requestMatchers(HttpMethod.PUT, "/api/v1/sessions/*/attendance").hasAnyRole("ADMIN", "TUTOR")
                        .requestMatchers(HttpMethod.GET, "/api/v1/sessions/*/attendance").hasAnyRole("ADMIN", "TUTOR", "STUDENT")
                        // Catalog (courses on sale, open classes, subjects) is public so guests can browse before signing up.
                        // An invalid or expired token is still rejected with 401 by JwtAuthFilter.
                        .requestMatchers(HttpMethod.GET, "/api/v1/catalog/**").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/v1/files/*").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/v1/users/*/avatar").permitAll()
                        .requestMatchers("/oauth2/**", "/login/**").permitAll()
                        // Everything else requires authentication
                        .anyRequest().authenticated()
                )
                .addFilterBefore(jwtAuthFilter, UsernamePasswordAuthenticationFilter.class)
                .build();
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public AuthenticationManager authenticationManager(AuthenticationConfiguration config) throws Exception {
        return config.getAuthenticationManager();
    }
}
