package com.viettritutor.controller;

import com.viettritutor.common.api.ApiResponse;
import com.viettritutor.dto.payment.EnrollmentResponse;
import com.viettritutor.entity.User;
import com.viettritutor.security.CurrentUser;
import com.viettritutor.service.EnrollmentService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/v1/enrollments")
@RequiredArgsConstructor
@Tag(name = "Enrollments", description = "Endpoints for student class enrollments")
public class EnrollmentController {

    private final EnrollmentService enrollmentService;

    @Operation(summary = "Xem danh sách các lớp học đã ghi danh thành công")
    @GetMapping("/my")
    @PreAuthorize("hasRole('STUDENT')")
    public ResponseEntity<ApiResponse<List<EnrollmentResponse>>> getMyEnrollments(@CurrentUser User actor) {
        List<EnrollmentResponse> responses = enrollmentService.getMyEnrollments(actor.getId());
        return ResponseEntity.ok(ApiResponse.ok(responses));
    }
}
