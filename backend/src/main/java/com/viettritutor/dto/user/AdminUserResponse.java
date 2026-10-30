package com.viettritutor.dto.user;

import com.viettritutor.entity.User;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@Builder
public class AdminUserResponse {
    public static final String STATUS_ACTIVE = "ACTIVE";
    public static final String STATUS_LOCKED = "LOCKED";
    public static final String STATUS_UNVERIFIED = "UNVERIFIED";

    private Long id;
    private String email;
    private String fullName;
    private String role;
    private LocalDateTime createdAt;
    /** Locked by an administrator (FR-AUTH-03). */
    private boolean locked;
    /** Email verified / account activated. */
    private boolean enabled;
    /** LOCKED wins over UNVERIFIED; otherwise ACTIVE. */
    private String status;

    public static AdminUserResponse from(User user) {
        return AdminUserResponse.builder()
                .id(user.getId())
                .email(user.getEmail())
                .fullName(user.getFullName())
                .role(user.getRole())
                .createdAt(user.getCreatedAt())
                .locked(user.isLocked())
                .enabled(user.isEnabled())
                .status(user.isLocked() ? STATUS_LOCKED : user.isEnabled() ? STATUS_ACTIVE : STATUS_UNVERIFIED)
                .build();
    }
}
