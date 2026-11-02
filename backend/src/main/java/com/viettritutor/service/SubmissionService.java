package com.viettritutor.service;

import com.viettritutor.common.api.PageResponse;
import com.viettritutor.common.exception.*;
import com.viettritutor.dto.learning.*;
import com.viettritutor.entity.*;
import com.viettritutor.enums.QuestionType;
import com.viettritutor.enums.SubmissionStatus;
import com.viettritutor.repository.*;
import jakarta.persistence.*;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import java.io.IOException;
import java.math.BigDecimal;
import java.util.*;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class SubmissionService {
    static final int MAX_ATTACHMENTS = 10;
    static final long MAX_ATTACHMENT_BYTES = 10L * 1024 * 1024;

    private final HomeworkSubmissionRepository submissions;
    private final HomeworkAnswerRepository answers;
    private final SubmissionAttachmentRepository attachments;
    private final LearningFileRepository learningFiles;
    private final UserRepository users;
    private final HomeworkAccessService access;
    private final HomeworkQuestionService questions;
    private final LearningAuditService audit;
    private final NotificationService notifications;
    private final PasswordEncoder passwordEncoder;
    private final EntityManager entityManager;

    @Transactional
    public SubmissionResponse start(Long homeworkId, StartSubmissionRequest input, User actor) {
        var context = access.lock(homeworkId);
        access.requireStudent(context.session(), actor);
        access.requireVisible(context, actor);
        access.requireAccepting(context);
        var existing = submissions.findByHomeworkIdAndStudentId(homeworkId, actor.getId());
        if (existing.isPresent()) {
            if (existing.get().getStatus() != SubmissionStatus.IN_PROGRESS)
                throw new BusinessException(ErrorCode.SUBMISSION_LOCKED);
            return detailed(existing.get(), true);
        }
        // The password guards the first entry; resuming an attempt in progress does not ask again.
        String hash = context.homework().getAccessPasswordHash();
        String password = input == null || input.getPassword() == null ? "" : input.getPassword().trim();
        if (hash != null && !passwordEncoder.matches(password, hash))
            throw new BusinessException(ErrorCode.HOMEWORK_WRONG_PASSWORD);
        HomeworkSubmission s = HomeworkSubmission.builder().homeworkId(homeworkId).studentId(actor.getId())
                .status(SubmissionStatus.IN_PROGRESS).startedAt(access.now()).updatedAt(access.now()).build();
        submissions.saveAndFlush(s);
        var response = SubmissionResponse.from(s);
        audit.submission(s.getId(), actor, "START", null, response, null);
        return detailed(s, true);
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
        var quiz = questions.of(homeworkId);
        String content = access.text(input.getContent()), url = access.resourceUrl(input.getResourceUrl());
        if (input.getAnswers() != null) saveAnswers(s, quiz, input.getAnswers());
        // A quiz may be handed in blank (it simply scores 0); free-form homework needs some work.
        if (submit && quiz.isEmpty() && content == null && url == null && attachments.countBySubmissionId(s.getId()) == 0)
            throw new BusinessException(ErrorCode.EMPTY_SUBMISSION);
        var before = SubmissionResponse.from(s);
        s.setContent(content); s.setResourceUrl(url); s.setUpdatedAt(access.now());
        if (submit) {
            Homework h = context.homework();
            s.setStatus(SubmissionStatus.SUBMITTED); s.setSubmittedAt(access.now());
            s.setLateSeconds(access.lateSeconds(h));
            if (!quiz.isEmpty()) autoGrade(s, quiz);
        }
        submissions.flush();
        var response = SubmissionResponse.from(s);
        audit.submission(s.getId(), actor, submit ? (resubmission ? "RESUBMIT" : "SUBMIT") : "DRAFT", before, response, null);
        if (submit) notifyTutor(context, s, actor, resubmission);
        return detailed(s, true);
    }

    @Transactional(readOnly = true)
    public SubmissionResponse mine(Long homeworkId, User actor) {
        var context = access.find(homeworkId);
        access.requireStudent(context.session(), actor);
        access.requireVisible(context, actor);
        return submissions.findByHomeworkIdAndStudentId(homeworkId, actor.getId()).map(s -> detailed(s, true))
                .orElseGet(() -> SubmissionResponse.notStarted(homeworkId, actor.getId()));
    }

    @Transactional(readOnly = true)
    public PageResponse<SubmissionResponse> list(Long homeworkId, SubmissionStatus status, int page, int size, User actor) {
        var context = access.find(homeworkId);
        access.requireWriter(context.session(), actor);
        if (status != null && status != SubmissionStatus.SUBMITTED && status != SubmissionStatus.GRADED)
            throw new BusinessException(ErrorCode.INVALID_SUBMISSION_FILTER);
        var found = submissions.findSubmitted(homeworkId, status, access.pageable(page, size));
        var ids = found.map(HomeworkSubmission::getId).toList();
        var answersBy = answers.findBySubmissionIdIn(ids).stream().collect(Collectors.groupingBy(HomeworkAnswer::getSubmissionId));
        var filesBy = attachments.findInfo(ids).stream().collect(Collectors.groupingBy(SubmissionAttachmentRepository.Info::getSubmissionId));
        var names = users.findAllById(found.map(HomeworkSubmission::getStudentId).toSet()).stream()
                .collect(Collectors.toMap(User::getId, User::getFullName));
        return PageResponse.from(found.map(s -> SubmissionResponse.from(s).toBuilder()
                .studentName(names.get(s.getStudentId()))
                .answers(answersBy.getOrDefault(s.getId(), List.of()).stream().map(a -> AnswerResponse.from(a, true)).toList())
                .attachments(filesBy.getOrDefault(s.getId(), List.of()).stream().map(AttachmentResponse::from).toList())
                .build()));
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
        // A system-graded quiz still awaits its first human review (e.g. to leave feedback).
        boolean revision = s.getStatus() == SubmissionStatus.GRADED && !(s.isAutoGraded() && s.getGradedBy() == null);
        if (revision) {
            if (!access.isAdmin(actor)) throw new BusinessException(ErrorCode.SUBMISSION_LOCKED);
            if (access.text(input.getReason()) == null) throw new BusinessException(ErrorCode.GRADING_REASON_REQUIRED);
        } else if (s.getStatus() != SubmissionStatus.SUBMITTED && s.getStatus() != SubmissionStatus.GRADED) {
            throw new BusinessException(ErrorCode.SUBMISSION_NOT_SUBMITTED);
        }
        BigDecimal score = score(s, questions.of(homeworkId), input);
        if (score.compareTo(context.homework().getMaxScore()) > 0)
            throw new BusinessException(ErrorCode.INVALID_HOMEWORK_SCORE);
        var before = SubmissionResponse.from(s);
        s.setScore(score); s.setFeedback(access.text(input.getFeedback()));
        s.setStatus(SubmissionStatus.GRADED); s.setGradedBy(actor.getId()); s.setGradedAt(access.now()); s.setUpdatedAt(access.now());
        submissions.flush();
        var response = SubmissionResponse.from(s);
        audit.submission(s.getId(), actor, revision ? "REVISE" : "GRADE", before, response, access.text(input.getReason()));
        Homework h = context.homework();
        notifications.send(s.getStudentId(), "HOMEWORK_GRADED", "Đã có điểm: " + h.getTitle(),
                "Điểm của bạn: " + plain(score) + "/" + plain(h.getMaxScore())
                        + (s.getFeedback() != null ? ". Gia sư có nhận xét cho bài làm." : "."),
                "/student/homework/" + h.getId());
        return detailed(s, false);
    }

    @Transactional
    public AttachmentResponse attach(Long homeworkId, MultipartFile file, User actor) {
        var context = access.lock(homeworkId);
        HomeworkSubmission s = ownInProgress(context, actor);
        var quiz = questions.of(homeworkId);
        if (!quiz.isEmpty() && !HomeworkQuestionService.hasEssay(quiz))
            throw new BusinessException(ErrorCode.ATTACHMENTS_NOT_ALLOWED);
        if (attachments.countBySubmissionId(s.getId()) >= MAX_ATTACHMENTS)
            throw new BusinessException(ErrorCode.ATTACHMENT_LIMIT_REACHED);
        if (file == null || file.isEmpty()) throw new BusinessException(ErrorCode.INVALID_ATTACHMENT);
        if (file.getSize() > MAX_ATTACHMENT_BYTES) throw new BusinessException(ErrorCode.ATTACHMENT_TOO_LARGE);
        byte[] data;
        try { data = file.getBytes(); }
        catch (IOException ex) { throw new BusinessException(ErrorCode.INVALID_ATTACHMENT); }
        // Trust the bytes, not the browser-supplied content type.
        String type = sniff(data);
        if (type == null) throw new BusinessException(ErrorCode.INVALID_ATTACHMENT);
        var stored = learningFiles.saveAndFlush(LearningFile.builder().fileKey(UUID.randomUUID()).ownerId(actor.getId())
                .fileName(fileName(file.getOriginalFilename(), type)).contentType(type).sizeBytes((long) data.length)
                .data(data).createdAt(access.now()).build());
        var saved = attachments.saveAndFlush(SubmissionAttachment.builder().submissionId(s.getId())
                .fileId(stored.getId()).uploadedAt(access.now()).build());
        var response = AttachmentResponse.builder().id(saved.getId()).fileName(stored.getFileName())
                .contentType(type).sizeBytes(data.length).uploadedAt(saved.getUploadedAt()).build();
        audit.submission(s.getId(), actor, "ATTACH", null, response, null);
        return response;
    }

    @Transactional
    public void detach(Long homeworkId, Long attachmentId, User actor) {
        var context = access.lock(homeworkId);
        HomeworkSubmission s = ownInProgress(context, actor);
        var attachment = attachments.findById(attachmentId)
                .filter(a -> a.getSubmissionId().equals(s.getId()))
                .orElseThrow(() -> new BusinessException(ErrorCode.ATTACHMENT_NOT_FOUND));
        var stored = learningFiles.findById(attachment.getFileId())
                .orElseThrow(() -> new BusinessException(ErrorCode.ATTACHMENT_NOT_FOUND));
        attachments.delete(attachment);
        attachments.flush(); // The link holds a foreign key to the file.
        learningFiles.delete(stored);
        audit.submission(s.getId(), actor, "DETACH", Map.of("id", attachmentId, "fileName", stored.getFileName()), null, null);
    }

    /** The owning student or the session's tutor/admin may read a file. */
    @Transactional(readOnly = true)
    public LearningFile download(Long attachmentId, User actor) {
        Long submissionId = attachments.findSubmissionId(attachmentId)
                .orElseThrow(() -> new BusinessException(ErrorCode.ATTACHMENT_NOT_FOUND));
        HomeworkSubmission s = submissions.findById(submissionId)
                .orElseThrow(() -> new BusinessException(ErrorCode.ATTACHMENT_NOT_FOUND));
        var context = access.find(s.getHomeworkId());
        if (access.isStudent(actor)) {
            if (!s.getStudentId().equals(actor.getId())) throw new BusinessException(ErrorCode.ATTACHMENT_NOT_FOUND);
            access.requireStudent(context.session(), actor);
        } else {
            access.requireWriter(context.session(), actor);
        }
        return attachments.findById(attachmentId).flatMap(a -> learningFiles.findById(a.getFileId()))
                .orElseThrow(() -> new BusinessException(ErrorCode.ATTACHMENT_NOT_FOUND));
    }

    private HomeworkSubmission ownInProgress(HomeworkAccessService.Context context, User actor) {
        access.requireStudent(context.session(), actor);
        access.requireVisible(context, actor);
        access.requireAccepting(context);
        HomeworkSubmission s = submissions.findByHomeworkIdAndStudentId(context.homework().getId(), actor.getId())
                .orElseThrow(() -> new BusinessException(ErrorCode.SUBMISSION_NOT_STARTED));
        entityManager.refresh(s, LockModeType.PESSIMISTIC_WRITE);
        if (s.getStatus() != SubmissionStatus.IN_PROGRESS) throw new BusinessException(ErrorCode.SUBMISSION_LOCKED);
        return s;
    }

    private void saveAnswers(HomeworkSubmission s, List<HomeworkQuestion> quiz, List<AnswerRequest> input) {
        Map<Long, HomeworkQuestion> byId = quiz.stream().collect(Collectors.toMap(HomeworkQuestion::getId, Function.identity()));
        Map<Long, HomeworkAnswer> saved = answers.findBySubmissionId(s.getId()).stream()
                .collect(Collectors.toMap(HomeworkAnswer::getQuestionId, Function.identity()));
        var seen = new HashSet<Long>();
        for (AnswerRequest in : input) {
            HomeworkQuestion q = byId.get(in.getQuestionId());
            if (q == null || !seen.add(q.getId())) throw new BusinessException(ErrorCode.INVALID_ANSWER);
            String text = access.text(in.getTextAnswer());
            if (q.getType() == QuestionType.MULTIPLE_CHOICE) {
                if (text != null || (in.getSelectedOption() != null && in.getSelectedOption() >= questions.options(q).size()))
                    throw new BusinessException(ErrorCode.INVALID_ANSWER);
            } else if (in.getSelectedOption() != null) {
                throw new BusinessException(ErrorCode.INVALID_ANSWER);
            }
            HomeworkAnswer a = saved.getOrDefault(q.getId(), HomeworkAnswer.builder().submissionId(s.getId()).questionId(q.getId()).build());
            a.setSelectedOption(in.getSelectedOption()); a.setTextAnswer(text); a.setScore(null);
            answers.save(a);
        }
        answers.flush();
    }

    /** Scores multiple-choice answers; without essay questions the quiz is final immediately. */
    private void autoGrade(HomeworkSubmission s, List<HomeworkQuestion> quiz) {
        Map<Long, HomeworkAnswer> given = answers.findBySubmissionId(s.getId()).stream()
                .collect(Collectors.toMap(HomeworkAnswer::getQuestionId, Function.identity()));
        BigDecimal total = BigDecimal.ZERO;
        for (HomeworkQuestion q : quiz) {
            if (q.getType() != QuestionType.MULTIPLE_CHOICE) continue;
            HomeworkAnswer a = given.get(q.getId());
            BigDecimal earned = a != null && Objects.equals(a.getSelectedOption(), q.getCorrectOption()) ? q.getPoints() : BigDecimal.ZERO;
            if (a != null) a.setScore(earned);
            total = total.add(earned);
        }
        answers.flush();
        s.setAutoScore(total);
        if (!HomeworkQuestionService.hasEssay(quiz)) {
            s.setStatus(SubmissionStatus.GRADED); s.setScore(total); s.setAutoGraded(true); s.setGradedAt(access.now());
        }
    }

    private BigDecimal score(HomeworkSubmission s, List<HomeworkQuestion> quiz, GradeSubmissionRequest input) {
        Map<Long, BigDecimal> given = input.getAnswerScores() == null ? Map.of() : input.getAnswerScores();
        if (quiz.isEmpty()) {
            if (!given.isEmpty()) throw new BusinessException(ErrorCode.INVALID_ANSWER_SCORES);
            if (input.getScore() == null) throw new BusinessException(ErrorCode.GRADE_SCORE_REQUIRED);
            return input.getScore();
        }
        var essays = quiz.stream().filter(q -> q.getType() == QuestionType.ESSAY).toList();
        if (!given.keySet().equals(essays.stream().map(HomeworkQuestion::getId).collect(Collectors.toSet())))
            throw new BusinessException(ErrorCode.INVALID_ANSWER_SCORES);
        Map<Long, HomeworkAnswer> saved = answers.findBySubmissionId(s.getId()).stream()
                .collect(Collectors.toMap(HomeworkAnswer::getQuestionId, Function.identity()));
        BigDecimal total = s.getAutoScore() == null ? BigDecimal.ZERO : s.getAutoScore();
        for (HomeworkQuestion q : essays) {
            BigDecimal points = given.get(q.getId());
            if (points.compareTo(q.getPoints()) > 0) throw new BusinessException(ErrorCode.INVALID_ANSWER_SCORES);
            // A skipped essay (answered only by photo, or blank) still gets a row to hold its score.
            HomeworkAnswer a = saved.getOrDefault(q.getId(), HomeworkAnswer.builder().submissionId(s.getId()).questionId(q.getId()).build());
            a.setScore(points);
            answers.save(a);
            total = total.add(points);
        }
        if (input.getScore() != null && input.getScore().compareTo(total) != 0)
            throw new BusinessException(ErrorCode.INVALID_ANSWER_SCORES);
        return total;
    }

    /** Per-question scores are hidden from the student until the work is graded. */
    private SubmissionResponse detailed(HomeworkSubmission s, boolean forStudent) {
        boolean withScores = !forStudent || s.getStatus() == SubmissionStatus.GRADED;
        return SubmissionResponse.from(s).toBuilder()
                .answers(answers.findBySubmissionId(s.getId()).stream().map(a -> AnswerResponse.from(a, withScores)).toList())
                .attachments(attachments.findInfo(List.of(s.getId())).stream().map(AttachmentResponse::from).toList())
                .build();
    }

    private void notifyTutor(HomeworkAccessService.Context context, HomeworkSubmission s, User student, boolean resubmission) {
        Long tutorId = access.tutorOf(context.session());
        if (tutorId == null) return;
        Homework h = context.homework();
        boolean late = s.getLateSeconds() != null;
        String message = student.getFullName() + (resubmission ? " đã nộp lại bài \"" : " đã nộp bài \"") + h.getTitle() + "\""
                + (late ? " trễ " + NotificationService.duration(s.getLateSeconds()) + " so với hạn nộp" : "")
                + (s.isAutoGraded() ? ". Hệ thống đã chấm trắc nghiệm: " + plain(s.getScore()) + "/" + plain(h.getMaxScore()) + "." : ".");
        notifications.send(tutorId, late ? "HOMEWORK_LATE_SUBMISSION" : "HOMEWORK_SUBMITTED",
                (late ? "Nộp bài trễ: " : "Bài nộp mới: ") + h.getTitle(), message, "/tutor/homeworks/" + h.getId());
    }

    private static String plain(BigDecimal value) { return value.stripTrailingZeros().toPlainString(); }

    static String sniff(byte[] b) {
        if (b.length >= 3 && (b[0] & 0xFF) == 0xFF && (b[1] & 0xFF) == 0xD8 && (b[2] & 0xFF) == 0xFF) return "image/jpeg";
        if (b.length >= 8 && (b[0] & 0xFF) == 0x89 && b[1] == 'P' && b[2] == 'N' && b[3] == 'G') return "image/png";
        if (b.length >= 12 && b[0] == 'R' && b[1] == 'I' && b[2] == 'F' && b[3] == 'F'
                && b[8] == 'W' && b[9] == 'E' && b[10] == 'B' && b[11] == 'P') return "image/webp";
        if (b.length >= 5 && b[0] == '%' && b[1] == 'P' && b[2] == 'D' && b[3] == 'F' && b[4] == '-') return "application/pdf";
        return null;
    }

    private static String fileName(String original, String type) {
        String name = original == null ? "" : original.replaceAll(".*[\\\\/]", "").replaceAll("[\\p{Cntrl}\"<>|:*?]", "_").trim();
        if (name.isEmpty()) name = "bai-lam." + switch (type) {
            case "image/png" -> "png"; case "image/webp" -> "webp"; case "application/pdf" -> "pdf"; default -> "jpg"; };
        return name.length() <= 200 ? name : name.substring(name.length() - 200);
    }
}
