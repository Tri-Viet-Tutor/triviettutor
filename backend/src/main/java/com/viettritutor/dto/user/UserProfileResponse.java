package com.viettritutor.dto.user;

public record UserProfileResponse(
        String email,
        String fullName,
        String role
) {}
