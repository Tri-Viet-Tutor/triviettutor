
package com.viettritutor.controller;

import com.viettritutor.common.api.ApiResponse;
import com.viettritutor.dto.assignment.AvailableTutorResponse;
import com.viettritutor.dto.assignment.TutorScheduleAvailabilityRequest;
import com.viettritutor.service.TutorAssignmentService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/admin/tutors")
@PreAuthorize("hasRole('ADMIN')")
@RequiredArgsConstructor
@Tag(name = "Admin tutor availability")
public class AdminTutorAvailabilityController {

    private final TutorAssignmentService assignmentService;

    @PostMapping("/available")
    @Operation(
            summary = "Find available tutors for a proposed class schedule",
            description = "Find tutors who can teach a new class based on its proposed schedule, before the class is created."
    )
    public ApiResponse<List<AvailableTutorResponse>> availableTutors(
            @Valid @RequestBody TutorScheduleAvailabilityRequest request
    ) {
        return ApiResponse.ok(
                assignmentService.availableTutorsForSchedule(request)
        );
    }
}
