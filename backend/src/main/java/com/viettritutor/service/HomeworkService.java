package com.viettritutor.service;

import com.viettritutor.common.api.PageResponse;
import com.viettritutor.common.exception.*;
import com.viettritutor.dto.learning.*;
import com.viettritutor.entity.*;
import com.viettritutor.enums.HomeworkStatus;
import com.viettritutor.repository.HomeworkRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.Objects;
import java.time.OffsetDateTime;
import com.viettritutor.enums.SubmissionStatus;
import org.springframework.data.domain.PageRequest;

@Service
@RequiredArgsConstructor
public class HomeworkService {
    private final HomeworkRepository homeworks;
    private final HomeworkAccessService access;
    private final LearningAuditService audit;

    @Transactional
    public HomeworkResponse create(Long sessionId, HomeworkRequest input, User actor) {
        Session s = access.lockSession(sessionId);
        access.requireWriter(s, actor);
        access.requireSessionOpen(s);
        access.requireFuture(input.getDueAt());
        Homework h = Homework.builder().sessionId(sessionId).status(HomeworkStatus.DRAFT)
                .createdBy(actor.getId()).createdAt(access.now()).updatedAt(access.now()).build();
        apply(h, input);
        homeworks.saveAndFlush(h);
        var response = HomeworkResponse.from(h, true);
        audit.homework(h.getId(), actor, "CREATE", null, response);
        return response;
    }

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
        if (h.getStatus() == HomeworkStatus.PUBLISHED &&
                (!Objects.equals(h.getTitle(), input.getTitle().trim())
                 || !Objects.equals(h.getInstructions(), input.getInstructions().trim())
                 || !Objects.equals(h.getResourceUrl(), url)
                 || input.getDueAt().toInstant().isBefore(h.getDueAt().toInstant())
                 || input.getMaxScore().compareTo(h.getMaxScore()) < 0))
            throw new BusinessException(ErrorCode.HOMEWORK_PUBLISHED_EDIT_RESTRICTED);
        var before = HomeworkResponse.from(h, true);
        apply(h, input);
        homeworks.flush();
        var response = HomeworkResponse.from(h, true);
        audit.homework(id, actor, "UPDATE", before, response);
        return response;
    }

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
        return response;
    }

    @Transactional(readOnly = true)
    public HomeworkResponse get(Long id, User actor) {
        var context = access.find(id);
        access.requireVisible(context, actor);
        return HomeworkResponse.from(context.homework(), !access.isStudent(actor));
    }

    @Transactional(readOnly = true)
    public PageResponse<HomeworkResponse> list(Long sessionId, int page, int size, User actor) {
        access.requireReader(access.session(sessionId), actor);
        var pageable = access.pageable(page, size);
        boolean staff = !access.isStudent(actor);
        var found = staff ? homeworks.findBySessionId(sessionId, pageable)
                : homeworks.findBySessionIdAndPublishedAtIsNotNull(sessionId, pageable);
        return PageResponse.from(found.map(h -> HomeworkResponse.from(h, staff)));
    }

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

    private void apply(Homework h, HomeworkRequest input) {
        h.setTitle(input.getTitle().trim());
        h.setInstructions(input.getInstructions().trim());
        h.setResourceUrl(access.resourceUrl(input.getResourceUrl()));
        h.setDueAt(input.getDueAt());
        h.setMaxScore(input.getMaxScore());
        h.setUpdatedAt(access.now());
    }
}
