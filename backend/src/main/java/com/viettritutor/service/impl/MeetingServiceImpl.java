package com.viettritutor.service.impl;

import com.viettritutor.common.exception.BusinessException;
import com.viettritutor.common.exception.ErrorCode;
import com.viettritutor.document.MeetingParticipantLog;
import com.viettritutor.document.MeetingSessionLog;
import com.viettritutor.dto.meeting.MeetingTokenResponse;
import com.viettritutor.entity.ClassGroup;
import com.viettritutor.entity.Session;
import com.viettritutor.entity.User;
import com.viettritutor.enums.AssignmentStatus;
import com.viettritutor.enums.EnrollmentStatus;
import com.viettritutor.enums.LearningScheduleStatus;
import com.viettritutor.repository.*;
import com.viettritutor.repository.mongo.MeetingParticipantLogRepository;
import com.viettritutor.repository.mongo.MeetingSessionLogRepository;
import com.viettritutor.service.MeetingService;
import io.livekit.server.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
@Slf4j
public class MeetingServiceImpl implements MeetingService {

    private static final String ROLE_ADMIN = "ROLE_ADMIN";
    private static final String ROLE_TUTOR = "ROLE_TUTOR";
    private static final String ROLE_STUDENT = "ROLE_STUDENT";

    @Value("${livekit.url:ws://localhost:7880}")
    private String livekitUrl;

    @Value("${livekit.api.key:devkey}")
    private String livekitApiKey;

    @Value("${livekit.api.secret:secret}")
    private String livekitApiSecret;

    private final SessionRepository sessionRepository;
    private final ClassGroupRepository classGroupRepository;
    private final EnrollmentRepository enrollmentRepository;
    private final LearningScheduleRepository learningScheduleRepository;
    private final TutorAssignmentRepository tutorAssignmentRepository;
    private final UserRepository userRepository;

    @Autowired(required = false)
    private MeetingSessionLogRepository meetingSessionLogRepository;

    @Autowired(required = false)
    private MeetingParticipantLogRepository meetingParticipantLogRepository;

    @Override
    @Transactional
    public MeetingTokenResponse generateTokenForSession(Long sessionId, User currentUser) {
        if (currentUser == null) {
            throw new BusinessException(ErrorCode.ACCESS_DENIED);
        }

        Session session = sessionRepository.findById(sessionId)
                .orElseThrow(() -> new BusinessException(ErrorCode.SESSION_NOT_FOUND));

        Long classGroupId = session.getClassGroupId();
        ClassGroup classGroup = classGroupId != null ? classGroupRepository.findById(classGroupId).orElse(null) : null;

        String role = validateAndResolveRole(session, classGroupId, currentUser);

        boolean isTutor = "TUTOR".equals(role);
        boolean isAdmin = "ADMIN".equals(role);

        String roomName = "classroom-session-" + session.getId();
        String identity = String.valueOf(currentUser.getId());
        String displayName = (currentUser.getFullName() != null && !currentUser.getFullName().isBlank())
                ? currentUser.getFullName()
                : currentUser.getEmail();

        String suffix = isTutor ? " (Gia sư)" : (isAdmin ? " (Quản lý)" : " (Học sinh)");
        String participantName = displayName + suffix;

        AccessToken token = new AccessToken(livekitApiKey, livekitApiSecret);
        token.setIdentity(identity);
        token.setName(participantName);
        token.setMetadata("{\"role\":\"" + role + "\",\"userId\":" + currentUser.getId() + ",\"email\":\"" + currentUser.getEmail() + "\"}");

        token.addGrants(
                new RoomJoin(true),
                new RoomName(roomName),
                new CanPublish(isTutor || (!isAdmin)),
                new CanSubscribe(true),
                new CanPublishData(true),
                new RoomAdmin(isTutor || isAdmin)
        );

        String jwt = token.toJwt();

        // If session meetingUrl is unset, store default internal classroom link
        if (session.getMeetingUrl() == null || session.getMeetingUrl().isBlank()) {
            session.setMeetingUrl("/classroom/" + session.getId());
            sessionRepository.save(session);
        }

        // Safe audit logging to MongoDB without failing live token response
        auditMeetingEntry(session, classGroup, currentUser, role, roomName, identity, participantName);

        String courseTitle = (classGroup != null && classGroup.getCourse() != null)
                ? classGroup.getCourse().getName()
                : "Phòng học trực tuyến #" + session.getId();

        String tutorName = resolveTutorName(session);

        return new MeetingTokenResponse(
                jwt,
                livekitUrl,
                roomName,
                role,
                session.getId(),
                classGroupId,
                courseTitle,
                session.getSessionNumber(),
                tutorName
        );
    }

    @Override
    @Transactional
    public MeetingTokenResponse generateTokenForClass(Long classGroupId, User currentUser) {
        if (currentUser == null) {
            throw new BusinessException(ErrorCode.ACCESS_DENIED);
        }

        ClassGroup classGroup = classGroupRepository.findById(classGroupId)
                .orElseThrow(() -> new BusinessException(ErrorCode.CLASS_NOT_FOUND));

        List<Session> sessions = sessionRepository.findByClassGroupIdOrderBySessionNumberAsc(classGroupId);
        if (!sessions.isEmpty()) {
            // Find first pending or in-progress session, or latest one
            Session candidate = sessions.stream()
                    .filter(s -> s.getStatus() != com.viettritutor.enums.SessionStatus.COMPLETED
                            && s.getStatus() != com.viettritutor.enums.SessionStatus.CANCELLED)
                    .findFirst()
                    .orElse(sessions.get(0));
            return generateTokenForSession(candidate.getId(), currentUser);
        }

        // Fallback for class group without generated sessions yet
        String role = validateClassGroupMembership(classGroupId, currentUser);
        boolean isTutor = "TUTOR".equals(role);
        boolean isAdmin = "ADMIN".equals(role);

        String roomName = "classroom-class-" + classGroupId;
        String identity = String.valueOf(currentUser.getId());
        String displayName = (currentUser.getFullName() != null && !currentUser.getFullName().isBlank())
                ? currentUser.getFullName()
                : currentUser.getEmail();

        String suffix = isTutor ? " (Gia sư)" : (isAdmin ? " (Quản lý)" : " (Học sinh)");
        AccessToken token = new AccessToken(livekitApiKey, livekitApiSecret);
        token.setIdentity(identity);
        token.setName(displayName + suffix);
        token.setMetadata("{\"role\":\"" + role + "\",\"userId\":" + currentUser.getId() + "}");
        token.addGrants(
                new RoomJoin(true),
                new RoomName(roomName),
                new CanPublish(isTutor || (!isAdmin)),
                new CanSubscribe(true),
                new CanPublishData(true),
                new RoomAdmin(isTutor || isAdmin)
        );

        String courseTitle = (classGroup.getCourse() != null) ? classGroup.getCourse().getName() : "Lớp học #" + classGroupId;

        return new MeetingTokenResponse(
                token.toJwt(),
                livekitUrl,
                roomName,
                role,
                null,
                classGroupId,
                courseTitle,
                1,
                null
        );
    }

    @Override
    @Transactional
    public MeetingTokenResponse generateTokenForTarget(Long targetId, User currentUser) {
        Optional<Session> sessionOpt = sessionRepository.findById(targetId);
        if (sessionOpt.isPresent()) {
            return generateTokenForSession(targetId, currentUser);
        }
        return generateTokenForClass(targetId, currentUser);
    }

    private String validateAndResolveRole(Session session, Long classGroupId, User currentUser) {
        String userRole = currentUser.getRole();
        Long userId = currentUser.getId();

        if (ROLE_ADMIN.equals(userRole)) {
            return "ADMIN";
        }

        if (ROLE_TUTOR.equals(userRole)) {
            Long scheduledTutorId = session.getScheduledTutorId();
            Long actualTutorId = session.getActualTutorId();

            if (userId.equals(actualTutorId) || userId.equals(scheduledTutorId)) {
                return "TUTOR";
            }

            if (classGroupId != null) {
                boolean isAssigned = tutorAssignmentRepository
                        .findByClassGroupIdAndStatus(classGroupId, AssignmentStatus.ACTIVE)
                        .map(a -> userId.equals(a.getTutorId()))
                        .orElse(false);
                if (isAssigned) {
                    return "TUTOR";
                }
            }

            log.warn("Tutor {} is not assigned to session {} or class {}", userId, session.getId(), classGroupId);
            throw new BusinessException(ErrorCode.ACCESS_DENIED);
        }

        if (ROLE_STUDENT.equals(userRole)) {
            if (classGroupId != null) {
                boolean isEnrolled = enrollmentRepository.existsByStudentIdAndClassGroupIdAndStatus(
                        userId, classGroupId, EnrollmentStatus.ACTIVE);
                if (isEnrolled) {
                    return "STUDENT";
                }

                boolean hasSchedule = learningScheduleRepository
                        .existsByStudentIdAndClassGroupIdAndStatus(userId, classGroupId, LearningScheduleStatus.ACTIVE);
                if (hasSchedule) {
                    return "STUDENT";
                }
            }

            log.warn("Student {} is not enrolled in class {}", userId, classGroupId);
            throw new BusinessException(ErrorCode.ACCESS_DENIED);
        }

        throw new BusinessException(ErrorCode.ACCESS_DENIED);
    }

    private String validateClassGroupMembership(Long classGroupId, User currentUser) {
        String userRole = currentUser.getRole();
        Long userId = currentUser.getId();

        if (ROLE_ADMIN.equals(userRole)) {
            return "ADMIN";
        }

        if (ROLE_TUTOR.equals(userRole)) {
            boolean isAssigned = tutorAssignmentRepository
                    .findByClassGroupIdAndStatus(classGroupId, AssignmentStatus.ACTIVE)
                    .map(a -> userId.equals(a.getTutorId()))
                    .orElse(false);
            if (isAssigned) {
                return "TUTOR";
            }
            throw new BusinessException(ErrorCode.ACCESS_DENIED);
        }

        if (ROLE_STUDENT.equals(userRole)) {
            boolean isEnrolled = enrollmentRepository.existsByStudentIdAndClassGroupIdAndStatus(
                    userId, classGroupId, EnrollmentStatus.ACTIVE);
            if (isEnrolled) {
                return "STUDENT";
            }
            throw new BusinessException(ErrorCode.ACCESS_DENIED);
        }

        throw new BusinessException(ErrorCode.ACCESS_DENIED);
    }

    private String resolveTutorName(Session session) {
        Long tutorId = session.getActualTutorId() != null ? session.getActualTutorId() : session.getScheduledTutorId();
        if (tutorId != null) {
            return userRepository.findById(tutorId)
                    .map(u -> (u.getFullName() != null && !u.getFullName().isBlank()) ? u.getFullName() : u.getEmail())
                    .orElse(null);
        }
        return null;
    }

    private void auditMeetingEntry(Session session, ClassGroup classGroup, User currentUser,
                                   String role, String roomName, String identity, String participantName) {
        try {
            if (meetingSessionLogRepository != null) {
                meetingSessionLogRepository.findBySessionId(roomName).orElseGet(() -> {
                    Long hostUserId = session.getActualTutorId() != null ? session.getActualTutorId() : session.getScheduledTutorId();
                    MeetingSessionLog sessionLog = MeetingSessionLog.builder()
                            .sessionId(roomName)
                            .roomName(roomName)
                            .classGroupId(session.getClassGroupId())
                            .scheduleId(session.getId())
                            .hostUserId(hostUserId)
                            .startTime(Instant.now())
                            .status("ACTIVE")
                            .totalParticipantsCount(0)
                            .build();
                    return meetingSessionLogRepository.save(sessionLog);
                });
            }

            if (meetingParticipantLogRepository != null) {
                MeetingParticipantLog participantLog = MeetingParticipantLog.builder()
                        .sessionId(roomName)
                        .roomName(roomName)
                        .userId(currentUser.getId())
                        .userRole(role)
                        .participantIdentity(identity)
                        .participantName(participantName)
                        .joinedAt(Instant.now())
                        .build();
                meetingParticipantLogRepository.save(participantLog);
            }
        } catch (Exception e) {
            log.warn("Mongo meeting log failed for session {} (safe fallback): {}", roomName, e.getMessage());
        }
    }
}
