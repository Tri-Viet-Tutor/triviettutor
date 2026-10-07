package com.viettritutor.service;

import com.viettritutor.common.api.PageResponse;
import com.viettritutor.common.exception.BusinessException;
import com.viettritutor.common.exception.ErrorCode;
import com.viettritutor.dto.user.AdminUserResponse;
import com.viettritutor.dto.user.CreateTutorRequest;
import com.viettritutor.dto.user.MeResponse;
import com.viettritutor.entity.TutorProfile;
import com.viettritutor.entity.User;
import com.viettritutor.repository.TutorProfileRepository;
import com.viettritutor.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.Locale;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class AdminUserService {
    private static final Set<String> ROLES = Set.of("ROLE_ADMIN", "ROLE_TUTOR", "ROLE_STUDENT");

    private final UserRepository userRepository;
    private final TutorProfileRepository tutorProfileRepository;
    private final PasswordEncoder passwordEncoder;

    @Transactional(readOnly = true)
    public PageResponse<AdminUserResponse> getUsers(String role, String search, int page, int size) {
        if (page < 0 || size < 1 || size > 100) {
            throw new BusinessException(ErrorCode.INVALID_PAGINATION);
        }
        String normalizedRole = role == null || role.isBlank() ? null : role.trim();
        if (normalizedRole != null && !ROLES.contains(normalizedRole)) {
            throw new BusinessException(ErrorCode.INVALID_ROLE_FILTER);
        }
        String normalizedSearch = search == null || search.isBlank()
                ? null : search.trim().toLowerCase(Locale.ROOT);
        return PageResponse.from(userRepository.findAdminUsers(
                normalizedRole, normalizedSearch,
                PageRequest.of(page, size, Sort.by("id").ascending()))
                .map(AdminUserResponse::from));
    }

    @Transactional
    public MeResponse createTutor(CreateTutorRequest request) {
        String email = request.getEmail().trim().toLowerCase(Locale.ROOT);
        if (userRepository.existsByEmailIgnoreCase(email)) {
            throw new BusinessException(ErrorCode.EMAIL_ALREADY_EXISTS);
        }

        User user = User.builder()
                .email(email)
                .password(passwordEncoder.encode(request.getPassword()))
                .fullName(request.getFullName().trim())
                .role("ROLE_TUTOR")
                .build();
        try {
            userRepository.saveAndFlush(user);
        } catch (DataIntegrityViolationException ex) {
            throw new BusinessException(ErrorCode.EMAIL_ALREADY_EXISTS);
        }

        TutorProfile profile = new TutorProfile();
        profile.setUser(user);
        profile.setBaseSalary(request.getBaseSalary());
        profile.setSessionRate(request.getSessionRate());
        profile.setBio(request.getBio());
        tutorProfileRepository.save(profile);

        return MeResponse.builder()
                .id(user.getId())
                .email(user.getEmail())
                .fullName(user.getFullName())
                .role(user.getRole())
                .createdAt(user.getCreatedAt())
                .profile(MeResponse.TutorProfileResponse.builder()
                        .baseSalary(profile.getBaseSalary())
                        .sessionRate(profile.getSessionRate())
                        .bio(profile.getBio())
                        .build())
                .build();
    }
}
