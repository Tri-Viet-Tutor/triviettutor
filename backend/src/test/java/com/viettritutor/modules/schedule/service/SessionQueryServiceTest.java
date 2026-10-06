package com.viettritutor.modules.schedule.service;

import com.viettritutor.common.exception.BusinessException;
import com.viettritutor.common.exception.ErrorCode;
import com.viettritutor.entity.enums.LearningScheduleStatus;
import com.viettritutor.entity.Session;
import com.viettritutor.entity.enums.SessionStatus;
import com.viettritutor.repository.LearningScheduleRepository;
import com.viettritutor.repository.SessionRepository;
import com.viettritutor.entity.User;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class SessionQueryServiceTest {

    @Mock
    private SessionRepository sessionRepository;
    @Mock
    private LearningScheduleRepository learningScheduleRepository;

    private SessionQueryService service;

    @BeforeEach
    void setUp() {
        service = new SessionQueryService(sessionRepository, learningScheduleRepository);
    }

    @Test
    void substituteTutorCanViewTheSession() {
        Session session = session();
        session.setScheduledTutorId(20L);
        session.setActualTutorId(21L);
        when(sessionRepository.findById(100L)).thenReturn(Optional.of(session));

        var response = service.getVisibleSession(100L, user(21L, "ROLE_TUTOR"));

        assertThat(response.actualTutorId()).isEqualTo(21L);
        verifyNoInteractions(learningScheduleRepository);
    }

    @Test
    void activePaidEnrollmentProjectionAllowsStudentAccess() {
        Session session = session();
        when(sessionRepository.findById(100L)).thenReturn(Optional.of(session));
        when(learningScheduleRepository
                .existsByStudentIdAndClassGroupIdAndStatusAndStartDateLessThanEqualAndEndDateGreaterThanEqual(
                        30L, 10L, LearningScheduleStatus.ACTIVE,
                        session.getSessionDate(), session.getSessionDate()))
                .thenReturn(true);

        var response = service.getVisibleSession(100L, user(30L, "ROLE_STUDENT"));

        assertThat(response.sessionId()).isEqualTo(100L);
    }

    @Test
    void studentWithoutActiveEnrollmentProjectionIsDenied() {
        Session session = session();
        when(sessionRepository.findById(100L)).thenReturn(Optional.of(session));

        assertThatThrownBy(() -> service.getVisibleSession(100L, user(30L, "ROLE_STUDENT")))
                .isInstanceOf(BusinessException.class)
                .satisfies(error -> assertThat(((BusinessException) error).getErrorCode())
                        .isEqualTo(ErrorCode.ACCESS_DENIED));
    }

    @Test
    void getMySessionsDelegatesRoleAwareVisibilityToRepository() {
        Session session = session();
        LocalDate from = LocalDate.of(2026, 10, 1);
        LocalDate to = LocalDate.of(2026, 10, 31);
        when(sessionRepository.findVisibleSessions(
                21L, "ROLE_TUTOR", from, to, SessionStatus.SCHEDULED, 10L))
                .thenReturn(List.of(session));

        var result = service.getMySessions(
                user(21L, "ROLE_TUTOR"), from, to, SessionStatus.SCHEDULED, 10L);

        assertThat(result).singleElement().satisfies(item ->
                assertThat(item.sessionId()).isEqualTo(100L));
    }

    @Test
    void rejectsReversedDateRange() {
        assertThatThrownBy(() -> service.getMySessions(
                user(21L, "ROLE_TUTOR"),
                LocalDate.of(2026, 11, 1),
                LocalDate.of(2026, 10, 1),
                null,
                null))
                .isInstanceOf(BusinessException.class)
                .satisfies(error -> assertThat(((BusinessException) error).getErrorCode())
                        .isEqualTo(ErrorCode.INVALID_DATE_RANGE));
        verifyNoInteractions(sessionRepository);
    }

    @Test
    void adminCanUpdateAValidHttpsMeetingUrl() {
        Session session = session();
        when(sessionRepository.findById(100L)).thenReturn(Optional.of(session));
        when(sessionRepository.save(session)).thenReturn(session);

        var response = service.updateMeetingUrl(100L, "  https://meet.example.com/room-1  ");

        assertThat(response.meetingUrl()).isEqualTo("https://meet.example.com/room-1");
    }

    @Test
    void rejectsUnsafeMeetingUrlSchemes() {
        when(sessionRepository.findById(100L)).thenReturn(Optional.of(session()));

        assertThatThrownBy(() -> service.updateMeetingUrl(100L, "javascript:alert(1)"))
                .isInstanceOf(BusinessException.class)
                .satisfies(error -> assertThat(((BusinessException) error).getErrorCode())
                        .isEqualTo(ErrorCode.INVALID_MEETING_URL));
        verify(sessionRepository, never()).save(any());
    }

    private Session session() {
        return Session.builder()
                .id(100L)
                .classGroupId(10L)
                .sessionNumber(1)
                .sessionDate(LocalDate.of(2026, 10, 5))
                .startTime(LocalTime.of(8, 0))
                .endTime(LocalTime.of(10, 0))
                .status(SessionStatus.SCHEDULED)
                .build();
    }

    private User user(Long id, String role) {
        return User.builder().id(id).email(id + "@example.com").password("x").fullName("User").role(role).build();
    }
}
