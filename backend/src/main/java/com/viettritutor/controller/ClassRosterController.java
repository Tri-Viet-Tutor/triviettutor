package com.viettritutor.controller;

import com.viettritutor.common.api.ApiResponse;
import com.viettritutor.dto.roster.ClassRosterResponse;
import com.viettritutor.dto.roster.SessionRosterResponse;
import com.viettritutor.entity.User;
import com.viettritutor.security.CurrentUser;
import com.viettritutor.service.ClassRosterService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.constraints.Min;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1")
@RequiredArgsConstructor
@Validated
@Slf4j
@Tag(name = "Class Roster", description = "Quản lý danh sách học viên theo lớp và trong phòng học (Bảo vệ thông tin cá nhân)")
public class ClassRosterController {

    private final ClassRosterService classRosterService;

    @GetMapping("/classes/{classGroupId}/roster")
    @PreAuthorize("hasAnyRole('ADMIN', 'TUTOR')")
    @Operation(summary = "Lấy danh sách học viên trong lớp (Gia sư và Admin, không rò rỉ SĐT/Email)")
    public ApiResponse<ClassRosterResponse> getClassRoster(
            @Parameter(description = "ID nhóm lớp", required = true)
            @PathVariable @Min(1) Long classGroupId,
            @CurrentUser User currentUser) {
        log.info("User {} ({}) requesting roster for class {}", currentUser.getId(), currentUser.getRole(), classGroupId);
        return ApiResponse.ok(classRosterService.getClassRoster(classGroupId, currentUser));
    }

    @GetMapping("/sessions/{sessionId}/roster")
    @PreAuthorize("hasAnyRole('ADMIN', 'TUTOR', 'STUDENT')")
    @Operation(summary = "Lấy danh sách người học trong phòng học theo buổi học")
    public ApiResponse<SessionRosterResponse> getSessionRoster(
            @Parameter(description = "ID buổi học", required = true)
            @PathVariable @Min(1) Long sessionId,
            @CurrentUser User currentUser) {
        log.info("User {} ({}) requesting session roster for session {}", currentUser.getId(), currentUser.getRole(), sessionId);
        return ApiResponse.ok(classRosterService.getSessionRoster(sessionId, currentUser));
    }
}
