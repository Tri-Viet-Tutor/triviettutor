package com.viettritutor.modules.schedule.repository;

import com.viettritutor.modules.schedule.domain.LearningSchedule;
import com.viettritutor.modules.schedule.domain.LearningScheduleStatus;
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
