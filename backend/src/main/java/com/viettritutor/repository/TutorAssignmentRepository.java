package com.viettritutor.repository;

import com.viettritutor.entity.TutorAssignment;
import com.viettritutor.enums.AssignmentStatus;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

public interface TutorAssignmentRepository extends JpaRepository<TutorAssignment, Long> {
    Optional<TutorAssignment> findByClassGroupIdAndStatus(Long classGroupId, AssignmentStatus status);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select a from TutorAssignment a where a.classGroupId = :classGroupId and a.status = :status")
    Optional<TutorAssignment> findByClassGroupIdAndStatusForUpdate(@Param("classGroupId") Long classGroupId, @Param("status") AssignmentStatus status);
}
