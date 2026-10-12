package com.viettritutor.service;

import com.viettritutor.dto.assignment.ScheduleConflictResponse;
import com.viettritutor.entity.Session;

import java.util.List;
import java.util.Set;

public interface ConflictValidationService {
    List<ScheduleConflictResponse> checkTutor(Long tutorId, List<Session> requested);
    List<ScheduleConflictResponse> checkTutor(Long tutorId, List<Session> requested, Set<Long> excludedSessionIds);
    void assertTutorAvailable(Long tutorId, List<Session> requested);
    void assertTutorAvailable(Long tutorId, List<Session> requested, Set<Long> excludedSessionIds);
    List<ScheduleConflictResponse> checkStudent(Long studentId, List<Session> requested);
    List<ScheduleConflictResponse> checkStudent(Long studentId, List<Session> requested, Set<Long> excludedSessionIds);
}
