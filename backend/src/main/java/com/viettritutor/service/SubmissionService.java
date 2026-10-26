package com.viettritutor.service;

import com.viettritutor.common.api.PageResponse;
import com.viettritutor.common.exception.*;
import com.viettritutor.dto.learning.*;
import com.viettritutor.entity.*;
import com.viettritutor.enums.SubmissionStatus;
import com.viettritutor.repository.HomeworkSubmissionRepository;
import jakarta.persistence.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class SubmissionService {
    private final HomeworkSubmissionRepository submissions;
    private final HomeworkAccessService access;
    private final LearningAuditService audit;
    private final EntityManager entityManager;

    @Transactional
    public SubmissionResponse start(Long homeworkId, User actor) {
        var context = access.lock(homeworkId);
        access.requireStudent(context.session(), actor);
        access.requireVisible(context, actor);
        access.requireAccepting(context);
        var existing = submissions.findByHomeworkIdAndStudentId(homeworkId, actor.getId());
        if (existing.isPresent()) {
            if (existing.get().getStatus() != SubmissionStatus.IN_PROGRESS)
                throw new BusinessException(ErrorCode.SUBMISSION_LOCKED);
            return SubmissionResponse.from(existing.get());
        }
        HomeworkSubmission s = HomeworkSubmission.builder().homeworkId(homeworkId).studentId(actor.getId())
                .status(SubmissionStatus.IN_PROGRESS).startedAt(access.now()).updatedAt(access.now()).build();
        submissions.saveAndFlush(s);
        var response = SubmissionResponse.from(s);
        audit.submission(s.getId(), actor, "START", null, response, null);
        return response;
    }

    @Transactional
    public SubmissionResponse save(Long homeworkId, SubmissionRequest input, User actor, boolean submit) {
        var context = access.lock(homeworkId);
        access.requireStudent(context.session(), actor);
        access.requireVisible(context, actor);
        access.requireAccepting(context);
        HomeworkSubmission s = submissions.findByHomeworkIdAndStudentId(homeworkId, actor.getId())
                .orElseThrow(() -> new BusinessException(ErrorCode.SUBMISSION_NOT_STARTED));
        entityManager.refresh(s, LockModeType.PESSIMISTIC_WRITE);
        access.requireVersion(s.getVersion(), input.getVersion());
        boolean resubmission = submit && s.getStatus() == SubmissionStatus.SUBMITTED;
        if (s.getStatus() != SubmissionStatus.IN_PROGRESS && !resubmission)
            throw new BusinessException(ErrorCode.SUBMISSION_LOCKED);
        String content = access.text(input.getContent()), url = access.resourceUrl(input.getResourceUrl());
        if (submit && content == null && url == null) throw new BusinessException(ErrorCode.EMPTY_SUBMISSION);
        var before = SubmissionResponse.from(s);
        s.setContent(content); s.setResourceUrl(url); s.setUpdatedAt(access.now());
        if (submit) { s.setStatus(SubmissionStatus.SUBMITTED); s.setSubmittedAt(access.now()); }
        submissions.flush();
        var response = SubmissionResponse.from(s);
        audit.submission(s.getId(), actor, submit ? (resubmission ? "RESUBMIT" : "SUBMIT") : "DRAFT", before, response, null);
        return response;
    }

    @Transactional(readOnly = true)
    public SubmissionResponse mine(Long homeworkId, User actor) {
        var context = access.find(homeworkId);
        access.requireStudent(context.session(), actor);
        access.requireVisible(context, actor);
        return submissions.findByHomeworkIdAndStudentId(homeworkId, actor.getId()).map(SubmissionResponse::from)
                .orElseGet(() -> SubmissionResponse.notStarted(homeworkId, actor.getId()));
    }

    @Transactional(readOnly = true)
    public PageResponse<SubmissionResponse> list(Long homeworkId, SubmissionStatus status, int page, int size, User actor) {
        var context = access.find(homeworkId);
        access.requireWriter(context.session(), actor);
        if (status != null && status != SubmissionStatus.SUBMITTED && status != SubmissionStatus.GRADED)
            throw new BusinessException(ErrorCode.INVALID_SUBMISSION_FILTER);
        return PageResponse.from(submissions.findSubmitted(homeworkId, status, access.pageable(page, size))
                .map(SubmissionResponse::from));
    }

    @Transactional
    public SubmissionResponse grade(Long submissionId, GradeSubmissionRequest input, User actor) {
        Long homeworkId = submissions.findHomeworkId(submissionId)
                .orElseThrow(() -> new BusinessException(ErrorCode.SUBMISSION_NOT_FOUND));
        var context = access.lock(homeworkId);
        access.requireWriter(context.session(), actor);
        HomeworkSubmission s = submissions.findById(submissionId)
                .orElseThrow(() -> new BusinessException(ErrorCode.SUBMISSION_NOT_FOUND));
        entityManager.refresh(s, LockModeType.PESSIMISTIC_WRITE);
        access.requireVersion(s.getVersion(), input.getVersion());
        boolean revision = s.getStatus() == SubmissionStatus.GRADED;
        if (revision) {
            if (!access.isAdmin(actor)) throw new BusinessException(ErrorCode.SUBMISSION_LOCKED);
            if (access.text(input.getReason()) == null) throw new BusinessException(ErrorCode.GRADING_REASON_REQUIRED);
        } else if (s.getStatus() != SubmissionStatus.SUBMITTED) {
            throw new BusinessException(ErrorCode.SUBMISSION_NOT_SUBMITTED);
        }
        if (input.getScore().compareTo(context.homework().getMaxScore()) > 0)
            throw new BusinessException(ErrorCode.INVALID_HOMEWORK_SCORE);
        var before = SubmissionResponse.from(s);
        s.setScore(input.getScore()); s.setFeedback(access.text(input.getFeedback()));
        s.setStatus(SubmissionStatus.GRADED); s.setGradedBy(actor.getId()); s.setGradedAt(access.now()); s.setUpdatedAt(access.now());
        submissions.flush();
        var response = SubmissionResponse.from(s);
        audit.submission(s.getId(), actor, revision ? "REVISE" : "GRADE", before, response, access.text(input.getReason()));
        return response;
    }
}
