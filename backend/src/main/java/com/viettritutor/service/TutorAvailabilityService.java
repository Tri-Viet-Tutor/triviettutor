package com.viettritutor.service;

import com.viettritutor.dto.assignment.AvailabilityRequest;
import com.viettritutor.dto.assignment.AvailabilityResponse;
import com.viettritutor.entity.User;

import java.util.List;

public interface TutorAvailabilityService {
    List<AvailabilityResponse> getAvailability(User tutor);
    List<AvailabilityResponse> replaceAvailability(User currentUser, AvailabilityRequest request);
}
