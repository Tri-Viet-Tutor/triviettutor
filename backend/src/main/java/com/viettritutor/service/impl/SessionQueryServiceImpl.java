package com.viettritutor.service.impl;

import com.viettritutor.common.api.PageResponse;
import com.viettritutor.common.exception.BusinessException;
import com.viettritutor.common.exception.ErrorCode;
import com.viettritutor.dto.schedule.SessionResponse;
import com.viettritutor.entity.Session;
import com.viettritutor.entity.User;
import com.viettritutor.enums.LearningScheduleStatus;
import com.viettritutor.enums.SessionStatus;
import com.viettritutor.repository.LearningScheduleRepository;
import com.viettritutor.repository.SessionRepository;
import com.viettritutor.service.SessionQueryService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.net.URI;
import java.net.URISyntaxException;
import java.time.LocalDate;
import java.util.List;

@Service
@RequiredArgsConstructor
public class SessionQueryServiceImpl implements SessionQueryService {

    private static final String ROLE_ADMIN = "ROLE_ADMIN";
    private static final String ROLE_TUTOR = "ROLE_TUTOR";
    private static final String ROLE_STUDENT = "ROLE_STUDENT";

    private final SessionRepository sessionRepository;
    private final LearningScheduleRepository learningScheduleRepository;

    @Override
    @Transactional(readOnly = true)
    public List<SessionResponse> getMySessions(
            User currentUser,
            LocalDate from,
            LocalDate to,
            SessionStatus status,
            Long classGroupId) {
        validateDateRange(from, to);
        if (!ROLE_TUTOR.equals(currentUser.getRole()) && !ROLE_STUDENT.equals(currentUser.getRole())) {
            throw new BusinessException(ErrorCode.ACCESS_DENIED);
        }
        return sessionRepository.findVisibleSessions(
                        currentUser.getId(), currentUser.getRole(), from, to, status, classGroupId)
                .stream()
                .map(SessionResponse::from)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public PageResponse<SessionResponse> getAdminSessions(
            LocalDate from,
            LocalDate to,
            Long classGroupId,
            Long tutorId,
            SessionStatus status,
            int page,
            int size) {
        validateDateRange(from, to);
        Pageable pageable = PageRequest.of(page, size,
                Sort.by("sessionDate").ascending()
                        .and(Sort.by("startTime").ascending())
                        .and(Sort.by("id").ascending()));
        return PageResponse.from(sessionRepository.findAdminSessions(
                        from, to, status, classGroupId, tutorId, pageable)
                .map(SessionResponse::from));
    }

    @Override
    @Transactional(readOnly = true)
    public SessionResponse getVisibleSession(Long sessionId, User currentUser) {
        Session session = findSession(sessionId);
        if (!canView(session, currentUser)) {
            throw new BusinessException(ErrorCode.ACCESS_DENIED);
        }
        return SessionResponse.from(session);
    }

    @Override
    @Transactional
    public SessionResponse updateMeetingUrl(Long sessionId, String meetingUrl) {
        Session session = findSession(sessionId);
        session.setMeetingUrl(validateAndNormalizeMeetingUrl(meetingUrl));
        return SessionResponse.from(sessionRepository.save(session));
    }

    private boolean canView(Session session, User user) {
        if (ROLE_ADMIN.equals(user.getRole())) {
            return true;
        }
        if (ROLE_TUTOR.equals(user.getRole())) {
            return user.getId().equals(session.getScheduledTutorId())
                    || user.getId().equals(session.getActualTutorId());
        }
        if (ROLE_STUDENT.equals(user.getRole())) {
            return learningScheduleRepository
                    .existsByStudentIdAndClassGroupIdAndStatusAndStartDateLessThanEqualAndEndDateGreaterThanEqual(
                            user.getId(),
                            session.getClassGroupId(),
                            LearningScheduleStatus.ACTIVE,
                            session.getSessionDate(),
                            session.getSessionDate());
        }
        return false;
    }

    private Session findSession(Long sessionId) {
        return sessionRepository.findById(sessionId)
                .orElseThrow(() -> new BusinessException(ErrorCode.SESSION_NOT_FOUND));
    }

    private void validateDateRange(LocalDate from, LocalDate to) {
        if (from != null && to != null && from.isAfter(to)) {
            throw new BusinessException(ErrorCode.INVALID_DATE_RANGE);
        }
    }

    private String validateAndNormalizeMeetingUrl(String rawUrl) {
        try {
            URI uri = new URI(rawUrl.trim());
            if (!"https".equalsIgnoreCase(uri.getScheme()) || uri.getHost() == null) {
                throw new BusinessException(ErrorCode.INVALID_MEETING_URL);
            }
            return uri.toASCIIString();
        } catch (URISyntaxException | NullPointerException ex) {
            throw new BusinessException(ErrorCode.INVALID_MEETING_URL);
        }
    }
}
