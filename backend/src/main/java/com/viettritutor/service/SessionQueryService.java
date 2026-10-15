package com.viettritutor.service;

import com.viettritutor.common.api.PageResponse;
import com.viettritutor.dto.schedule.SessionResponse;
import com.viettritutor.entity.User;
import com.viettritutor.enums.SessionStatus;

import java.time.LocalDate;
import java.util.List;

public interface SessionQueryService {
    List<SessionResponse> getMySessions(User currentUser, LocalDate from, LocalDate to, SessionStatus status, Long classGroupId);
    PageResponse<SessionResponse> getAdminSessions(LocalDate from, LocalDate to, Long classGroupId, Long tutorId, SessionStatus status, int page, int size);
    SessionResponse getVisibleSession(Long sessionId, User currentUser);
    SessionResponse updateMeetingUrl(Long sessionId, String meetingUrl);
}
