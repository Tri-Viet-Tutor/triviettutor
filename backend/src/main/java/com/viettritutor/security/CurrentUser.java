package com.viettritutor.security;

import com.viettritutor.modules.user.domain.User;
import org.springframework.security.core.annotation.AuthenticationPrincipal;

import java.lang.annotation.*;

/**
 * Convenience annotation for injecting the current authenticated user
 * into controller method parameters.
 *
 * Usage:
 *   public ResponseEntity<?> getMyProfile(@CurrentUser User user) { ... }
 */
@Target(ElementType.PARAMETER)
@Retention(RetentionPolicy.RUNTIME)
@Documented
@AuthenticationPrincipal
public @interface CurrentUser {
}
