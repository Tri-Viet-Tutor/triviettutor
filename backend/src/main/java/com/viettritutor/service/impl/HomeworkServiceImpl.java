package com.viettritutor.service.impl;
import com.viettritutor.service.*;
import com.viettritutor.service.HomeworkService;
import com.viettritutor.notification.event.HomeworkPublishedEvent;

import com.viettritutor.common.api.PageResponse;
import com.viettritutor.common.exception.*;
import com.viettritutor.dto.learning.*;
import com.viettritutor.entity.*;
import com.viettritutor.enums.HomeworkStatus;
import com.viettritutor.enums.LearningScheduleStatus;
import com.viettritutor.repository.HomeworkRepository;
import com.viettritutor.repository.HomeworkSubmissionRepository;
import com.viettritutor.repository.LearningScheduleRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;
import java.util.Objects;
import java.time.OffsetDateTime;
import com.viettritutor.enums.SubmissionStatus;
import org.springframework.data.domain.PageRequest;

@Service
@RequiredArgsConstructor
public class HomeworkServiceImpl implements HomeworkService {
    private final HomeworkRepository homeworks;
    private final HomeworkSubmissionRepository submissions;
    private final LearningScheduleRepository learning;
    private final HomeworkAccessService access;
    private final HomeworkQuestionService questions;
    private final LearningAuditService audit;
    private final NotificationService notifications;
    private final PasswordEncoder passwordEncoder;
    private final ApplicationEventPublisher events;

    @Override
    @Transactional
    public HomeworkResponse create(Long sessionId, HomeworkRequest input, User actor) {
        Session s = access.lockSession(sessionId);
        access.requireWriter(s, actor);
        access.requireSessionOpen(s);
        access.requireFuture(input.getDueAt());
        var drafts = input.getQuestions() == null ? List.<HomeworkQuestion>of() : questions.build(input.getQuestions());
        questions.requireCap(drafts);
        questions.requireTotal(drafts, input.getMaxScore());
        Homework h = Homework.builder().sessionId(sessionId).status(HomeworkStatus.DRAFT)
                .allowLateSubmission(!Boolean.FALSE.equals(input.getAllowLateSubmission()))
                .createdBy(actor.getId()).createdAt(access.now()).updatedAt(access.now()).build();
        apply(h, input);
        homeworks.saveAndFlush(h);
        var response = HomeworkResponse.from(h, true, questions.responses(questions.replace(h.getId(), drafts), true));
        audit.homework(h.getId(), actor, "CREATE", null, response);
        return response;
    }

    @Override
    @Transactional
    public HomeworkResponse update(Long id, HomeworkUpdateRequest input, User actor) {
        var context = access.lock(id);
        access.requireWriter(context.session(), actor);
        access.requireSessionOpen(context.session());
        Homework h = context.homework();
        access.requireVersion(h.getVersion(), input.getVersion());
        if (h.getStatus() == HomeworkStatus.CLOSED) throw new BusinessException(ErrorCode.HOMEWORK_LOCKED);
        access.requireBeforeDeadline(h);
        access.requireFuture(input.getDueAt());
        String url = access.resourceUrl(input.getResourceUrl());
        var current = questions.of(id);
        var drafts = input.getQuestions() == null ? null : questions.build(input.getQuestions());
        // Only a new question set is capped, so a homework saved before the cap stays editable
        if (drafts != null) questions.requireCap(drafts);
        questions.requireTotal(drafts == null ? current : drafts, input.getMaxScore());
        // Once published, students may already be working: content and answer key are frozen and
        // the window can only grow. The password and late policy stay adjustable.
        if (h.getStatus() == HomeworkStatus.PUBLISHED &&
                (!Objects.equals(h.getTitle(), input.getTitle().trim())
                 || !Objects.equals(h.getInstructions(), input.getInstructions().trim())
                 || !Objects.equals(h.getResourceUrl(), url)
                 || input.getDueAt().toInstant().isBefore(h.getDueAt().toInstant())
                 || input.getMaxScore().compareTo(h.getMaxScore()) < 0
                 || opensLater(h.getOpenAt(), input.getOpenAt())
                 || (drafts != null && !questions.sameContent(current, drafts))))
            throw new BusinessException(ErrorCode.HOMEWORK_PUBLISHED_EDIT_RESTRICTED);
        var before = HomeworkResponse.from(h, true, questions.responses(current, true));
        apply(h, input);
        if (input.getAllowLateSubmission() != null) h.setAllowLateSubmission(input.getAllowLateSubmission());
        if (drafts != null && h.getStatus() == HomeworkStatus.DRAFT) current = questions.replace(id, drafts);
        homeworks.flush();
        var response = HomeworkResponse.from(h, true, questions.responses(current, true));
        audit.homework(id, actor, "UPDATE", before, response);
        return response;
    }

    @Override
    @Transactional
    public HomeworkResponse changeStatus(Long id, HomeworkStatusRequest input, User actor) {
        var context = access.lock(id);
        access.requireWriter(context.session(), actor);
        Homework h = context.homework();
        access.requireVersion(h.getVersion(), input.getVersion());
        HomeworkStatus target = input.getStatus();
        if (target == HomeworkStatus.DRAFT) throw new BusinessException(ErrorCode.INVALID_STATUS_TRANSITION);
        if (h.getStatus() == target) return HomeworkResponse.from(h, true);
        if (h.getStatus() == HomeworkStatus.CLOSED) throw new BusinessException(ErrorCode.HOMEWORK_LOCKED);
        var before = HomeworkResponse.from(h, true);
        if (target == HomeworkStatus.PUBLISHED) {
            access.requireSessionOpen(context.session());
            access.requireBeforeDeadline(h);
            h.setPublishedAt(access.now());
        } else h.setClosedAt(access.now());
        h.setStatus(target);
        h.setUpdatedAt(access.now());
        homeworks.flush();
        var response = HomeworkResponse.from(h, true);
        audit.homework(id, actor, "STATUS", before, response);
        if (target == HomeworkStatus.PUBLISHED) notifyStudents(context.session(), h, actor);
        return response;
    }

    /** Students see the questions only after starting, so the password actually guards them. */
    @Override
    @Transactional(readOnly = true)
    public HomeworkResponse get(Long id, User actor) {
        var context = access.find(id);
        access.requireVisible(context, actor);
        Homework h = context.homework();
        if (!access.isStudent(actor)) return HomeworkResponse.from(h, true, questions.responses(questions.of(id), true));
        boolean started = submissions.findByHomeworkIdAndStudentId(id, actor.getId()).isPresent();
        return HomeworkResponse.from(h, false, started ? questions.responses(questions.of(id), false) : null);
    }

    @Override
    @Transactional(readOnly = true)
    public PageResponse<HomeworkResponse> list(Long sessionId, int page, int size, User actor) {
        access.requireReader(access.session(sessionId), actor);
        var pageable = access.pageable(page, size);
        boolean staff = !access.isStudent(actor);
        var found = staff ? homeworks.findBySessionId(sessionId, pageable)
                : homeworks.findBySessionIdAndPublishedAtIsNotNull(sessionId, pageable);
        return PageResponse.from(found.map(h -> HomeworkResponse.from(h, staff)));
    }

    @Override
    @Transactional(readOnly = true)
    public PageResponse<StudentHomeworkResponse> listForStudent(SubmissionStatus status, OffsetDateTime from,
            OffsetDateTime to, int page, int size, User actor) {
        if (!access.isStudent(actor)) throw new BusinessException(ErrorCode.ACCESS_DENIED);
        if (from != null && to != null && from.toInstant().isAfter(to.toInstant()))
            throw new BusinessException(ErrorCode.INVALID_HOMEWORK_DATE_RANGE);
        access.pageable(page, size);
        return PageResponse.from(homeworks.findStudentHomeworks(actor.getId(), status, from, to,
                PageRequest.of(page, size)).map(row -> StudentHomeworkResponse.from(
                        row.getHomework(), row.getSession(), row.getSubmission(), actor.getId())));
    }

    @Override
    @Transactional(readOnly = true)
    public PageResponse<TutorHomeworkResponse> listForTutor(int page, int size, User actor) {
        access.pageable(page, size);
        return PageResponse.from(homeworks.findTutorHomeworks(actor.getId(), PageRequest.of(page, size))
                .map(TutorHomeworkResponse::from));
    }

    private void apply(Homework h, HomeworkRequest input) {
        if (input.getOpenAt() != null && !input.getOpenAt().toInstant().isBefore(input.getDueAt().toInstant()))
            throw new BusinessException(ErrorCode.HOMEWORK_INVALID_OPEN_TIME);
        h.setTitle(input.getTitle().trim());
        h.setInstructions(input.getInstructions().trim());
        h.setResourceUrl(access.resourceUrl(input.getResourceUrl()));
        h.setOpenAt(input.getOpenAt());
        h.setDueAt(input.getDueAt());
        h.setMaxScore(input.getMaxScore());
        if (input.getAccessPassword() != null) {
            String password = input.getAccessPassword().trim();
            if (!password.isEmpty() && password.length() < 4) throw new BusinessException(ErrorCode.HOMEWORK_WEAK_PASSWORD);
            h.setAccessPasswordHash(password.isEmpty() ? null : passwordEncoder.encode(password));
        }
        h.setUpdatedAt(access.now());
    }

    private static boolean opensLater(OffsetDateTime current, OffsetDateTime requested) {
        return requested != null && (current == null || requested.toInstant().isAfter(current.toInstant()));
    }

    /** In-app notification now, and an email to each student once the publish commits (HomeworkPublishedMailer). */
    private void notifyStudents(Session session, Homework h, User actor) {
        String message = "Hạn nộp " + notifications.formatTime(h.getDueAt())
                + (h.getOpenAt() != null && h.getOpenAt().toInstant().isAfter(h.getPublishedAt().toInstant())
                        ? ", mở làm bài từ " + notifications.formatTime(h.getOpenAt()) : "")
                + (h.getAccessPasswordHash() != null ? ". Cần mật khẩu do gia sư cung cấp để làm bài." : ".");
        List<Long> students = learning.findByClassGroupIdAndStatusOrderByStudentIdAscIdAsc(session.getClassGroupId(), LearningScheduleStatus.ACTIVE)
                .stream()
                .filter(row -> !row.getStartDate().isAfter(session.getSessionDate()) && !row.getEndDate().isBefore(session.getSessionDate()))
                .map(LearningSchedule::getStudentId).distinct().toList();
        students.forEach(studentId -> notifications.send(studentId, "HOMEWORK_PUBLISHED", "Bài tập mới: " + h.getTitle(),
                message, "/student/homework/" + h.getId()));
        if (!students.isEmpty())
            events.publishEvent(new HomeworkPublishedEvent(h.getId(), h.getTitle(), h.getInstructions(), session.getClassGroupId(),
                    session.getSessionNumber(), session.getSessionDate(), h.getOpenAt(), h.getDueAt(),
                    h.getAccessPasswordHash() != null, questions.of(h.getId()).size(), h.getMaxScore(),
                    actor.getFullName(), students));
    }
}
