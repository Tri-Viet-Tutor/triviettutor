package com.viettritutor.service;

import com.viettritutor.common.exception.ErrorCode;
import com.viettritutor.common.exception.ScheduleConflictException;
import com.viettritutor.dto.assignment.ScheduleConflictResponse;
import com.viettritutor.entity.Session;
import com.viettritutor.enums.SessionStatus;
import com.viettritutor.repository.SessionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;
import java.util.Objects;
import java.util.stream.Stream;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ConflictValidationService {
    private final SessionRepository sessionRepository;

    public List<ScheduleConflictResponse> checkTutor(Long tutorId, List<Session> requested) {
        if (requested.isEmpty()) {
            return List.of();
        }
        LocalDate from = requested.stream().map(Session::getSessionDate).min(LocalDate::compareTo).orElseThrow();
        LocalDate to = requested.stream().map(Session::getSessionDate).max(LocalDate::compareTo).orElseThrow();
        List<Session> commitments = sessionRepository.findTutorCommitments(tutorId, from, to);
        return findConflicts(requested, Stream.concat(commitments.stream(), requested.stream()).distinct().toList());
    }

    public void assertTutorAvailable(Long tutorId, List<Session> requested) {
        var conflicts = checkTutor(tutorId, requested);
        if (!conflicts.isEmpty()) {
            throw new ScheduleConflictException(ErrorCode.SCHEDULE_CONFLICT, conflicts);
        }
    }

    public List<ScheduleConflictResponse> checkStudent(Long studentId, List<Session> requested) {
        if (requested.isEmpty()) {
            return List.of();
        }
        LocalDate from = requested.stream().map(Session::getSessionDate).min(LocalDate::compareTo).orElseThrow();
        LocalDate to = requested.stream().map(Session::getSessionDate).max(LocalDate::compareTo).orElseThrow();
        return findConflicts(requested, sessionRepository.findVisibleSessions(
                studentId, "ROLE_STUDENT", from, to, null, null));
    }

    private List<ScheduleConflictResponse> findConflicts(List<Session> requested, List<Session> existing) {
        return requested.stream()
                .filter(candidate -> candidate.getStatus() != SessionStatus.CANCELLED)
                .flatMap(candidate -> existing.stream()
                        .filter(conflict -> conflict.getStatus() != SessionStatus.CANCELLED)
                        .filter(conflict -> candidate != conflict
                                && (candidate.getId() == null || !Objects.equals(candidate.getId(), conflict.getId())))
                        .filter(conflict -> candidate.getSessionDate().equals(conflict.getSessionDate()))
                        .filter(conflict -> TimeOverlap.isOverlapping(candidate.getStartTime(), candidate.getEndTime(),
                                conflict.getStartTime(), conflict.getEndTime()))
                        .map(conflict -> ScheduleConflictResponse.from(candidate, conflict)))
                .toList();
    }
}
