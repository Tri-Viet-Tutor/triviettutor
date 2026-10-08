package com.viettritutor.repository;

import com.viettritutor.entity.TutorAssignment;
import com.viettritutor.enums.AssignmentStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface TutorAssignmentRepository extends JpaRepository<TutorAssignment, Long> {
    Optional<TutorAssignment> findByClassGroupIdAndStatus(Long classGroupId, AssignmentStatus status);
}
