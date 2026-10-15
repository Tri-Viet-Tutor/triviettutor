package com.viettritutor.service;

import com.viettritutor.dto.user.MeResponse;
import com.viettritutor.dto.user.UpdateMeRequest;
import com.viettritutor.entity.User;

public interface UserProfileService {
    MeResponse getMyProfile(User user);
    MeResponse updateMyProfile(User principal, UpdateMeRequest request);
}
