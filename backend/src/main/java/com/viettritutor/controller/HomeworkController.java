package com.viettritutor.controller;

import com.viettritutor.common.api.*;
import com.viettritutor.dto.learning.*;
import com.viettritutor.entity.User;
import com.viettritutor.security.CurrentUser;
import com.viettritutor.service.HomeworkService;
import io.swagger.v3.oas.annotations.*;
import io.swagger.v3.oas.annotations.tags.Tag;
import com.viettritutor.enums.SubmissionStatus;
import java.time.OffsetDateTime;
import org.springframework.format.annotation.DateTimeFormat;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Positive;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1")
@RequiredArgsConstructor
@PreAuthorize("hasAnyRole('ADMIN', 'TUTOR', 'STUDENT')")
@Tag(name = "Homeworks", description = "Homework lifecycle is independent of each student's submission lifecycle.")
@io.swagger.v3.oas.annotations.responses.ApiResponses({
    @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "409", description = "Stale version; reload the record",
        content = @io.swagger.v3.oas.annotations.media.Content(mediaType = "application/json",
            examples = @io.swagger.v3.oas.annotations.media.ExampleObject(value = "{\"success\":false,\"message\":\"The record has changed; reload its current version\",\"errorCode\":\"LEARNING_VERSION_CONFLICT\"}"))),
    @io.swagger.v3.oas.annotations.responses.ApiResponse(responseCode = "422", description = "The state or deadline does not permit this action",
        content = @io.swagger.v3.oas.annotations.media.Content(mediaType = "application/json",
            examples = @io.swagger.v3.oas.annotations.media.ExampleObject(value = "{\"success\":false,\"message\":\"The homework deadline has been reached\",\"errorCode\":\"HOMEWORK_DEADLINE_PASSED\"}")))
})
public class HomeworkController {
    private final HomeworkService homeworks;

    @PostMapping("/sessions/{sessionId}/homeworks")
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasAnyRole('ADMIN', 'TUTOR')")
    @Operation(summary = "Create draft homework", description = "Admin or current session tutor only. Future dueAt required. Cancelled sessions reject creation.")
    public ApiResponse<HomeworkResponse> create(@PathVariable @Positive Long sessionId,
            @Valid @RequestBody HomeworkRequest input, @Parameter(hidden = true) @CurrentUser User actor) {
        return ApiResponse.ok(homeworks.create(sessionId, input, actor));
    }

    @PutMapping("/homeworks/{homeworkId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'TUTOR')")
    @Operation(summary = "Update homework with its current version",
            description = "DRAFT allows all fields. PUBLISHED only allows extending dueAt or increasing maxScore; resubmit unchanged content. CLOSED and expired homework cannot be edited. Stale version returns 409.")
    public ApiResponse<HomeworkResponse> update(@PathVariable @Positive Long homeworkId,
            @Valid @RequestBody HomeworkUpdateRequest input, @Parameter(hidden = true) @CurrentUser User actor) {
        return ApiResponse.ok(homeworks.update(homeworkId, input, actor));
    }

    @PatchMapping("/homeworks/{homeworkId}/status")
    @PreAuthorize("hasAnyRole('ADMIN', 'TUTOR')")
    @Operation(summary = "Publish or close homework",
            description = "DRAFT -> PUBLISHED -> CLOSED or DRAFT -> CLOSED. Requires current version. No reopening; expiry never automatically closes homework. Closing does not prevent grading submitted work.")
    public ApiResponse<HomeworkResponse> status(@PathVariable @Positive Long homeworkId,
            @Valid @RequestBody HomeworkStatusRequest input, @Parameter(hidden = true) @CurrentUser User actor) {
        return ApiResponse.ok(homeworks.changeStatus(homeworkId, input, actor));
    }

    @GetMapping("/sessions/{sessionId}/homeworks")
    @Operation(summary = "List session homework by object permissions",
            description = "Admin/current tutor see all; enrolled students see only previously published work. page is zero-based, size 1-100.")
    public ApiResponse<PageResponse<HomeworkResponse>> list(@PathVariable @Positive Long sessionId,
            @RequestParam(defaultValue = "0") int page, @RequestParam(defaultValue = "20") int size,
            @Parameter(hidden = true) @CurrentUser User actor) {
        return ApiResponse.ok(homeworks.list(sessionId, page, size, actor));
    }

    @GetMapping("/student/homeworks")
    @PreAuthorize("hasRole('STUDENT')")
    @Operation(summary = "List homework from the student's enrolled classes",
            description = "Student identity comes from JWT. Only previously published homework in ACTIVE enrollments covering the session date. status filters the student's work state, including virtual NOT_STARTED. from/to are inclusive dueAt bounds with timezone. Ordered by dueAt then id; page >= 0, size 1-100. Expired/closed homework remains readable.")
    public ApiResponse<PageResponse<StudentHomeworkResponse>> listForStudent(
            @RequestParam(required = false) SubmissionStatus status,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) OffsetDateTime from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) OffsetDateTime to,
            @RequestParam(defaultValue = "0") int page, @RequestParam(defaultValue = "20") int size,
            @Parameter(hidden = true) @CurrentUser User actor) {
        return ApiResponse.ok(homeworks.listForStudent(status, from, to, page, size, actor));
    }

    @GetMapping("/homeworks/{homeworkId}")
    @Operation(summary = "Read homework", description = "Admin/current tutor or ACTIVE enrolled student for the session date. Unpublished work returns 404 to students.")
    public ApiResponse<HomeworkResponse> get(@PathVariable @Positive Long homeworkId,
            @Parameter(hidden = true) @CurrentUser User actor) {
        return ApiResponse.ok(homeworks.get(homeworkId, actor));
    }
}
