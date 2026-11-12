package com.viettritutor.scheduler;
import com.viettritutor.service.*;

import com.viettritutor.entity.Session;
import com.viettritutor.enums.SessionStatus;
import com.viettritutor.repository.SessionRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.*;
import java.util.Map;
import java.util.Set;

/**
 * ATT-01: every minute, marks PRESENT the students who stayed long enough in the online classroom of a session
 * that has started and is still within its attendance window (end + 24h). The threshold is admin-editable;
 * 0 turns the job off. Failures for one session (for example MongoDB being down) never stop the others.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class MeetingAttendanceJob {
    private static final Set<SessionStatus> OPEN = Set.of(SessionStatus.SCHEDULED, SessionStatus.IN_SESSION, SessionStatus.COMPLETED);

    private final SessionRepository sessions;
    private final AttendanceService attendance;
    private final MeetingPresenceService presence;
    private final AppSettingService settings;
    private final Clock clock;

    @Scheduled(initialDelayString = "${app.jobs.meeting-attendance-initial-delay-ms:60000}",
            fixedDelayString = "${app.jobs.meeting-attendance-delay-ms:60000}")
    public int run() {
        int threshold=settings.autoPresentMinutes();
        if(threshold<1) return 0;
        ZoneId zone=clock.getZone();
        LocalDateTime now=LocalDateTime.now(clock);
        int marked=0;
        for(Session session:sessions.findBySessionDateBetweenOrderBySessionDateAscStartTimeAscIdAsc(now.toLocalDate().minusDays(1),now.toLocalDate())) {
            LocalDateTime start=LocalDateTime.of(session.getSessionDate(),session.getStartTime());
            LocalDateTime end=LocalDateTime.of(session.getSessionDate(),session.getEndTime());
            if(!OPEN.contains(session.getStatus()) || session.isAttendanceLocked() || now.isBefore(start.plusMinutes(threshold))
                    || !now.isBefore(end.plusHours(24))) continue;
            try {
                Map<Long,Integer> minutes=presence.minutesInClass(session);
                if(minutes.values().stream().anyMatch(m -> m>=threshold))
                    marked+=attendance.autoMarkPresent(session.getId(),minutes,threshold);
            } catch(RuntimeException ex) {
                log.warn("Auto attendance skipped for session {}: {}",session.getId(),ex.getMessage());
            }
        }
        if(marked>0) log.info("MeetingAttendanceJob: marked {} student(s) PRESENT from classroom presence (threshold {} min, zone {})",marked,threshold,zone);
        return marked;
    }
}
