package com.viettritutor.service;

import com.viettritutor.entity.LearningSchedule;
import com.viettritutor.enums.LearningScheduleStatus;

import java.time.LocalDate;

public interface LearningScheduleService {
    LearningSchedule activate(Long enrollmentId, Long studentId, Long classGroupId, LocalDate startDate, LocalDate endDate);
    LearningSchedule deactivate(Long enrollmentId, LearningScheduleStatus status);
}
