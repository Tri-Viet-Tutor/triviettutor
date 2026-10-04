package com.viettritutor.modules.schedule.dto;

import com.viettritutor.modules.schedule.domain.Session;
import com.viettritutor.modules.schedule.domain.SessionStatus;
import io.swagger.v3.oas.annotations.media.Schema;

import java.time.LocalDate;
import java.time.LocalTime;

@Schema(name = "SessionResponse")
public record SessionResponse(
        Long sessionId,
        Long classGroupId,
        Integer sessionNumber,
        LocalDate date,
        LocalTime startTime,
        LocalTime endTime,
        SessionStatus status,
        Long scheduledTutorId,
        Long actualTutorId,
        String meetingUrl,
        Long topicId,
        Long originalSessionId) {

    public static SessionResponse from(Session session) {
        return new SessionResponse(
                session.getId(),
                session.getClassGroupId(),
                session.getSessionNumber(),
                session.getSessionDate(),
                session.getStartTime(),
                session.getEndTime(),
                session.getStatus(),
                session.getScheduledTutorId(),
                session.getActualTutorId(),
                session.getMeetingUrl(),
                session.getTopicId(),
                session.getOriginalSession() == null ? null : session.getOriginalSession().getId());
    }
}
