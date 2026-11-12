package com.viettritutor.service.impl;
import com.viettritutor.service.*;
import com.viettritutor.service.HomeworkAccessService;

import com.viettritutor.common.exception.*;
import com.viettritutor.entity.*;
import com.viettritutor.enums.*;
import com.viettritutor.repository.*;
import jakarta.persistence.*;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.*;
import org.springframework.stereotype.Service;
import java.net.*;
import java.time.*;
import java.time.temporal.ChronoUnit;
import java.util.Objects;

@Service
@RequiredArgsConstructor
public class HomeworkAccessServiceImpl implements HomeworkAccessService {
    private final SessionRepository sessions;
    private final ClassGroupRepository classes;
    private final LearningScheduleRepository learning;
    private final HomeworkRepository homeworks;
    private final EntityManager entityManager;
    private final Clock clock;

    

    @Override
    public Session session(Long id) {
        return sessions.findById(id).orElseThrow(() -> new BusinessException(ErrorCode.SESSION_NOT_FOUND));
    }

    // All writes share the class -> session -> homework lock order with reassignment/cancellation.
    @Override
    public Session lockSession(Long id) {
        Long classId = sessions.findClassGroupId(id).orElseThrow(() -> new BusinessException(ErrorCode.SESSION_NOT_FOUND));
        classes.findForUpdate(classId).orElseThrow(() -> new BusinessException(ErrorCode.CLASS_NOT_FOUND));
        Session s = sessions.findForUpdate(id).orElseThrow(() -> new BusinessException(ErrorCode.SESSION_NOT_FOUND));
        entityManager.refresh(s, LockModeType.PESSIMISTIC_WRITE);
        return s;
    }

    @Override
    public Context lock(Long homeworkId) {
        Long sessionId = homeworks.findSessionId(homeworkId).orElseThrow(() -> new BusinessException(ErrorCode.HOMEWORK_NOT_FOUND));
        Session s = lockSession(sessionId);
        Homework h = homeworks.findForUpdate(homeworkId).orElseThrow(() -> new BusinessException(ErrorCode.HOMEWORK_NOT_FOUND));
        entityManager.refresh(h, LockModeType.PESSIMISTIC_WRITE);
        return new Context(s, h);
    }

    @Override
    public Context find(Long homeworkId) {
        Homework h = homeworks.findById(homeworkId).orElseThrow(() -> new BusinessException(ErrorCode.HOMEWORK_NOT_FOUND));
        return new Context(session(h.getSessionId()), h);
    }

    @Override
    public boolean isAdmin(User user) { return "ROLE_ADMIN".equals(user.getRole()); }
    @Override
    public boolean isStudent(User user) { return "ROLE_STUDENT".equals(user.getRole()); }

    /** The tutor who currently teaches the session (a substitute takes precedence). */
    @Override
    public Long tutorOf(Session s) {
        return s.getActualTutorId() != null ? s.getActualTutorId() : s.getScheduledTutorId();
    }

    @Override
    public void requireWriter(Session s, User actor) {
        if (!isAdmin(actor) && (!"ROLE_TUTOR".equals(actor.getRole()) || !Objects.equals(tutorOf(s), actor.getId())))
            throw new BusinessException(ErrorCode.ACCESS_DENIED);
    }

    @Override
    public void requireStudent(Session s, User actor) {
        if (!isStudent(actor) || !learning.existsByStudentIdAndClassGroupIdAndStatusAndStartDateLessThanEqualAndEndDateGreaterThanEqual(
                actor.getId(), s.getClassGroupId(), LearningScheduleStatus.ACTIVE, s.getSessionDate(), s.getSessionDate()))
            throw new BusinessException(ErrorCode.ACCESS_DENIED);
    }

    @Override
    public void requireReader(Session s, User actor) {
        if (isStudent(actor)) requireStudent(s, actor);
        else requireWriter(s, actor);
    }

    @Override
    public void requireVisible(Context context, User actor) {
        requireReader(context.session(), actor);
        if (isStudent(actor) && context.homework().getPublishedAt() == null)
            throw new BusinessException(ErrorCode.HOMEWORK_NOT_FOUND);
    }

    @Override
    public void requireSessionOpen(Session s) {
        if (s.getStatus() == SessionStatus.CANCELLED)
            throw new BusinessException(ErrorCode.HOMEWORK_SESSION_CANCELLED);
    }

    @Override
    public void requireBeforeDeadline(Homework h) {
        if (!clock.instant().isBefore(h.getDueAt().toInstant()))
            throw new BusinessException(ErrorCode.HOMEWORK_DEADLINE_PASSED);
    }

    /** Student work is accepted from openAt while PUBLISHED; after dueAt only when late work is allowed. */
    @Override
    public void requireAccepting(Context context) {
        requireSessionOpen(context.session());
        Homework h = context.homework();
        if (h.getStatus() != HomeworkStatus.PUBLISHED)
            throw new BusinessException(ErrorCode.HOMEWORK_NOT_ACCEPTING);
        if (h.getOpenAt() != null && clock.instant().isBefore(h.getOpenAt().toInstant()))
            throw new BusinessException(ErrorCode.HOMEWORK_NOT_OPEN);
        if (!h.isAllowLateSubmission()) requireBeforeDeadline(h);
    }

    /** Seconds past dueAt (at least 1 once the deadline is reached), or null when on time. */
    @Override
    public Long lateSeconds(Homework h) {
        Instant now = clock.instant(), due = h.getDueAt().toInstant();
        return now.isBefore(due) ? null : Math.max(1, Duration.between(due, now).getSeconds());
    }

    @Override
    public void requireVersion(long current, Long provided) {
        if (provided == null || current != provided)
            throw new BusinessException(ErrorCode.LEARNING_VERSION_CONFLICT);
    }

    @Override
    public OffsetDateTime now() { return OffsetDateTime.now(clock).truncatedTo(ChronoUnit.MICROS); }

    @Override
    public void requireFuture(OffsetDateTime date) {
        if (!date.toInstant().isAfter(clock.instant()))
            throw new BusinessException(ErrorCode.HOMEWORK_INVALID_DEADLINE);
    }

    @Override
    public Pageable pageable(int page, int size) {
        if (page < 0 || size < 1 || size > 100) throw new BusinessException(ErrorCode.INVALID_PAGINATION);
        return PageRequest.of(page, size, Sort.by("id"));
    }

    @Override
    public String text(String value) { return value == null || value.isBlank() ? null : value.trim(); }

    @Override
    public String resourceUrl(String value) {
        String normalized = text(value);
        if (normalized == null) return null;
        if (normalized.matches("/api/v1/files/[0-9a-fA-F-]{36}(\\?name=[^\\s]{0,1000})?")) return normalized;
        try {
            URI uri = new URI(normalized);
            if (!"https".equalsIgnoreCase(uri.getScheme()) || uri.getHost() == null || uri.getUserInfo() != null)
                throw new BusinessException(ErrorCode.INVALID_RESOURCE_URL);
            return uri.toASCIIString();
        } catch (URISyntaxException ex) {
            throw new BusinessException(ErrorCode.INVALID_RESOURCE_URL);
        }
    }
}
