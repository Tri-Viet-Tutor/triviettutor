package com.viettritutor.service.impl;

import com.viettritutor.common.exception.BusinessException;
import com.viettritutor.common.exception.ErrorCode;
import com.viettritutor.common.exception.ScheduleConflictException;
import com.viettritutor.entity.LearningSchedule;
import com.viettritutor.enums.LearningScheduleStatus;
import com.viettritutor.enums.SessionStatus;
import com.viettritutor.repository.ClassGroupRepository;
import com.viettritutor.repository.LearningScheduleRepository;
import com.viettritutor.repository.SessionRepository;
import com.viettritutor.repository.UserRepository;
import com.viettritutor.service.ConflictValidationService;
import com.viettritutor.service.LearningScheduleService;
import jakarta.persistence.EntityManager;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;

@Service
@RequiredArgsConstructor
public class LearningScheduleServiceImpl implements LearningScheduleService {

    private final LearningScheduleRepository repository;
    private final ClassGroupRepository classRepository;
    private final UserRepository userRepository;
    private final SessionRepository sessionRepository;
    private final ConflictValidationService conflictService;
    private final EntityManager entityManager;

    @Override
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
        lockEnrollmentResources(classGroupId, studentId);
        LocalDate requestedStart = startDate;
        LocalDate requestedEnd = endDate;
        var sessions = sessionRepository.findByClassGroupIdOrderBySessionNumberAsc(classGroupId).stream()
                .filter(session -> session.getStatus() != SessionStatus.CANCELLED)
                .filter(session -> {
                    LocalDate date = session.getOriginalSession() == null ? session.getSessionDate()
                            : session.getOriginalSession().getSessionDate();
                    return !date.isBefore(requestedStart) && !date.isAfter(requestedEnd);
                }).toList();
        var conflicts = conflictService.checkStudent(studentId, sessions);
        if (!conflicts.isEmpty()) {
            throw new ScheduleConflictException(ErrorCode.STUDENT_SCHEDULE_CONFLICT, conflicts);
        }
        for (var session : sessions) {
            if (session.getSessionDate().isBefore(startDate)) startDate = session.getSessionDate();
            if (session.getSessionDate().isAfter(endDate)) endDate = session.getSessionDate();
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

    @Override
    @Transactional
    public LearningSchedule deactivate(Long enrollmentId, LearningScheduleStatus status) {
        if (status == LearningScheduleStatus.ACTIVE) {
            throw new IllegalArgumentException("Use activate to set an active learning schedule");
        }
        LearningSchedule schedule = repository.findByEnrollmentId(enrollmentId)
                .orElseThrow(() -> new IllegalArgumentException("Learning schedule not found for enrollment"));
        lockEnrollmentResources(schedule.getClassGroupId(), schedule.getStudentId());
        entityManager.refresh(schedule);
        schedule.setStatus(status);
        return repository.save(schedule);
    }

    private void lockEnrollmentResources(Long classGroupId, Long studentId) {
        classRepository.findForUpdate(classGroupId)
                .orElseThrow(() -> new BusinessException(ErrorCode.CLASS_NOT_FOUND));
        var student = userRepository.findForUpdate(studentId)
                .orElseThrow(() -> new BusinessException(ErrorCode.USER_NOT_FOUND));
        if (!"ROLE_STUDENT".equals(student.getRole())) {
            throw new BusinessException(ErrorCode.ACCESS_DENIED);
        }
    }
}
