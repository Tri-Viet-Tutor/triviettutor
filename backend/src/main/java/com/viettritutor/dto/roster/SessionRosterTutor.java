package com.viettritutor.dto.roster;

import io.swagger.v3.oas.annotations.media.Schema;

@Schema(description = "Thông tin gia sư trong buổi học")
public record SessionRosterTutor(
        @Schema(description = "ID gia sư")
        Long tutorId,

        @Schema(description = "Họ và tên gia sư")
        String fullName
) {}
