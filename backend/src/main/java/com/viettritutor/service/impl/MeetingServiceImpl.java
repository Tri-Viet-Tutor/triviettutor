package com.viettritutor.service.impl;

import com.viettritutor.common.exception.BusinessException;
import com.viettritutor.common.exception.ErrorCode;
import com.viettritutor.document.MeetingParticipantLog;
import com.viettritutor.document.MeetingSessionLog;
import com.viettritutor.dto.meeting.MeetingSessionLogsResponse;
import com.viettritutor.dto.meeting.MeetingTokenResponse;
import com.viettritutor.entity.ClassGroup;
import com.viettritutor.entity.Session;
import com.viettritutor.entity.User;
import com.viettritutor.enums.AssignmentStatus;
import com.viettritutor.enums.EnrollmentStatus;
import com.viettritutor.enums.LearningScheduleStatus;
import com.viettritutor.enums.SessionStatus;
import com.viettritutor.repository.*;
import com.viettritutor.repository.mongo.MeetingParticipantLogRepository;
import com.viettritutor.repository.mongo.MeetingSessionLogRepository;
import com.viettritutor.service.MeetingService;
import io.livekit.server.*;
import livekit.LivekitModels;
import livekit.LivekitWebhook;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.dao.DataAccessException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.*;

@Service
@RequiredArgsConstructor
@Slf4j
public class MeetingServiceImpl implements MeetingService {

    private static final String ROLE_ADMIN = "ROLE_ADMIN";
    private static final String ROLE_TUTOR = "ROLE_TUTOR";
    private static final String ROLE_STUDENT = "ROLE_STUDENT";

    /** The classroom opens this long before the session starts ... */
    static final Duration JOIN_OPENS_BEFORE_START = Duration.ofMinutes(15);
    /** ... and stays open this long after the session ends so participants can rejoin. */
    static final Duration JOIN_CLOSES_AFTER_END = Duration.ofMinutes(15);

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
    private final Clock clock;

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
        String role = validateAndResolveRole(session, classGroupId, currentUser);
        requireJoinable(session, "ADMIN".equals(role));
        ClassGroup classGroup = classGroupId != null ? classGroupRepository.findById(classGroupId).orElse(null) : null;

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
            // Prefer the live session whose classroom is open now, else the first live one, else the first.
            List<Session> live = sessions.stream()
                    .filter(s -> s.getStatus() != SessionStatus.COMPLETED && s.getStatus() != SessionStatus.CANCELLED)
                    .toList();
            Session candidate = live.stream().filter(this::withinJoinWindow).findFirst()
                    .orElse(live.isEmpty() ? sessions.get(0) : live.get(0));
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
            // Only the tutor actually teaching this session: a substitute replaces the scheduled tutor.
            if (userId.equals(teachingTutorId(session))) {
                return "TUTOR";
            }

            log.warn("Tutor {} is not teaching session {} of class {}", userId, session.getId(), classGroupId);
            throw new BusinessException(ErrorCode.ACCESS_DENIED);
        }

        if (ROLE_STUDENT.equals(userRole)) {
            // The paid enrollment's learning schedule must cover the session date.
            if (classGroupId != null && learningScheduleRepository
                    .existsByStudentIdAndClassGroupIdAndStatusAndStartDateLessThanEqualAndEndDateGreaterThanEqual(
                            userId, classGroupId, LearningScheduleStatus.ACTIVE,
                            session.getSessionDate(), session.getSessionDate())) {
                return "STUDENT";
            }

            log.warn("Student {} is not enrolled in class {}", userId, classGroupId);
            throw new BusinessException(ErrorCode.ACCESS_DENIED);
        }

        throw new BusinessException(ErrorCode.ACCESS_DENIED);
    }

    private static Long teachingTutorId(Session session) {
        return session.getActualTutorId() != null ? session.getActualTutorId() : session.getScheduledTutorId();
    }

    private void requireJoinable(Session session, boolean admin) {
        boolean open = withinJoinWindow(session);
        // A session may finish (COMPLETED) right at its end; participants can still rejoin during the grace period.
        if (session.getStatus() == SessionStatus.CANCELLED || (session.getStatus() == SessionStatus.COMPLETED && !open)) {
            throw new BusinessException(ErrorCode.MEETING_NOT_AVAILABLE, "The session is cancelled or completed");
        }
        // Admins may observe a live session outside the window.
        if (!admin && !open) {
            throw new BusinessException(ErrorCode.MEETING_NOT_AVAILABLE,
                    "The classroom opens 15 minutes before the session starts and closes 15 minutes after it ends");
        }
    }

    private boolean withinJoinWindow(Session session) {
        ZoneId zone = clock.getZone();
        Instant opensAt = LocalDateTime.of(session.getSessionDate(), session.getStartTime()).atZone(zone).toInstant()
                .minus(JOIN_OPENS_BEFORE_START);
        Instant closesAt = LocalDateTime.of(session.getSessionDate(), session.getEndTime()).atZone(zone).toInstant()
                .plus(JOIN_CLOSES_AFTER_END);
        Instant now = clock.instant();
        return !now.isBefore(opensAt) && now.isBefore(closesAt);
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

    @Override
    public void handleWebhook(String body, String authHeader) {
        if (authHeader == null || authHeader.isBlank()) {
            log.warn("Missing LiveKit webhook Authorization header");
            throw new BusinessException(ErrorCode.ACCESS_DENIED, "Missing webhook authorization header");
        }

        LivekitWebhook.WebhookEvent event;
        try {
            WebhookReceiver receiver = new WebhookReceiver(livekitApiKey, livekitApiSecret);
            event = receiver.receive(body, authHeader);
        } catch (Exception e) {
            log.error("Failed to validate LiveKit webhook event: {}", e.getMessage());
            throw new BusinessException(ErrorCode.ACCESS_DENIED, "Invalid webhook signature");
        }

        String eventType = event.getEvent();
        log.info("Processing LiveKit webhook event: {}", eventType);

        if (meetingSessionLogRepository == null || meetingParticipantLogRepository == null) {
            log.warn("MongoDB repositories are not available for meeting event processing");
            return;
        }

        try {
            String roomName = event.hasRoom() ? event.getRoom().getName() : null;
            if (roomName == null || roomName.isBlank()) {
                log.debug("Event {} does not contain room name", eventType);
                return;
            }

            switch (eventType) {
                case "room_started" -> {
                    MeetingSessionLog sessionLog = meetingSessionLogRepository.findBySessionId(roomName)
                            .orElse(MeetingSessionLog.builder()
                                    .sessionId(roomName)
                                    .roomName(roomName)
                                    .build());
                    sessionLog.setStatus("ACTIVE");
                    sessionLog.setStartTime(Instant.now());
                    meetingSessionLogRepository.save(sessionLog);
                }
                case "participant_joined" -> {
                    if (event.hasParticipant()) {
                        LivekitModels.ParticipantInfo participant = event.getParticipant();
                        String identity = participant.getIdentity();
                        String name = participant.getName();

                        MeetingParticipantLog pLog = meetingParticipantLogRepository
                                .findBySessionIdAndParticipantIdentity(roomName, identity)
                                .orElse(MeetingParticipantLog.builder()
                                        .sessionId(roomName)
                                        .roomName(roomName)
                                        .participantIdentity(identity)
                                        .participantName(name)
                                        .eventHistory(new ArrayList<>())
                                        .build());

                        pLog.setJoinedAt(Instant.now());
                        if (pLog.getEventHistory() == null) {
                            pLog.setEventHistory(new ArrayList<>());
                        }
                        pLog.getEventHistory().add(MeetingParticipantLog.ParticipantEvent.builder()
                                .event("JOINED")
                                .timestamp(Instant.now())
                                .details(Map.of("name", name != null ? name : identity))
                                .build());
                        meetingParticipantLogRepository.save(pLog);

                        meetingSessionLogRepository.findBySessionId(roomName).ifPresent(sLog -> {
                            int currentCount = sLog.getTotalParticipantsCount() != null ? sLog.getTotalParticipantsCount() + 1 : 1;
                            sLog.setTotalParticipantsCount(currentCount);
                            if (sLog.getMaxParticipants() == null || currentCount > sLog.getMaxParticipants()) {
                                sLog.setMaxParticipants(currentCount);
                            }
                            meetingSessionLogRepository.save(sLog);
                        });
                    }
                }
                case "participant_left" -> {
                    if (event.hasParticipant()) {
                        LivekitModels.ParticipantInfo participant = event.getParticipant();
                        String identity = participant.getIdentity();

                        meetingParticipantLogRepository.findBySessionIdAndParticipantIdentity(roomName, identity).ifPresent(pLog -> {
                            Instant now = Instant.now();
                            pLog.setLeftAt(now);
                            if (pLog.getJoinedAt() != null) {
                                pLog.setDurationSeconds(Duration.between(pLog.getJoinedAt(), now).getSeconds());
                            }
                            String reason = participant.getDisconnectReason() != null
                                    ? participant.getDisconnectReason().name()
                                    : "UNKNOWN";
                            pLog.setDisconnectReason(reason);
                            if (pLog.getEventHistory() == null) {
                                pLog.setEventHistory(new ArrayList<>());
                            }
                            pLog.getEventHistory().add(MeetingParticipantLog.ParticipantEvent.builder()
                                    .event("LEFT")
                                    .timestamp(now)
                                    .details(Map.of("reason", reason))
                                    .build());
                            meetingParticipantLogRepository.save(pLog);
                        });
                    }
                }
                case "track_published" -> {
                    if (event.hasParticipant() && event.hasTrack()) {
                        LivekitModels.ParticipantInfo participant = event.getParticipant();
                        LivekitModels.TrackInfo track = event.getTrack();
                        String identity = participant.getIdentity();

                        meetingParticipantLogRepository.findBySessionIdAndParticipantIdentity(roomName, identity).ifPresent(pLog -> {
                            String eventName = track.getType() == LivekitModels.TrackType.AUDIO ? "PUBLISHED_AUDIO" : "PUBLISHED_VIDEO";
                            if (pLog.getEventHistory() == null) {
                                pLog.setEventHistory(new ArrayList<>());
                            }
                            pLog.getEventHistory().add(MeetingParticipantLog.ParticipantEvent.builder()
                                    .event(eventName)
                                    .timestamp(Instant.now())
                                    .details(Map.of("trackSid", track.getSid()))
                                    .build());
                            meetingParticipantLogRepository.save(pLog);
                        });
                    }
                }
                case "room_finished" -> {
                    meetingSessionLogRepository.findBySessionId(roomName).ifPresent(sLog -> {
                        Instant now = Instant.now();
                        sLog.setEndTime(now);
                        sLog.setStatus("COMPLETED");
                        if (sLog.getStartTime() != null) {
                            sLog.setDurationSeconds(Duration.between(sLog.getStartTime(), now).getSeconds());
                        }
                        meetingSessionLogRepository.save(sLog);
                    });
                }
                default -> log.debug("Unhandled LiveKit webhook event: {}", eventType);
            }
        } catch (Exception e) {
            log.error("Error processing LiveKit webhook event {}: {}", eventType, e.getMessage(), e);
        }
    }

    @Override
    @Transactional(readOnly = true)
    public MeetingSessionLogsResponse getSessionMeetingLogs(Long sessionId, User currentUser) {
        if (currentUser == null) {
            throw new BusinessException(ErrorCode.ACCESS_DENIED);
        }

        Session session = sessionRepository.findById(sessionId)
                .orElseThrow(() -> new BusinessException(ErrorCode.SESSION_NOT_FOUND));

        boolean isAdmin = ROLE_ADMIN.equals(currentUser.getRole());
        boolean isTutor = ROLE_TUTOR.equals(currentUser.getRole());
        if (!isAdmin && !isTutor) {
            throw new BusinessException(ErrorCode.ACCESS_DENIED);
        }

        if (isTutor) {
            Long tutorId = currentUser.getId();
            boolean isAssigned = tutorId.equals(session.getActualTutorId()) || tutorId.equals(session.getScheduledTutorId());
            if (!isAssigned && session.getClassGroupId() != null) {
                isAssigned = tutorAssignmentRepository
                        .findByClassGroupIdAndStatus(session.getClassGroupId(), AssignmentStatus.ACTIVE)
                        .map(a -> tutorId.equals(a.getTutorId()))
                        .orElse(false);
            }
            if (!isAssigned) {
                throw new BusinessException(ErrorCode.ACCESS_DENIED);
            }
        }

        String roomName = "classroom-session-" + sessionId;
        MeetingSessionLog sessionLog = null;
        List<MeetingParticipantLog> participantLogs = Collections.emptyList();

        try {
            if (meetingSessionLogRepository != null) {
                sessionLog = meetingSessionLogRepository.findBySessionId(roomName).orElse(null);
            }
            if (meetingParticipantLogRepository != null) {
                participantLogs = meetingParticipantLogRepository.findBySessionId(roomName);
                if (participantLogs == null) {
                    participantLogs = Collections.emptyList();
                }
            }
        } catch (DataAccessException e) {
            // MongoDB is an optional audit store: report it as unavailable instead of a 500.
            log.warn("Meeting logs unavailable for session {}: {}", sessionId, e.getMessage());
            throw new BusinessException(ErrorCode.MEETING_LOGS_UNAVAILABLE);
        }

        return MeetingSessionLogsResponse.builder()
                .sessionId(sessionId)
                .roomName(roomName)
                .sessionLog(sessionLog)
                .participantLogs(participantLogs)
                .totalParticipants(participantLogs != null ? participantLogs.size() : 0)
                .build();
    }
}
