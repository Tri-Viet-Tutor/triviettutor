package com.viettritutor.service;

import com.viettritutor.common.exception.BusinessException;
import com.viettritutor.common.exception.ErrorCode;
import com.viettritutor.document.MeetingParticipantLog;
import com.viettritutor.document.MeetingSessionLog;
import com.viettritutor.dto.meeting.MeetingSessionLogsResponse;
import com.viettritutor.dto.meeting.MeetingTokenResponse;
import com.viettritutor.entity.ClassGroup;
import com.viettritutor.entity.Course;
import com.viettritutor.entity.Session;
import com.viettritutor.entity.User;
import com.viettritutor.enums.AssignmentStatus;
import com.viettritutor.enums.EnrollmentStatus;
import com.viettritutor.enums.SessionStatus;
import com.viettritutor.repository.*;
import com.viettritutor.repository.mongo.MeetingParticipantLogRepository;
import com.viettritutor.repository.mongo.MeetingSessionLogRepository;
import com.viettritutor.service.impl.MeetingServiceImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class MeetingServiceTest {

    @Mock
    private SessionRepository sessionRepository;

    @Mock
    private ClassGroupRepository classGroupRepository;

    @Mock
    private EnrollmentRepository enrollmentRepository;

    @Mock
    private LearningScheduleRepository learningScheduleRepository;

    @Mock
    private TutorAssignmentRepository tutorAssignmentRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private MeetingSessionLogRepository meetingSessionLogRepository;

    @Mock
    private MeetingParticipantLogRepository meetingParticipantLogRepository;

    @InjectMocks
    private MeetingServiceImpl meetingService;

    private User adminUser;
    private User tutorUser;
    private User studentUser;
    private User outsiderStudent;
    private Session session;
    private ClassGroup classGroup;
    private Course course;

    @BeforeEach
    void setUp() {
        ReflectionTestUtils.setField(meetingService, "livekitUrl", "ws://localhost:7880");
        ReflectionTestUtils.setField(meetingService, "livekitApiKey", "devkey");
        ReflectionTestUtils.setField(meetingService, "livekitApiSecret", "secret123456789012345678901234567890");
        ReflectionTestUtils.setField(meetingService, "meetingSessionLogRepository", meetingSessionLogRepository);
        ReflectionTestUtils.setField(meetingService, "meetingParticipantLogRepository", meetingParticipantLogRepository);

        adminUser = User.builder().id(1L).email("admin@vtt.vn").role("ROLE_ADMIN").fullName("Admin").build();
        tutorUser = User.builder().id(2L).email("tutor@vtt.vn").role("ROLE_TUTOR").fullName("Thầy Hoàng").build();
        studentUser = User.builder().id(3L).email("student@vtt.vn").role("ROLE_STUDENT").fullName("Nguyễn Văn A").build();
        outsiderStudent = User.builder().id(99L).email("outsider@vtt.vn").role("ROLE_STUDENT").fullName("Người Ngoài").build();

        course = Course.builder().id(10L).name("Toán 12 Chuyên Đề Hàm Số").build();
        classGroup = ClassGroup.builder().id(20L).course(course).build();

        session = Session.builder()
                .id(101L)
                .classGroupId(20L)
                .sessionNumber(1)
                .sessionDate(LocalDate.now().plusDays(1))
                .startTime(LocalTime.of(18, 0))
                .endTime(LocalTime.of(20, 0))
                .status(SessionStatus.SCHEDULED)
                .scheduledTutorId(2L)
                .actualTutorId(null)
                .build();
    }

    @Test
    @DisplayName("Assigned tutor successfully generates room token with TUTOR role")
    void tutorCanGenerateToken() {
        when(sessionRepository.findById(101L)).thenReturn(Optional.of(session));
        when(classGroupRepository.findById(20L)).thenReturn(Optional.of(classGroup));
        when(userRepository.findById(2L)).thenReturn(Optional.of(tutorUser));

        MeetingTokenResponse res = meetingService.generateTokenForSession(101L, tutorUser);

        assertNotNull(res);
        assertNotNull(res.token());
        assertEquals("ws://localhost:7880", res.serverUrl());
        assertEquals("classroom-session-101", res.roomName());
        assertEquals("TUTOR", res.role());
        assertEquals(101L, res.sessionId());
        assertEquals(20L, res.classGroupId());
        assertEquals("Toán 12 Chuyên Đề Hàm Số", res.courseTitle());
    }

    @Test
    @DisplayName("Active enrolled student successfully generates room token with STUDENT role")
    void studentCanGenerateToken() {
        when(sessionRepository.findById(101L)).thenReturn(Optional.of(session));
        when(classGroupRepository.findById(20L)).thenReturn(Optional.of(classGroup));
        when(enrollmentRepository.existsByStudentIdAndClassGroupIdAndStatus(3L, 20L, EnrollmentStatus.ACTIVE))
                .thenReturn(true);
        when(userRepository.findById(2L)).thenReturn(Optional.of(tutorUser));

        MeetingTokenResponse res = meetingService.generateTokenForSession(101L, studentUser);

        assertNotNull(res);
        assertEquals("STUDENT", res.role());
        assertEquals("classroom-session-101", res.roomName());
    }

    @Test
    @DisplayName("Admin can generate room token as ADMIN observer")
    void adminCanGenerateToken() {
        when(sessionRepository.findById(101L)).thenReturn(Optional.of(session));
        when(classGroupRepository.findById(20L)).thenReturn(Optional.of(classGroup));
        when(userRepository.findById(2L)).thenReturn(Optional.of(tutorUser));

        MeetingTokenResponse res = meetingService.generateTokenForSession(101L, adminUser);

        assertNotNull(res);
        assertEquals("ADMIN", res.role());
    }

    @Test
    @DisplayName("Outsider student not enrolled in class is denied with 403 ACCESS_DENIED")
    void nonEnrolledStudentThrowsAccessDenied() {
        when(sessionRepository.findById(101L)).thenReturn(Optional.of(session));
        when(classGroupRepository.findById(20L)).thenReturn(Optional.of(classGroup));
        when(enrollmentRepository.existsByStudentIdAndClassGroupIdAndStatus(99L, 20L, EnrollmentStatus.ACTIVE))
                .thenReturn(false);
        when(learningScheduleRepository.existsByStudentIdAndClassGroupIdAndStatus(eq(99L), eq(20L), any()))
                .thenReturn(false);

        BusinessException ex = assertThrows(BusinessException.class, () ->
                meetingService.generateTokenForSession(101L, outsiderStudent));

        assertEquals(ErrorCode.ACCESS_DENIED, ex.getErrorCode());
    }

    @Test
    @DisplayName("Unassigned tutor is denied with 403 ACCESS_DENIED")
    void unassignedTutorThrowsAccessDenied() {
        User otherTutor = User.builder().id(88L).email("other@vtt.vn").role("ROLE_TUTOR").build();
        when(sessionRepository.findById(101L)).thenReturn(Optional.of(session));
        when(classGroupRepository.findById(20L)).thenReturn(Optional.of(classGroup));
        when(tutorAssignmentRepository.findByClassGroupIdAndStatus(20L, AssignmentStatus.ACTIVE))
                .thenReturn(Optional.empty());

        BusinessException ex = assertThrows(BusinessException.class, () ->
                meetingService.generateTokenForSession(101L, otherTutor));

        assertEquals(ErrorCode.ACCESS_DENIED, ex.getErrorCode());
    }

    @Test
    @DisplayName("Non-existent session throws SESSION_NOT_FOUND")
    void sessionNotFoundThrows() {
        when(sessionRepository.findById(999L)).thenReturn(Optional.empty());

        BusinessException ex = assertThrows(BusinessException.class, () ->
                meetingService.generateTokenForSession(999L, tutorUser));

        assertEquals(ErrorCode.SESSION_NOT_FOUND, ex.getErrorCode());
    }

    @Test
    @DisplayName("Admin successfully retrieves MongoDB meeting session and participant logs")
    void adminCanGetSessionMeetingLogs() {
        when(sessionRepository.findById(101L)).thenReturn(Optional.of(session));
        MeetingSessionLog mockLog = MeetingSessionLog.builder()
                .sessionId("classroom-session-101")
                .roomName("classroom-session-101")
                .status("ACTIVE")
                .startTime(Instant.now())
                .build();
        when(meetingSessionLogRepository.findBySessionId("classroom-session-101")).thenReturn(Optional.of(mockLog));
        when(meetingParticipantLogRepository.findBySessionId("classroom-session-101")).thenReturn(List.of(
                MeetingParticipantLog.builder().sessionId("classroom-session-101").userId(2L).userRole("TUTOR").build(),
                MeetingParticipantLog.builder().sessionId("classroom-session-101").userId(3L).userRole("STUDENT").build()
        ));

        MeetingSessionLogsResponse response = meetingService.getSessionMeetingLogs(101L, adminUser);

        assertNotNull(response);
        assertEquals(101L, response.sessionId());
        assertEquals("classroom-session-101", response.roomName());
        assertNotNull(response.sessionLog());
        assertEquals(2, response.totalParticipants());
    }

    @Test
    @DisplayName("Student cannot retrieve session meeting logs (ACCESS_DENIED)")
    void studentCannotGetMeetingLogs() {
        when(sessionRepository.findById(101L)).thenReturn(Optional.of(session));

        BusinessException ex = assertThrows(BusinessException.class, () ->
                meetingService.getSessionMeetingLogs(101L, studentUser));

        assertEquals(ErrorCode.ACCESS_DENIED, ex.getErrorCode());
    }

    @Test
    @DisplayName("Webhook missing auth header throws ACCESS_DENIED")
    void webhookMissingAuthHeaderThrows() {
        BusinessException ex = assertThrows(BusinessException.class, () ->
                meetingService.handleWebhook("{}", null));

        assertEquals(ErrorCode.ACCESS_DENIED, ex.getErrorCode());
    }

    @Test
    @DisplayName("Webhook invalid token throws ACCESS_DENIED")
    void webhookInvalidTokenThrows() {
        BusinessException ex = assertThrows(BusinessException.class, () ->
                meetingService.handleWebhook("{}", "Bearer invalid_token"));

        assertEquals(ErrorCode.ACCESS_DENIED, ex.getErrorCode());
    }
}
