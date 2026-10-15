package com.viettritutor.service;

import com.viettritutor.common.api.PageResponse;
import com.viettritutor.common.exception.BusinessException;
import com.viettritutor.common.exception.ErrorCode;
import com.viettritutor.dto.user.MeResponse;
import com.viettritutor.entity.StudentProfile;
import com.viettritutor.entity.TutorProfile;
import com.viettritutor.entity.User;
import com.viettritutor.repository.StudentProfileRepository;
import com.viettritutor.repository.TutorProfileRepository;
import com.viettritutor.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * Hồ sơ đầy đủ (kèm phone / address của học viên, lương / thù lao / bio của gia sư)
 * của nhiều người dùng — dùng cho trang Hồ sơ của quản trị viên.
 */
@Service
@RequiredArgsConstructor
public class AdminProfileService {
    private static final Set<String> ROLES = Set.of("ROLE_TUTOR", "ROLE_STUDENT");

    private final UserRepository userRepository;
    private final TutorProfileRepository tutorProfileRepository;
    private final StudentProfileRepository studentProfileRepository;

    @Transactional(readOnly = true)
    public PageResponse<MeResponse> getProfiles(String role, String search, int page, int size) {
        if (page < 0 || size < 1 || size > 100) {
            throw new BusinessException(ErrorCode.INVALID_PAGINATION);
        }
        if (role == null || !ROLES.contains(role.trim())) {
            throw new BusinessException(ErrorCode.INVALID_ROLE_FILTER);
        }
        String normalizedRole = role.trim();
        String normalizedSearch = search == null || search.isBlank()
                ? null : search.trim().toLowerCase(Locale.ROOT);

        Page<User> users = userRepository.findAdminUsers(
                normalizedRole, normalizedSearch,
                PageRequest.of(page, size, Sort.by("id").ascending()));
        List<Long> ids = users.getContent().stream().map(User::getId).toList();

        if ("ROLE_TUTOR".equals(normalizedRole)) {
            Map<Long, TutorProfile> profiles = tutorProfileRepository.findAllById(ids).stream()
                    .collect(Collectors.toMap(TutorProfile::getId, Function.identity()));
            return PageResponse.from(users.map(user -> toResponse(user, tutorProfile(profiles.get(user.getId())))));
        }

        Map<Long, StudentProfile> profiles = studentProfileRepository.findAllById(ids).stream()
                .collect(Collectors.toMap(StudentProfile::getId, Function.identity()));
        return PageResponse.from(users.map(user -> toResponse(user, studentProfile(profiles.get(user.getId())))));
    }

    private static MeResponse.Profile tutorProfile(TutorProfile profile) {
        if (profile == null) {
            return null;
        }
        return MeResponse.TutorProfileResponse.builder()
                .baseSalary(profile.getBaseSalary())
                .sessionRate(profile.getSessionRate())
                .bio(profile.getBio())
                .build();
    }

    private static MeResponse.Profile studentProfile(StudentProfile profile) {
        if (profile == null) {
            return null;
        }
        return MeResponse.StudentProfileResponse.builder()
                .phone(profile.getPhone())
                .address(profile.getAddress())
                .build();
    }

    private static MeResponse toResponse(User user, MeResponse.Profile profile) {
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
