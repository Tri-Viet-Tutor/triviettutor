package com.viettritutor.service.impl;

import com.viettritutor.common.exception.BusinessException;
import com.viettritutor.common.exception.ErrorCode;
import com.viettritutor.dto.user.MeResponse;
import com.viettritutor.dto.user.UnlinkGoogleRequest;
import com.viettritutor.dto.user.UpdateMeRequest;
import com.viettritutor.entity.StudentProfile;
import com.viettritutor.entity.TutorProfile;
import com.viettritutor.entity.User;
import com.viettritutor.repository.StudentProfileRepository;
import com.viettritutor.repository.TutorProfileRepository;
import com.viettritutor.repository.UserRepository;
import com.viettritutor.service.UserProfileService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class UserProfileServiceImpl implements UserProfileService {
    private final UserRepository userRepository;
    private final StudentProfileRepository studentProfileRepository;
    private final TutorProfileRepository tutorProfileRepository;
    private final PasswordEncoder passwordEncoder;

    @Override
    @Transactional(readOnly = true)
    public MeResponse getMyProfile(User user) {

        MeResponse.Profile profile = switch (user.getRole()) {
            case "ROLE_STUDENT" -> studentProfileRepository.findById(user.getId())
                    .map(p -> new MeResponse.StudentProfileResponse(
                            p.getPhone(),
                            p.getAddress()
                    ))
                    .orElse(null);

            case "ROLE_TUTOR" -> tutorProfileRepository.findById(user.getId())
                    .map(p -> new MeResponse.TutorProfileResponse(
                            p.getBaseSalary(),
                            p.getSessionRate(),
                            p.getBio()
                    ))
                    .orElse(null);

            default -> null;
        };

        boolean googleLinked = user.getGoogleId() != null;

        return new MeResponse(
                user.getId(),
                user.getEmail(),
                user.getFullName(),
                user.getAvatar() != null
                        ? "/api/v1/users/" + user.getId() + "/avatar"
                        : null,
                user.getRole(),
                user.getCreatedAt(),
                googleLinked,
                profile
        );

    }

    @Override
    @Transactional
    public MeResponse updateMyProfile(User principal, UpdateMeRequest request) {
        User user = userRepository.findById(principal.getId())
                .orElseThrow(() -> new BusinessException(ErrorCode.USER_NOT_FOUND));

        switch (user.getRole()) {
            case "ROLE_STUDENT" -> {
                if (request.getBio() != null) {
                    throw new BusinessException(ErrorCode.INVALID_PROFILE_FIELD);
                }
                StudentProfile profile = studentProfileRepository.findById(user.getId())
                        .orElseGet(() -> {
                            StudentProfile created = new StudentProfile();
                            created.setUser(user);
                            return created;
                        });
                if (request.getPhone() != null) profile.setPhone(request.getPhone());
                if (request.getAddress() != null) profile.setAddress(request.getAddress());
                studentProfileRepository.save(profile);
            }
            case "ROLE_TUTOR" -> {
                if (request.getPhone() != null || request.getAddress() != null) {
                    throw new BusinessException(ErrorCode.INVALID_PROFILE_FIELD);
                }
                TutorProfile profile = tutorProfileRepository.findById(user.getId())
                        .orElseGet(() -> {
                            TutorProfile created = new TutorProfile();
                            created.setUser(user);
                            return created;
                        });
                if (request.getBio() != null) profile.setBio(request.getBio());
                tutorProfileRepository.save(profile);
            }
            case "ROLE_ADMIN" -> {
                if (request.getPhone() != null || request.getAddress() != null || request.getBio() != null) {
                    throw new BusinessException(ErrorCode.INVALID_PROFILE_FIELD);
                }
            }
            default -> throw new BusinessException(ErrorCode.ACCESS_DENIED);
        }

        user.setFullName(request.getFullName().trim());
        userRepository.save(user);
        return getMyProfile(user);
    }

    @Override
    @Transactional
    public MeResponse unlinkGoogle(
            User principal,
            UnlinkGoogleRequest request
    ) {
        User user = userRepository.findById(principal.getId())
                .orElseThrow(() -> new BusinessException(ErrorCode.USER_NOT_FOUND));

        if (user.getGoogleId() == null) {
            throw new BusinessException(ErrorCode.GOOGLE_NOT_LINKED);
        }

        if (user.getPassword() == null || user.getPassword().isBlank()) {
            throw new BusinessException(ErrorCode.GOOGLE_UNLINK_NOT_ALLOWED);
        }

        if (!passwordEncoder.matches(request.getPassword(), user.getPassword())) {
            throw new BusinessException(ErrorCode.INVALID_CREDENTIALS);
        }

        user.setGoogleId(null);
        userRepository.save(user);

        return getMyProfile(user);
    }
}
