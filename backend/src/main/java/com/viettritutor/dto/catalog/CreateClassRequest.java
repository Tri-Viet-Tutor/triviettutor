package com.viettritutor.dto.catalog;

import com.fasterxml.jackson.annotation.JsonAnySetter;
import com.viettritutor.enums.*;
import jakarta.validation.constraints.*;
import lombok.Data;
import java.time.LocalDate;

@Data
public class CreateClassRequest {

    @NotNull
    @Positive
    private Long courseId;

    @NotNull
    private ClassType classType;

    @NotNull
    private DeliveryMode deliveryMode;

    @NotNull
    private SchedulePattern schedulePattern;

    @NotNull
    private TimeSlot timeSlot;

    @NotNull
    private LocalDate startDate;
    private LocalDate enrollmentDeadline;

    @Size(max = 2048)
    private String meetingUrl;

    /** Số buổi của lớp (1 - 200); không gửi thì lấy số buổi gốc của khóa */
    @Positive
    @Max(200)
    private Integer totalSessions;

    /** Gia sư phụ trách, phân công ngay khi mở lớp để học viên chọn được thầy cô (tùy chọn) */
    @Positive
    private Long tutorId;

    @JsonAnySetter
    public void rejectUnknownField(String name, Object value) {
        throw new IllegalArgumentException("Unsupported class field: " + name);
    }
}
