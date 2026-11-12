package com.viettritutor.dto.roster;

import io.swagger.v3.oas.annotations.media.Schema;

import java.util.List;

@Schema(description = "Danh sách người học trong phòng học theo buổi học")
public record SessionRosterResponse(
        @Schema(description = "ID buổi học")
        Long sessionId,

        @Schema(description = "ID nhóm lớp")
        Long classGroupId,

        @Schema(description = "Tên khóa học")
        String courseTitle,

        @Schema(description = "Số thứ tự buổi học")
        int sessionNumber,

        @Schema(description = "ID gia sư phụ trách")
        Long tutorId,

        @Schema(description = "Tên gia sư phụ trách")
        String tutorName,

        @Schema(description = "Thông tin chi tiết gia sư phụ trách")
        SessionRosterTutor tutor,

        @Schema(description = "Danh sách học viên đăng ký trong buổi học")
        List<SessionRosterStudent> students
) {}
