package com.viettritutor.controller;

import com.viettritutor.common.api.*;
import com.viettritutor.dto.learning.*;
import com.viettritutor.entity.User;
import com.viettritutor.enums.SubmissionStatus;
import com.viettritutor.security.CurrentUser;
import com.viettritutor.service.SubmissionService;
import io.swagger.v3.oas.annotations.*;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Positive;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1")
@RequiredArgsConstructor
@Tag(name = "Homework submissions", description = "NOT_STARTED -> IN_PROGRESS -> SUBMITTED -> GRADED, independently per student.")
@io.swagger.v3.oas.annotations.responses.ApiResponses({
    @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "409", description = "Stale version; reload the record",
        content = @io.swagger.v3.oas.annotations.media.Content(mediaType = "application/json",
            examples = @io.swagger.v3.oas.annotations.media.ExampleObject(value = "{\"success\":false,\"message\":\"The record has changed; reload its current version\",\"errorCode\":\"LEARNING_VERSION_CONFLICT\"}"))),
    @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "422", description = "The state or deadline does not permit this action",
        content = @io.swagger.v3.oas.annotations.media.Content(mediaType = "application/json",
            examples = @io.swagger.v3.oas.annotations.media.ExampleObject(value = "{\"success\":false,\"message\":\"The homework deadline has been reached\",\"errorCode\":\"HOMEWORK_DEADLINE_PASSED\"}")))
})
public class SubmissionController {
    private final SubmissionService submissions;

    @PostMapping("/homeworks/{homeworkId}/submissions/me/start")
    @PreAuthorize("hasRole('STUDENT')")
    @Operation(summary = "Start homework", description = "Creates one IN_PROGRESS record for the authenticated enrolled student. Repeated starts while IN_PROGRESS return the same record.")
    public ApiResponse<SubmissionResponse> start(@PathVariable @Positive Long homeworkId,
            @Parameter(hidden = true) @CurrentUser User actor) {
        return ApiResponse.ok(submissions.start(homeworkId, actor));
    }

    @PutMapping("/homeworks/{homeworkId}/submissions/me/draft")
    @PreAuthorize("hasRole('STUDENT')")
    @Operation(summary = "Save the student's draft", description = "Requires IN_PROGRESS, published homework, a future deadline and current version. Does not submit the work.")
    public ApiResponse<SubmissionResponse> draft(@PathVariable @Positive Long homeworkId,
            @Valid @RequestBody SubmissionRequest input, @Parameter(hidden = true) @CurrentUser User actor) {
        return ApiResponse.ok(submissions.save(homeworkId, input, actor, false));
    }

    @PutMapping("/homeworks/{homeworkId}/submissions/me")
    @PreAuthorize("hasRole('STUDENT')")
    @Operation(summary = "Submit or update the student's work", description = "Start first; provide content or HTTPS resourceUrl and current version. SUBMITTED may be updated before dueAt while homework is PUBLISHED and not yet graded. GRADED is locked; each update requires the current version. Does not close homework.")
    public ApiResponse<SubmissionResponse> submit(@PathVariable @Positive Long homeworkId,
            @Valid @RequestBody SubmissionRequest input, @Parameter(hidden = true) @CurrentUser User actor) {
        return ApiResponse.ok(submissions.save(homeworkId, input, actor, true));
    }

    @GetMapping("/homeworks/{homeworkId}/submissions/me")
    @PreAuthorize("hasRole('STUDENT')")
    @Operation(summary = "Read my draft, submission or grade", description = "Returns NOT_STARTED without creating a database row when the student has not started.")
    public ApiResponse<SubmissionResponse> mine(@PathVariable @Positive Long homeworkId,
            @Parameter(hidden = true) @CurrentUser User actor) {
        return ApiResponse.ok(submissions.mine(homeworkId, actor));
    }

    @GetMapping("/homeworks/{homeworkId}/submissions")
    @PreAuthorize("hasAnyRole('ADMIN', 'TUTOR')")
    @Operation(summary = "List submitted work for grading", description = "Current session tutor or Admin only. Private drafts are excluded. Filter by SUBMITTED/GRADED, page >= 0, size 1-100.")
    public ApiResponse<PageResponse<SubmissionResponse>> list(@PathVariable @Positive Long homeworkId,
            @RequestParam(required = false) SubmissionStatus status, @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size, @Parameter(hidden = true) @CurrentUser User actor) {
        return ApiResponse.ok(submissions.list(homeworkId, status, page, size, actor));
    }

    @PatchMapping("/submissions/{submissionId}/grade")
    @PreAuthorize("hasAnyRole('ADMIN', 'TUTOR')")
    @Operation(summary = "Grade submitted work", description = "Score 0..maxScore. Allowed after deadline and when homework is CLOSED. Only Admin can revise an existing grade, with reason and current version; every change is audited.")
    public ApiResponse<SubmissionResponse> grade(@PathVariable @Positive Long submissionId,
            @Valid @RequestBody GradeSubmissionRequest input, @Parameter(hidden = true) @CurrentUser User actor) {
        return ApiResponse.ok(submissions.grade(submissionId, input, actor));
    }
}
