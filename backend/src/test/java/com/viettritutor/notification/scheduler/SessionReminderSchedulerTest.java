package com.viettritutor.notification.scheduler;

import com.viettritutor.entity.ClassGroup;
import com.viettritutor.entity.Enrollment;
import com.viettritutor.entity.Session;
import com.viettritutor.entity.User;
import com.viettritutor.enums.EnrollmentStatus;
import com.viettritutor.enums.SessionStatus;
import com.viettritutor.notification.event.SessionReminderEvent;
import com.viettritutor.repository.ClassGroupRepository;
import com.viettritutor.repository.EnrollmentRepository;
import com.viettritutor.repository.SessionRepository;
import com.viettritutor.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.context.ApplicationEventPublisher;

import java.time.*;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class SessionReminderSchedulerTest {

    private static final Clock FIXED_CLOCK = Clock.fixed(
            Instant.parse("2026-11-12T07:00:00Z"),
            ZoneId.of("Asia/Ho_Chi_Minh") // 14:00 giờ Việt Nam
    );

    @Mock private SessionRepository sessions;
    @Mock private EnrollmentRepository enrollments;
    @Mock private ClassGroupRepository classGroups;
    @Mock private UserRepository users;
    @Mock private ApplicationEventPublisher eventPublisher;

    private SessionReminderScheduler scheduler;

    @BeforeEach
    void setUp() {
        scheduler = new SessionReminderScheduler(
                sessions,
                enrollments,
                classGroups,
                users,
                eventPublisher,
                FIXED_CLOCK
        );
    }

    @Test
    @DisplayName("Quét và phát tán sự kiện nhắc nhở buổi học trước 60 phút, đồng thời cập nhật reminderSentAt")
    void scanAndSendReminders_findsSession_publishesEventAndUpdatesSession() {
        LocalDate today = LocalDate.now(FIXED_CLOCK);
        Session session = Session.builder()
                .id(101L)
                .classGroupId(10L)
                .sessionDate(today)
                .startTime(LocalTime.of(15, 0)) // 60 phút sau 14:00
                .endTime(LocalTime.of(17, 0))
                .status(SessionStatus.SCHEDULED)
                .scheduledTutorId(5L)
                .meetingUrl("https://meet.viettritutor.local/room101")
                .build();

        when(sessions.findUpcomingSessionsForReminder(eq(today), any(LocalTime.class), any(LocalTime.class)))
                .thenReturn(List.of(session));

        when(classGroups.findById(10L)).thenReturn(Optional.of(
                ClassGroup.builder().id(10L).classCode("TOAN12-NAM").build()
        ));

        User tutor = User.builder().id(5L).fullName("Nguyen Van Nam").email("nam.tutor@test.com").build();
        when(users.findById(5L)).thenReturn(Optional.of(tutor));

        Enrollment en1 = Enrollment.builder().id(1L).studentId(50L).status(EnrollmentStatus.ACTIVE).build();
        Enrollment en2 = Enrollment.builder().id(2L).studentId(51L).status(EnrollmentStatus.ACTIVE).build();
        when(enrollments.findByClassGroupIdAndStatusOrderByStudentId(10L, EnrollmentStatus.ACTIVE))
                .thenReturn(List.of(en1, en2));

        User st1 = User.builder().id(50L).fullName("Hoc Vien 1").email("student1@test.com").build();
        User st2 = User.builder().id(51L).fullName("Hoc Vien 2").email("student2@test.com").build();
        when(users.findAllById(List.of(50L, 51L))).thenReturn(List.of(st1, st2));

        scheduler.scanAndSendReminders();

        ArgumentCaptor<SessionReminderEvent> eventCaptor = ArgumentCaptor.forClass(SessionReminderEvent.class);
        verify(eventPublisher).publishEvent(eventCaptor.capture());

        SessionReminderEvent captured = eventCaptor.getValue();
        assertThat(captured.sessionId()).isEqualTo(101L);
        assertThat(captured.className()).isEqualTo("TOAN12-NAM");
        assertThat(captured.tutorEmail()).isEqualTo("nam.tutor@test.com");
        assertThat(captured.studentEmails()).containsExactlyInAnyOrder("student1@test.com", "student2@test.com");

        verify(sessions).save(session);
        assertThat(session.getReminderSentAt()).isNotNull();
    }

    @Test
    @DisplayName("Không có buổi học nào cần nhắc nhở thì không phát tán event")
    void scanAndSendReminders_noSessions_doesNothing() {
        LocalDate today = LocalDate.now(FIXED_CLOCK);
        when(sessions.findUpcomingSessionsForReminder(eq(today), any(LocalTime.class), any(LocalTime.class)))
                .thenReturn(List.of());

        scheduler.scanAndSendReminders();

        verifyNoInteractions(eventPublisher);
        verify(sessions, never()).save(any());
    }
}
