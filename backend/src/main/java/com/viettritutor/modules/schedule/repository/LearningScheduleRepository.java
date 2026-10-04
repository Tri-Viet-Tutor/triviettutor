package com.viettritutor.modules.schedule.repository;

import com.viettritutor.modules.schedule.domain.LearningSchedule;
import com.viettritutor.modules.schedule.domain.LearningScheduleStatus;
import org.springframework.data.jpa.repository.JpaRepository;

public interface LearningScheduleRepository extends JpaRepository<LearningSchedule, Long> {
    boolean existsByStudentIdAndClassGroupIdAndStatus(
            Long studentId, Long classGroupId, LearningScheduleStatus status);
}
