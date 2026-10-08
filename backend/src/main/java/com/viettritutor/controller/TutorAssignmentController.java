package com.viettritutor.controller;

import com.viettritutor.common.api.ApiResponse;
import com.viettritutor.dto.assignment.*;
import com.viettritutor.entity.User;
import com.viettritutor.security.CurrentUser;
import com.viettritutor.service.TutorAssignmentService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Min;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/admin/classes/{classId}")
@PreAuthorize("hasRole('ADMIN')")
@RequiredArgsConstructor
@Validated
@Tag(name = "Tutor assignments")
public class TutorAssignmentController {
    private final TutorAssignmentService assignmentService;

    @GetMapping("/available-tutors")
    @Operation(summary = "Suggest tutors with actual conflicts and declared availability coverage",
            description = "Available tutors are ranked first. Availability is advisory; assignments recheck actual sessions.")
    public ApiResponse<List<AvailableTutorResponse>> availableTutors(@PathVariable @Min(1) Long classId) {
        return ApiResponse.ok(assignmentService.availableTutors(classId));
    }

    @PostMapping("/assign")
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(summary = "Assign a primary tutor to an eligible class")
    public ApiResponse<AssignmentResponse> assign(@PathVariable @Min(1) Long classId,
                                                @Valid @RequestBody AssignTutorRequest request,
                                                @CurrentUser User admin) {
        return ApiResponse.ok(assignmentService.assign(classId, request.tutorId(), admin));
    }

    @PutMapping("/reassign")
    @Operation(summary = "Change the primary tutor, retaining history and future substitute tutors")
    public ApiResponse<AssignmentResponse> reassign(@PathVariable @Min(1) Long classId,
                                                  @Valid @RequestBody ReassignTutorRequest request,
                                                  @CurrentUser User admin) {
        return ApiResponse.ok(assignmentService.reassign(classId, request.tutorId(), request.reason(), admin));
    }
}
