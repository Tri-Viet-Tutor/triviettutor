package com.viettritutor.dto.roster;

import io.swagger.v3.oas.annotations.media.Schema;

import java.util.List;

@Schema(description = "Danh sách học viên theo lớp học")
public record ClassRosterResponse(
        @Schema(description = "ID nhóm lớp")
        Long classGroupId,

        @Schema(description = "Mã lớp học")
        String classCode,

        @Schema(description = "Tên khóa học")
        String courseName,

        @Schema(description = "Tổng số học viên")
        int totalStudents,

        @Schema(description = "Danh sách chi tiết học viên")
        List<ClassStudentItem> students
) {}
