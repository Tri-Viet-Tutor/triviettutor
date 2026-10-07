package com.viettritutor.dto.assignment;

import com.viettritutor.entity.TutorAssignment;
import com.viettritutor.enums.AssignmentStatus;
import com.viettritutor.enums.ClassStatus;

import java.time.OffsetDateTime;

public record AssignmentResponse(Long assignmentId, Long classGroupId, Long tutorId,
                                 String tutorName, AssignmentStatus status, ClassStatus classStatus,
                                 Long assignedBy, OffsetDateTime assignedAt, String reason) {
    public static AssignmentResponse from(TutorAssignment assignment, String tutorName, ClassStatus classStatus) {
        return new AssignmentResponse(assignment.getId(), assignment.getClassGroupId(), assignment.getTutorId(),
                tutorName, assignment.getStatus(), classStatus,
                assignment.getAssignedBy(), assignment.getAssignedAt(), assignment.getReason());
    }
}
