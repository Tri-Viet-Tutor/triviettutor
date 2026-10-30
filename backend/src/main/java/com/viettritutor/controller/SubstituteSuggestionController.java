package com.viettritutor.controller;

import com.viettritutor.common.api.ApiResponse;
import com.viettritutor.dto.assignment.AvailableTutorResponse;
import com.viettritutor.dto.assignment.TutorBoardResponse;
import com.viettritutor.service.TutorAssignmentService;
import com.viettritutor.service.TutorBoardService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.constraints.Min;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/v1/admin")
@PreAuthorize("hasRole('ADMIN')")
@RequiredArgsConstructor
@Validated
@Tag(name = "Session rescheduling")
public class SubstituteSuggestionController {
    private final TutorAssignmentService assignmentService;
    private final TutorBoardService boardService;

    @GetMapping("/sessions/{sessionId}/available-tutors")
    @Operation(summary = "Tutors who could substitute this session: conflicts and declared availability for that day")
    public ApiResponse<List<AvailableTutorResponse>> availableTutors(@PathVariable @Min(1) Long sessionId) {
        return ApiResponse.ok(assignmentService.availableSubstitutes(sessionId));
    }

    @GetMapping("/tutor-board")
    @Operation(summary = "Every tutor's declared free slots and teaching sessions between two dates (at most 31 days)")
    public ApiResponse<List<TutorBoardResponse>> tutorBoard(@RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
                                                         @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        return ApiResponse.ok(boardService.board(from, to));
    }
}
