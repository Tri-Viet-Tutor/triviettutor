package com.viettritutor.service;

import com.viettritutor.repository.SessionRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.PageRequest;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.Clock;
import java.time.LocalDate;
import java.util.List;

@Component
@RequiredArgsConstructor
@Slf4j
public class AttendanceLockJob {
    private final SessionRepository sessions;
    private final AttendanceService attendance;
    private final Clock clock;

    @Scheduled(fixedDelayString = "${app.jobs.attendance-lock-delay-ms:60000}")
    public void run() {
        long afterId = 0;
        List<Long> batch;
        do {
            batch = sessions.findAttendanceLockCandidates(LocalDate.now(clock), afterId, PageRequest.of(0, 200));
            for (Long sessionId : batch) {
                try {
                    attendance.autoLock(sessionId);
                } catch (RuntimeException exception) {
                    log.warn("Could not finalize attendance for session {}: {}", sessionId, exception.getMessage());
                }
                afterId = sessionId;
            }
        } while (batch.size() == 200);
    }
}
