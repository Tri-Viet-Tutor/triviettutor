package com.viettritutor.service;
import com.viettritutor.scheduler.MeetingAttendanceJob;

import com.viettritutor.document.MeetingParticipantLog;
import com.viettritutor.document.MeetingParticipantLog.ParticipantEvent;
import com.viettritutor.entity.Session;
import com.viettritutor.enums.SessionStatus;
import com.viettritutor.repository.SessionRepository;
import com.viettritutor.repository.mongo.MeetingParticipantLogRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.*;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class MeetingAttendanceTest {
    /** 19:00 on 05/11/2026 in Vietnam; the session runs 18:00-19:30 that day. */
    private static final ZoneId VN = ZoneId.of("Asia/Ho_Chi_Minh");
    private static final Clock CLOCK = Clock.fixed(Instant.parse("2026-11-05T12:00:00Z"), VN);

    private static Instant at(int hour, int minute) {
        return LocalDateTime.of(2026, 11, 5, hour, minute).atZone(VN).toInstant();
    }

    private static Session session(long id, LocalDate date, int startHour, int endHour, SessionStatus status) {
        return Session.builder().id(id).classGroupId(7L).sessionNumber(1).sessionDate(date)
                .startTime(LocalTime.of(startHour, 0)).endTime(LocalTime.of(endHour, 30)).status(status).build();
    }

    private static MeetingParticipantLog log(String identity, Object... joinLeave) {
        List<ParticipantEvent> events = new ArrayList<>();
        for (int i = 0; i < joinLeave.length; i += 2)
            events.add(ParticipantEvent.builder().event((String) joinLeave[i]).timestamp((Instant) joinLeave[i + 1]).build());
        return MeetingParticipantLog.builder().participantIdentity(identity).eventHistory(events).build();
    }

    @Nested
    @ExtendWith(MockitoExtension.class)
    class Presence {
        @Mock MeetingParticipantLogRepository logs;

        @Test
        @DisplayName("Adds up every stay, clips to the session time and counts an open stay up to now")
        void sumsStaysAndClips() {
            MeetingParticipantLog rejoined = log("21", "JOINED", at(17, 50), "LEFT", at(18, 10), "JOINED", at(18, 20), "LEFT", at(18, 25));
            MeetingParticipantLog stillIn = log("22", "JOINED", at(18, 40));
            MeetingParticipantLog classRoom = log("21", "JOINED", at(18, 30), "LEFT", at(18, 35));
            MeetingParticipantLog notAUser = log("guest-x", "JOINED", at(18, 0), "LEFT", at(19, 0));
            when(logs.findBySessionId("classroom-session-5")).thenReturn(List.of(rejoined, stillIn, notAUser));
            when(logs.findBySessionId("classroom-class-7")).thenReturn(List.of(classRoom));

            Map<Long, Integer> minutes = new MeetingPresenceService(logs, CLOCK)
                    .minutesInClass(session(5, LocalDate.of(2026, 11, 5), 18, 19, SessionStatus.IN_SESSION));

            // 18:00-18:10 (before start ignored) + 18:20-18:25 + class room 18:30-18:35 = 20 min
            assertThat(minutes).containsEntry(21L, 20).containsEntry(22L, 20).doesNotContainKey(null).hasSize(2);
        }

        @Test
        @DisplayName("Old logs without event history still count their last stay")
        void fallsBackToJoinedLeft() {
            MeetingParticipantLog old = MeetingParticipantLog.builder().participantIdentity("23")
                    .joinedAt(at(18, 5)).leftAt(at(18, 25)).build();
            assertThat(MeetingPresenceService.overlapSeconds(old, at(18, 0), at(19, 30), at(19, 0))).isEqualTo(20 * 60);
        }
    }

    @Nested
    @ExtendWith(MockitoExtension.class)
    class Job {
        @Mock SessionRepository sessions;
        @Mock AttendanceService attendance;
        @Mock MeetingPresenceService presence;
        @Mock AppSettingService settings;

        private MeetingAttendanceJob job() {
            return new MeetingAttendanceJob(sessions, attendance, presence, settings, CLOCK);
        }

        @Test
        @DisplayName("A threshold of 0 turns the job off")
        void disabled() {
            when(settings.autoPresentMinutes()).thenReturn(0);
            assertThat(job().run()).isZero();
            verifyNoInteractions(sessions, attendance, presence);
        }

        @Test
        @DisplayName("Only started, unlocked, open sessions inside the attendance window are processed")
        void picksEligibleSessions() {
            LocalDate today = LocalDate.of(2026, 11, 5);
            Session running = session(1, today, 18, 19, SessionStatus.IN_SESSION);
            Session notYet = session(2, today, 19, 20, SessionStatus.SCHEDULED);       // starts 19:00, threshold not reached
            Session cancelled = session(3, today, 17, 18, SessionStatus.CANCELLED);
            Session locked = session(4, today, 8, 9, SessionStatus.COMPLETED);
            locked.setAttendanceLocked(true);
            Session tooOld = session(5, today.minusDays(1), 8, 9, SessionStatus.COMPLETED); // ended > 24h ago
            Session yesterdayEvening = session(6, today.minusDays(1), 20, 21, SessionStatus.COMPLETED);
            when(settings.autoPresentMinutes()).thenReturn(15);
            when(sessions.findBySessionDateBetweenOrderBySessionDateAscStartTimeAscIdAsc(today.minusDays(1), today))
                    .thenReturn(List.of(running, notYet, cancelled, locked, tooOld, yesterdayEvening));
            when(presence.minutesInClass(running)).thenReturn(Map.of(21L, 30, 22L, 5));
            when(presence.minutesInClass(yesterdayEvening)).thenReturn(Map.of(21L, 3));
            when(attendance.autoMarkPresent(eq(1L), anyMap(), eq(15))).thenReturn(1);

            assertThat(job().run()).isEqualTo(1);
            verify(presence).minutesInClass(running);
            verify(presence).minutesInClass(yesterdayEvening);
            verify(presence, times(2)).minutesInClass(any());
            // Nobody reached 15 minutes in session 6, so it is not touched.
            verify(attendance, never()).autoMarkPresent(eq(6L), anyMap(), anyInt());
        }

        @Test
        @DisplayName("A failing session (for example MongoDB down) does not stop the others")
        void isolatesFailures() {
            LocalDate today = LocalDate.of(2026, 11, 5);
            Session broken = session(1, today, 18, 19, SessionStatus.IN_SESSION);
            Session fine = session(2, today, 17, 18, SessionStatus.COMPLETED);
            when(settings.autoPresentMinutes()).thenReturn(15);
            when(sessions.findBySessionDateBetweenOrderBySessionDateAscStartTimeAscIdAsc(any(), any())).thenReturn(List.of(broken, fine));
            when(presence.minutesInClass(broken)).thenThrow(new IllegalStateException("mongo down"));
            when(presence.minutesInClass(fine)).thenReturn(Map.of(30L, 60));
            when(attendance.autoMarkPresent(eq(2L), anyMap(), eq(15))).thenReturn(1);

            assertThat(job().run()).isEqualTo(1);
        }
    }
}
