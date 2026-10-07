package com.viettritutor.service;

import com.viettritutor.common.exception.BusinessException;
import com.viettritutor.common.exception.ErrorCode;
import com.viettritutor.dto.user.UpdateMeRequest;
import com.viettritutor.dto.user.MeResponse;
import com.viettritutor.entity.StudentProfile;
import com.viettritutor.entity.TutorProfile;
import com.viettritutor.entity.User;
import com.viettritutor.repository.StudentProfileRepository;
import com.viettritutor.repository.TutorProfileRepository;
import com.viettritutor.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class UserProfileService {
    private final UserRepository userRepository;
    private final StudentProfileRepository studentProfileRepository;
    private final TutorProfileRepository tutorProfileRepository;

    @Transactional(readOnly = true)
    public MeResponse getMyProfile(User user) {
        MeResponse.Profile profile = switch (user.getRole()) {
            case "ROLE_STUDENT" -> studentProfileRepository.findById(user.getId())
                    .map(p -> MeResponse.StudentProfileResponse.builder()
                            .phone(p.getPhone())
                            .address(p.getAddress())
                            .build())
                    .orElse(null);
            case "ROLE_TUTOR" -> tutorProfileRepository.findById(user.getId())
                    .map(p -> MeResponse.TutorProfileResponse.builder()
                            .baseSalary(p.getBaseSalary())
                            .sessionRate(p.getSessionRate())
                            .bio(p.getBio())
                            .build())
                    .orElse(null);
            default -> null;
        };
        return MeResponse.builder()
                .id(user.getId())
                .email(user.getEmail())
                .fullName(user.getFullName())
                .role(user.getRole())
                .createdAt(user.getCreatedAt())
                .profile(profile)
                .build();
    }

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
}
