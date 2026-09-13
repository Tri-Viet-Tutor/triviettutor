package com.viettritutor.modules.auth.dto;

import lombok.Builder;
import lombok.Data;

/** Auth response DTO containing the JWT and minimal user info. */
@Data
@Builder
public class AuthResponse {

    private String accessToken;

    /** Minimal user payload embedded in the response for the frontend auth store. */
    private UserInfo user;

    @Data
    @Builder
    public static class UserInfo {
        private Long id;
        private String email;
        private String fullName;
        private String role;
    }
}
