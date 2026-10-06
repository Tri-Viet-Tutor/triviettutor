package com.viettritutor.modules.schedule.service;

import com.viettritutor.entity.Session;
import com.viettritutor.entity.enums.SessionStatus;
import com.viettritutor.repository.SessionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class SessionLifecycleService {

    private final SessionRepository sessionRepository;
    private final Clock clock;
    private final Optional<ClassLifecycle> classLifecycle;
    private final ApplicationEventPublisher eventPublisher;

    /**
     * Retry-safe transition into IN_SESSION. Time passing never completes a
     * session; attendance finalization owns the COMPLETED transition.
     */
    @Transactional
    public int advanceEligibleSessions() {
        LocalDateTime now = LocalDateTime.now(clock);
        List<Session> candidates = sessionRepository.findByStatusAndSessionDateLessThanEqual(
                SessionStatus.SCHEDULED, now.toLocalDate());
        List<Session> eligible = candidates.stream()
                .filter(session -> !LocalDateTime.of(session.getSessionDate(), session.getStartTime()).isAfter(now))
                .peek(session -> session.setStatus(SessionStatus.IN_SESSION))
                .toList();
        if (!eligible.isEmpty()) {
            sessionRepository.saveAll(eligible);
        }
        return eligible.size();
    }

    @Transactional
    public boolean evaluateClassCompletion(Long classGroupId) {
        List<Session> sessions = sessionRepository.findByClassGroupIdOrderBySessionNumberAsc(classGroupId);
        List<Session> originals = sessions.stream()
                .filter(session -> session.getOriginalSession() == null)
                .toList();
        if (originals.isEmpty()) {
            return false;
        }

        Map<Long, Session> makeupByOriginalId = sessions.stream()
                .filter(session -> session.getOriginalSession() != null)
                .collect(Collectors.toMap(
                        session -> session.getOriginalSession().getId(),
                        Function.identity(),
                        (first, second) -> first));

        boolean completed = originals.stream().allMatch(original -> obligationCompleted(
                original, makeupByOriginalId.get(original.getId())));
        if (completed) {
            notifyClassCompleted(classGroupId);
        }
        return completed;
    }

    @Transactional
    public int evaluateAllClasses() {
        int completed = 0;
        for (Long classGroupId : sessionRepository.findDistinctClassGroupIds()) {
            if (evaluateClassCompletion(classGroupId)) {
                completed++;
            }
        }
        return completed;
    }

    private boolean obligationCompleted(Session original, Session makeup) {
        if (original.getStatus() == SessionStatus.COMPLETED) {
            return true;
        }
        return original.getStatus() == SessionStatus.CANCELLED
                && makeup != null
                && makeup.getStatus() == SessionStatus.COMPLETED;
    }

    private void notifyClassCompleted(Long classGroupId) {
        classLifecycle.ifPresentOrElse(
                lifecycle -> lifecycle.markCompleted(classGroupId),
                () -> eventPublisher.publishEvent(new ClassTeachingCompletedEvent(classGroupId)));
    }
}
