package com.viettritutor.dto.user;

public record AvatarImageResponse(
        byte[] data,
        String contentType
) {}