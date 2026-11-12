
package com.viettritutor.controller;

import com.viettritutor.common.exception.BusinessException;
import com.viettritutor.common.exception.ErrorCode;
import com.viettritutor.dto.user.AvatarImageResponse;
import com.viettritutor.dto.user.AvatarResponse;
import com.viettritutor.entity.User;
import com.viettritutor.service.AvatarService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.CacheControl;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/v1")
@RequiredArgsConstructor
public class MeAvatarController {

    private final AvatarService avatarService;

    // Upload hoặc thay avatar của user đang đăng nhập
    @PostMapping(
            value = "/me/avatar",
            consumes = MediaType.MULTIPART_FORM_DATA_VALUE
    )
    public ResponseEntity<AvatarResponse> updateAvatar(
            @AuthenticationPrincipal User principal,
            @RequestParam("file") MultipartFile file
    ) {
        AvatarResponse response =
                avatarService.updateAvatar(principal, file);

        return ResponseEntity.ok(response);
    }

    // Xóa avatar của user đang đăng nhập
    @DeleteMapping("/me/avatar")
    public ResponseEntity<Void> deleteAvatar(
            @AuthenticationPrincipal User principal
    ) {
        avatarService.deleteAvatar(principal);
        return ResponseEntity.noContent().build();
    }

    // Lấy ảnh avatar theo ID user
    @GetMapping("/users/{id}/avatar")
    public ResponseEntity<byte[]> getAvatar(
            @PathVariable Long id
    ) {
        try {
            AvatarImageResponse image = avatarService.getAvatar(id);
            return ResponseEntity.ok()
                    .contentType(MediaType.parseMediaType(image.contentType()))
                    .cacheControl(CacheControl.noCache())
                    .body(image.data());
        } catch (BusinessException ex) {
            if (ex.getErrorCode() == ErrorCode.USER_NOT_FOUND || ex.getErrorCode() == ErrorCode.AVATAR_NOT_FOUND) {
                return ResponseEntity.notFound().build();
            }
            throw ex;
        }
    }
}
