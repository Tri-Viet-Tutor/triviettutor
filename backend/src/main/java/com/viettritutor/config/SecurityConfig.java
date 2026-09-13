package com.viettritutor.config;

import com.viettritutor.security.jwt.JwtAuthFilter;
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
 *   /api/v1/catalog/**       — authenticated
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

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        return http
                .csrf(AbstractHttpConfigurer::disable)
                .sessionManagement(sm -> sm.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .authorizeHttpRequests(auth -> auth
                        // Public endpoints
                        .requestMatchers("/api/v1/auth/**").permitAll()
                        // Swagger / OpenAPI docs (dev-friendly)
                        .requestMatchers("/swagger-ui/**", "/api-docs/**").permitAll()
                        // Role-restricted prefixes
                        .requestMatchers("/api/v1/admin/**").hasRole("ADMIN")
                        .requestMatchers("/api/v1/tutor/**").hasRole("TUTOR")
                        .requestMatchers("/api/v1/enrollments/**").hasRole("STUDENT")
                        // Catalog accessible to all authenticated users
                        .requestMatchers(HttpMethod.GET, "/api/v1/catalog/**").authenticated()
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
