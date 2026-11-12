package com.viettritutor.service.impl;

import com.viettritutor.common.exception.BusinessException;
import com.viettritutor.common.exception.ErrorCode;
import com.viettritutor.entity.Session;
import com.viettritutor.enums.SessionStatus;
import com.viettritutor.repository.SessionGenerationLockRepository;
import com.viettritutor.repository.SessionRepository;
import com.viettritutor.service.SessionDateCalculator;
import com.viettritutor.service.SessionGenerationSpec;
import com.viettritutor.service.SessionGenerator;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.*;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class DefaultSessionGenerator implements SessionGenerator {

    private final SessionRepository sessionRepository;
    private final SessionGenerationLockRepository generationLockRepository;
    private final SessionDateCalculator dateCalculator;
    private final Optional<com.viettritutor.service.PayrollGuard> payrollGuard;

    @Override
    @Transactional
    public List<Session> ensureGenerated(SessionGenerationSpec spec) {
        lockClassGeneration(spec.classGroupId());
        List<LocalDate> expectedDates = dateCalculator.calculate(
                spec.startDate(), spec.pattern(), spec.totalSessions());
        payrollGuard.ifPresent(guard -> guard.prepareSessionGeneration(expectedDates));
        List<Session> existing = sessionRepository.findOriginalSessionsForUpdate(spec.classGroupId());

        Map<Integer, Session> byNumber = existing.stream().collect(Collectors.toMap(
                Session::getSessionNumber,
                Function.identity(),
                (left, right) -> {
                    throw new BusinessException(ErrorCode.SESSION_CONFIG_MISMATCH,
                            "Duplicate original session number " + left.getSessionNumber());
                },
                TreeMap::new));

        if (byNumber.keySet().stream().anyMatch(number -> number < 1 || number > spec.totalSessions())) {
            throw mismatch("Existing session count exceeds the requested class configuration");
        }

        List<Session> missing = new ArrayList<>();
        for (int index = 0; index < expectedDates.size(); index++) {
            int sessionNumber = index + 1;
            LocalDate expectedDate = expectedDates.get(index);
            Session saved = byNumber.get(sessionNumber);
            if (saved != null) {
                verifyMatches(saved, expectedDate, spec);
                continue;
            }
            payrollGuard.ifPresent(guard -> guard.assertDateEditable(expectedDate));
            missing.add(Session.builder()
                    .classGroupId(spec.classGroupId())
                    .sessionNumber(sessionNumber)
                    .sessionDate(expectedDate)
                    .startTime(spec.timeSlot().getStartTime())
                    .endTime(spec.timeSlot().endTime(spec.durationMinutes()))
                    .status(SessionStatus.SCHEDULED)
                    .meetingUrl(normalizeNullable(spec.meetingUrl()))
                    .build());
        }

        if (!missing.isEmpty()) {
            sessionRepository.saveAll(missing).forEach(session -> byNumber.put(session.getSessionNumber(), session));
        }
        return List.copyOf(byNumber.values());
    }

    private void lockClassGeneration(Long classGroupId) {
        generationLockRepository.insertIfAbsent(classGroupId);
        generationLockRepository.findForUpdate(classGroupId)
                .orElseThrow(() -> new IllegalStateException("Could not acquire session generation lock"));
    }

    private void verifyMatches(Session existing, LocalDate expectedDate, SessionGenerationSpec spec) {
        if (!expectedDate.equals(existing.getSessionDate())
                || !spec.timeSlot().getStartTime().equals(existing.getStartTime())
                || !spec.timeSlot().endTime(spec.durationMinutes()).equals(existing.getEndTime())) {
            throw mismatch("Session " + existing.getSessionNumber() + " does not match the requested pattern/slot");
        }
    }

    private BusinessException mismatch(String message) {
        return new BusinessException(ErrorCode.SESSION_CONFIG_MISMATCH, message);
    }

    private String normalizeNullable(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }
}
