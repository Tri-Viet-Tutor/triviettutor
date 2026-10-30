package com.viettritutor.controller;

import com.viettritutor.common.api.ApiResponse;
import com.viettritutor.dto.catalog.SubjectResponse;
import com.viettritutor.service.AdminCourseService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * Danh sách môn học (bảng subjects) cho mọi tài khoản đã đăng nhập.
 * Frontend dùng để dựng bộ lọc và lựa chọn môn theo dữ liệu thật thay vì danh sách viết cứng.
 */
@RestController
@RequestMapping("/api/v1/catalog/subjects")
@RequiredArgsConstructor
@Tag(name = "Subjects", description = "Public: guests and every signed-in role can read it.")
public class SubjectController {
    private final AdminCourseService adminCourseService;

    @GetMapping
    @Operation(summary = "List subjects", description = "Every subject code in the subjects table, sorted by code.")
    public ApiResponse<List<SubjectResponse>> list() {
        return ApiResponse.ok(adminCourseService.subjects());
    }
}
