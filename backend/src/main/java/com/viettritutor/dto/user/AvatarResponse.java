package com.viettritutor.dto.user;

public record AvatarResponse(
        String avatarUrl,
        String contentType,
        long size
) {}