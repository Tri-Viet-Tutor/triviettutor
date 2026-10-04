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
        return repository.save(LearningSchedule.builder()
                .enrollmentId(enrollmentId)
                .studentId(studentId)
                .classGroupId(classGroupId)
                .startDate(startDate)
                .endDate(endDate)
                .status(LearningScheduleStatus.ACTIVE)
                .build());
    }
}
