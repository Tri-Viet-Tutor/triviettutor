package com.viettritutor.dto.roster;

import com.viettritutor.enums.EnrollmentStatus;
import io.swagger.v3.oas.annotations.media.Schema;

import java.math.BigDecimal;
import java.time.OffsetDateTime;

@Schema(description = "Thông tin học viên trong danh sách lớp - Đã lọc bỏ thông tin liên hệ cá nhân")
public record ClassStudentItem(
        @Schema(description = "ID học viên")
        Long studentId,

        @Schema(description = "Họ và tên học viên")
        String fullName,

        @Schema(description = "URL ảnh đại diện")
        String avatarUrl,

        @Schema(description = "Trạng thái ghi danh")
        EnrollmentStatus status,

        @Schema(description = "Thời gian ghi danh")
        OffsetDateTime enrolledAt,

        @Schema(description = "Số buổi đã tham gia học")
        int attendedSessions,

        @Schema(description = "Tổng số buổi của khóa học")
        int totalSessions,

        @Schema(description = "Học phí đã thanh toán (chỉ hiển thị cho Admin, ẩn đối với Gia sư)")
        BigDecimal feeCharged
) {}
