package com.viettritutor.controller;

import com.viettritutor.common.api.*;
import com.viettritutor.dto.catalog.ClassResponse;
import com.viettritutor.entity.User;
import com.viettritutor.enums.*;
import com.viettritutor.security.CurrentUser;
import com.viettritutor.service.ClassQueryService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.constraints.Positive;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/catalog/classes")
@RequiredArgsConstructor
@Tag(name = "Class catalog", description = "Public: guests and every signed-in role can read it.")
public class CatalogController {
    private final ClassQueryService query;

    @GetMapping
    @Operation(summary = "List open classes and estimated fees",
            description = "Only ENROLLING classes with available seats, an active course and an unexpired deadline. A signed-in student does not see classes they already hold an ACTIVE seat in. tutorId keeps only classes whose active tutor is that tutor; each class shows its assigned tutor. Discount uses the next seat: 20% for group seats 1-3 (first seat is provisional policy), 35% for 4-5, 40% for 6-8; one-on-one has no discount.")
    public ApiResponse<PageResponse<ClassResponse>> list(

            @RequestParam(required = false) String subject,
            @RequestParam(required = false) GradeLevel gradeLevel,
            @RequestParam(required = false) DeliveryMode deliveryMode,
            @RequestParam(required = false) SchedulePattern schedulePattern,
            @RequestParam(required = false) TimeSlot timeSlot,
            @RequestParam(required = false) @Positive Long tutorId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @CurrentUser User viewer) {
        // Học viên đã đăng nhập không thấy lại các lớp mình đang học (đã giữ chỗ ACTIVE)
        Long studentId = viewer != null && isStudent(viewer) ? viewer.getId() : null;
        return ApiResponse.ok(query.catalog(subject, gradeLevel, deliveryMode, schedulePattern, timeSlot, studentId, tutorId, page, size));
    }

    @GetMapping("/{classId}")
    @Operation(summary = "View a published class, timetable and remaining seats",
            description = "Does not expose meeting links, student identities or financial evidence. Draft, failed, cancelled or hidden-course classes return 404, as does a full ENROLLING class for anyone who does not hold a seat in it.")
    public ApiResponse<ClassResponse> detail(@PathVariable @Positive Long classId, @CurrentUser User viewer) {
        // Lớp đang tuyển đã đủ chỗ: chỉ người đang có chỗ / đang giữ chỗ trong lớp mới xem được
        Long viewerId = viewer == null ? null : viewer.getId();
        boolean staff = viewer != null && !isStudent(viewer);
        return ApiResponse.ok(query.detail(classId, viewerId, staff));
    }

    /** Vai trò lưu dạng "ROLE_STUDENT" (hoặc "STUDENT") */
    private static boolean isStudent(User user) {
        return user.getRole() != null && user.getRole().toUpperCase(java.util.Locale.ROOT).endsWith("STUDENT");
    }
}
