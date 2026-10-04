package com.viettritutor.modules.schedule.service;

import com.viettritutor.modules.schedule.domain.LearningSchedule;
import com.viettritutor.modules.schedule.domain.LearningScheduleStatus;
import com.viettritutor.modules.schedule.repository.LearningScheduleRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;

/**
 * Integration boundary called by the enrollment transaction only after payment
 * has produced an ACTIVE enrollment.
 */
@Service
@RequiredArgsConstructor
public class LearningScheduleService {

    private final LearningScheduleRepository repository;

    @Transactional
    public LearningSchedule activate(
            Long enrollmentId,
            Long studentId,
            Long classGroupId,
            LocalDate startDate,
            LocalDate endDate) {
        if (startDate.isAfter(endDate)) {
            throw new IllegalArgumentException("startDate must not be after endDate");
        }
        LearningSchedule schedule = repository.findByEnrollmentId(enrollmentId)
                .orElseGet(() -> LearningSchedule.builder().enrollmentId(enrollmentId).build());
        schedule.setStudentId(studentId);
        schedule.setClassGroupId(classGroupId);
        schedule.setStartDate(startDate);
        schedule.setEndDate(endDate);
        schedule.setStatus(LearningScheduleStatus.ACTIVE);
        return repository.save(schedule);
    }

    /** Called in the same transaction that cancels or deactivates enrollment. */
    @Transactional
    public LearningSchedule deactivate(Long enrollmentId, LearningScheduleStatus status) {
        if (status == LearningScheduleStatus.ACTIVE) {
            throw new IllegalArgumentException("Use activate to set an active learning schedule");
        }
        LearningSchedule schedule = repository.findByEnrollmentId(enrollmentId)
                .orElseThrow(() -> new IllegalArgumentException("Learning schedule not found for enrollment"));
        schedule.setStatus(status);
        return repository.save(schedule);
    }
}
