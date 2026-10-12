package com.viettritutor.service;

import com.viettritutor.dto.assignment.AssignmentResponse;
import com.viettritutor.dto.assignment.AvailableTutorResponse;
import com.viettritutor.entity.User;

import java.util.List;

public interface TutorAssignmentService {
    AssignmentResponse assign(Long classId, Long tutorId, User admin);
    AssignmentResponse reassign(Long classId, Long tutorId, String reason, User admin);
    List<AvailableTutorResponse> availableTutors(Long classId);
}
