
package com.viettritutor.service.impl;

import com.viettritutor.common.exception.BusinessException;
import com.viettritutor.common.exception.ErrorCode;
import com.viettritutor.dto.user.AvatarImageResponse;
import com.viettritutor.dto.user.AvatarResponse;
import com.viettritutor.entity.User;
import com.viettritutor.repository.UserRepository;
import com.viettritutor.service.AvatarService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import javax.imageio.ImageIO;
import java.io.IOException;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class AvatarServiceImpl implements AvatarService {

    private static final long MAX_SIZE = 2 * 1024 * 1024;

    private static final Set<String> ALLOWED_TYPES =
            Set.of("image/png", "image/jpeg");

    private final UserRepository userRepository;

    @Override
    @Transactional
    public AvatarResponse updateAvatar(User principal, MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new BusinessException(ErrorCode.INVALID_AVATAR);
        }

        if (file.getSize() > MAX_SIZE) {
            throw new BusinessException(ErrorCode.AVATAR_TOO_LARGE);
        }

        String contentType = file.getContentType();

        if (contentType == null || !ALLOWED_TYPES.contains(contentType)) {
            throw new BusinessException(ErrorCode.INVALID_AVATAR);
        }

        try {
            // Kiểm tra file có giải mã được thành ảnh hay không.
            if (ImageIO.read(file.getInputStream()) == null) {
                throw new BusinessException(ErrorCode.INVALID_AVATAR);
            }

            User user = userRepository.findById(principal.getId())
                    .orElseThrow(() ->
                            new BusinessException(ErrorCode.USER_NOT_FOUND));

            user.setAvatar(file.getBytes());
            user.setAvatarContentType(contentType);

            userRepository.save(user);

            return new AvatarResponse(
                    "/api/v1/users/" + user.getId() + "/avatar",
                    contentType,
                    file.getSize()
            );

        } catch (IOException e) {
            throw new BusinessException(ErrorCode.INVALID_AVATAR);
        }
    }

    @Override
    @Transactional
    public void deleteAvatar(User principal) {
        User user = userRepository.findById(principal.getId())
                .orElseThrow(() ->
                        new BusinessException(ErrorCode.USER_NOT_FOUND));

        user.setAvatar(null);
        user.setAvatarContentType(null);

        userRepository.save(user);
    }

    @Override
    @Transactional(readOnly = true)
    public AvatarImageResponse getAvatar(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() ->
                        new BusinessException(ErrorCode.USER_NOT_FOUND));

        if (user.getAvatar() == null) {
            throw new BusinessException(ErrorCode.AVATAR_NOT_FOUND);
        }

        return new AvatarImageResponse(
                user.getAvatar(),
                user.getAvatarContentType()
        );
    }
}
