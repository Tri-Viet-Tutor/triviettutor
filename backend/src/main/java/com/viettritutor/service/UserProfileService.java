package com.viettritutor.service;

import com.viettritutor.dto.user.MeResponse;
import com.viettritutor.entity.User;
import com.viettritutor.repository.StudentProfileRepository;
import com.viettritutor.repository.TutorProfileRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class UserProfileService {
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
}
