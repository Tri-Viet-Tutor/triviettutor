package com.viettritutor.service;

import com.viettritutor.dto.user.AvatarImageResponse;
import com.viettritutor.dto.user.AvatarResponse;
import com.viettritutor.entity.User;
import org.springframework.web.multipart.MultipartFile;

public interface AvatarService {
    AvatarResponse updateAvatar(User principal, MultipartFile file);
    void deleteAvatar(User principal);
    AvatarImageResponse getAvatar(Long userId);
}