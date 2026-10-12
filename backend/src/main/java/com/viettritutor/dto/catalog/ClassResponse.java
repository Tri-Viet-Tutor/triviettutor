package com.viettritutor.dto.catalog;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.viettritutor.enums.*;
import lombok.Builder;
import lombok.Getter;
import java.math.BigDecimal;
import java.time.*;
import java.util.List;

@Getter
@Builder
@JsonInclude(JsonInclude.Include.NON_NULL)
public class ClassResponse {
    private Long id;
    private String classCode;
    private Long courseId;
    private String courseName;
    private String subject;
    private GradeLevel gradeLevel;
    private ClassType classType;
    private DeliveryMode deliveryMode;
    private SchedulePattern schedulePattern;
    private TimeSlot timeSlot;
    private String timeSlotLabel;
    private LocalDate startDate;
    private LocalDate enrollmentDeadline;
    private ClassStatus status;
    private int totalSessions;
    private int maxStudents;
    private long currentStudents;
    private long spotsLeft;
    private boolean full;
    private BigDecimal basePrice1on1;
    private BigDecimal estimatedFee;
    private BigDecimal discountRate;
    private String meetingUrl; // Admin responses only.
    private LocalDateTime createdAt;
    private List<SessionPreview> sessions;

    @Getter
    @Builder
    public static class SessionPreview {
        private Long id;
        private int sessionNumber;
        private LocalDate date;
        private LocalTime startTime;
        private LocalTime endTime;
        private SessionStatus status;
    }
}
