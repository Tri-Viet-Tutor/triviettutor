package com.viettritutor.dto.roster;

import io.swagger.v3.oas.annotations.media.Schema;

@Schema(description = "Học viên trong buổi học")
public record SessionRosterStudent(
        @Schema(description = "ID học viên")
        Long studentId,

        @Schema(description = "Họ và tên học viên")
        String fullName,

        @Schema(description = "URL ảnh đại diện")
        String avatarUrl
) {}
