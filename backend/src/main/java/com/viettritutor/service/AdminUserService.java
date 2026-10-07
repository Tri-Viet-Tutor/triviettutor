package com.viettritutor.service;

import com.viettritutor.common.api.PageResponse;
import com.viettritutor.common.exception.BusinessException;
import com.viettritutor.common.exception.ErrorCode;
import com.viettritutor.dto.user.AdminUserResponse;
import com.viettritutor.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Locale;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class AdminUserService {
    private static final Set<String> ROLES = Set.of("ROLE_ADMIN", "ROLE_TUTOR", "ROLE_STUDENT");

    private final UserRepository userRepository;

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
}
