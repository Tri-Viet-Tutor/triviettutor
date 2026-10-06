package com.viettritutor.repository;

import com.viettritutor.entity.LearningSchedule;
import com.viettritutor.entity.enums.LearningScheduleStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.Optional;

public interface LearningScheduleRepository extends JpaRepository<LearningSchedule, Long> {
    Optional<LearningSchedule> findByEnrollmentId(Long enrollmentId);

    boolean existsByStudentIdAndClassGroupIdAndStatus(
            Long studentId, Long classGroupId, LearningScheduleStatus status);

    boolean existsByStudentIdAndClassGroupIdAndStatusAndStartDateLessThanEqualAndEndDateGreaterThanEqual(
            Long studentId,
            Long classGroupId,
            LearningScheduleStatus status,
            LocalDate startDate,
            LocalDate endDate);
}
