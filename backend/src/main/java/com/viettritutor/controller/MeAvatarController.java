
package com.viettritutor.controller;

import com.viettritutor.dto.user.AvatarResponse;
import com.viettritutor.entity.User;
import com.viettritutor.repository.UserRepository;
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
    private final UserRepository userRepository;

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
        return userRepository.findById(id)
                .filter(user -> user.getAvatar() != null)
                .map(user -> ResponseEntity.ok()
                        .contentType(MediaType.parseMediaType(
                                user.getAvatarContentType()
                        ))
                        .cacheControl(CacheControl.noCache())
                        .body(user.getAvatar()))
                .orElseGet(() -> ResponseEntity.notFound().build());
    }
}
