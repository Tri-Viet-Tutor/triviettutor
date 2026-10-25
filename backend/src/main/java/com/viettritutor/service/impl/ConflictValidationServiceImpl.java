package com.viettritutor.service.impl;

import com.viettritutor.common.exception.ErrorCode;
import com.viettritutor.common.exception.ScheduleConflictException;
import com.viettritutor.dto.assignment.ScheduleConflictResponse;
import com.viettritutor.entity.Session;
import com.viettritutor.enums.SessionStatus;
import com.viettritutor.repository.SessionRepository;
import com.viettritutor.service.ConflictValidationService;
import com.viettritutor.service.TimeOverlap;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;
import java.util.Objects;
import java.util.Set;
import java.util.stream.Stream;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ConflictValidationServiceImpl implements ConflictValidationService {
    private final SessionRepository sessionRepository;

    @Override
    public List<ScheduleConflictResponse> checkTutor(Long tutorId, List<Session> requested) {
        return checkTutor(tutorId, requested, Set.of());
    }

    @Override
    public List<ScheduleConflictResponse> checkTutor(Long tutorId, List<Session> requested, Set<Long> excludedSessionIds) {
        if (requested == null || requested.isEmpty()) {
            return List.of();
        }
        Set<Long> safeExcluded = excludedSessionIds != null ? excludedSessionIds : Set.of();
        LocalDate from = requested.stream().map(Session::getSessionDate).filter(Objects::nonNull).min(LocalDate::compareTo).orElse(null);
        LocalDate to = requested.stream().map(Session::getSessionDate).filter(Objects::nonNull).max(LocalDate::compareTo).orElse(null);
        if (from == null || to == null) {
            return List.of();
        }
        List<Session> commitments = sessionRepository.findTutorCommitments(tutorId, from, to).stream()
                .filter(session -> !safeExcluded.contains(session.getId())).toList();
        return findConflicts(requested, Stream.concat(commitments.stream(), requested.stream()).distinct().toList());
    }

    @Override
    public void assertTutorAvailable(Long tutorId, List<Session> requested) {
        assertTutorAvailable(tutorId, requested, Set.of());
    }

    @Override
    public void assertTutorAvailable(Long tutorId, List<Session> requested, Set<Long> excludedSessionIds) {
        var conflicts = checkTutor(tutorId, requested, excludedSessionIds);
        if (!conflicts.isEmpty()) {
            throw new ScheduleConflictException(ErrorCode.SCHEDULE_CONFLICT, conflicts);
        }
    }

    @Override
    public List<ScheduleConflictResponse> checkStudent(Long studentId, List<Session> requested) {
        return checkStudent(studentId, requested, Set.of());
    }

    @Override
    public List<ScheduleConflictResponse> checkStudent(Long studentId, List<Session> requested, Set<Long> excludedSessionIds) {
        if (requested == null || requested.isEmpty()) {
            return List.of();
        }
        Set<Long> safeExcluded = excludedSessionIds != null ? excludedSessionIds : Set.of();
        LocalDate from = requested.stream().map(Session::getSessionDate).filter(Objects::nonNull).min(LocalDate::compareTo).orElse(null);
        LocalDate to = requested.stream().map(Session::getSessionDate).filter(Objects::nonNull).max(LocalDate::compareTo).orElse(null);
        if (from == null || to == null) {
            return List.of();
        }
        return findConflicts(requested, sessionRepository.findStudentCommitments(studentId, from, to).stream()
                .filter(session -> !safeExcluded.contains(session.getId())).toList());
    }

    private List<ScheduleConflictResponse> findConflicts(List<Session> requested, List<Session> existing) {
        return requested.stream()
                .filter(Objects::nonNull)
                .filter(candidate -> candidate.getStatus() != SessionStatus.CANCELLED)
                .filter(candidate -> candidate.getSessionDate() != null && candidate.getStartTime() != null && candidate.getEndTime() != null)
                .flatMap(candidate -> existing.stream()
                        .filter(Objects::nonNull)
                        .filter(conflict -> conflict.getStatus() != SessionStatus.CANCELLED)
                        .filter(conflict -> conflict.getSessionDate() != null && conflict.getStartTime() != null && conflict.getEndTime() != null)
                        .filter(conflict -> candidate != conflict
                                && (candidate.getId() == null || !Objects.equals(candidate.getId(), conflict.getId())))
                        .filter(conflict -> candidate.getSessionDate().equals(conflict.getSessionDate()))
                        .filter(conflict -> TimeOverlap.isOverlapping(candidate.getStartTime(), candidate.getEndTime(),
                                conflict.getStartTime(), conflict.getEndTime()))
                        .map(conflict -> ScheduleConflictResponse.from(candidate, conflict)))
                .distinct()
                .toList();
    }
}
