package com.viettritutor.repository;

import com.viettritutor.entity.Session;
import com.viettritutor.enums.SessionStatus;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.data.domain.PageRequest;

import java.time.LocalDate;
import java.time.LocalTime;

import static org.assertj.core.api.Assertions.assertThat;

@DataJpaTest(properties = {
        "spring.flyway.enabled=false",
        "spring.jpa.hibernate.ddl-auto=create-drop"
})
class AttendanceLockCandidatesTest {

    @Autowired
    private SessionRepository sessionRepository;

    @Test
    void onlyReturnsUnprocessedSessionsThatEndedAtLeast24HoursAgo() {
        // Cutoff = now - 24h = 25/10 21:00
        LocalDate cutoffDate = LocalDate.of(2026, 10, 25);
        LocalTime cutoffTime = LocalTime.of(21, 0);
        Long olderDay = save(LocalDate.of(2026, 10, 24), LocalTime.of(22, 0), false).getId();
        Long endedAtCutoff = save(cutoffDate, LocalTime.of(21, 0), false).getId();
        save(cutoffDate, LocalTime.of(21, 30), false);
        save(LocalDate.of(2026, 10, 26), LocalTime.of(10, 0), false);
        save(LocalDate.of(2026, 10, 20), LocalTime.of(10, 0), true);

        var candidates = sessionRepository.findAttendanceLockCandidates(cutoffDate, cutoffTime, 0L, PageRequest.of(0, 200));

        assertThat(candidates).containsExactly(olderDay, endedAtCutoff);
        assertThat(sessionRepository.findAttendanceLockCandidates(cutoffDate, cutoffTime, olderDay, PageRequest.of(0, 200)))
                .containsExactly(endedAtCutoff);
    }

    private Session save(LocalDate date, LocalTime end, boolean processed) {
        return sessionRepository.save(Session.builder()
                .classGroupId(1L)
                .sessionNumber(1)
                .sessionDate(date)
                .startTime(end.minusHours(2))
                .endTime(end)
                .status(SessionStatus.IN_SESSION)
                .attendanceAutoProcessed(processed)
                .build());
    }
}
