package com.viettritutor.service;

import com.viettritutor.common.api.PageResponse;
import com.viettritutor.dto.user.AdminUserResponse;
import com.viettritutor.dto.user.CreateTutorRequest;
import com.viettritutor.dto.user.MeResponse;
import com.viettritutor.dto.user.UpdateTutorProfileRequest;
import com.viettritutor.dto.user.UpdateUserRequest;

public interface AdminUserService {
    PageResponse<AdminUserResponse> getUsers(String role, String search, int page, int size);
    MeResponse createTutor(CreateTutorRequest request);
    MeResponse updateTutorProfile(Long userId, UpdateTutorProfileRequest request);
    AdminUserResponse updateUser(Long userId, UpdateUserRequest request);
    void deleteUser(Long userId, Long actorId);
}
