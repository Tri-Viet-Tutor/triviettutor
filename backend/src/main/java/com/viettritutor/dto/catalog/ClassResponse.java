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
    private Long subjectId;
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
    private long reservedStudents;
    private long spotsLeft;
    private boolean full;
    /** Học phí 1 kèm 1 cả lớp = giá mỗi buổi × số buổi của lớp */
    private BigDecimal basePrice1on1;
    private BigDecimal pricePerSession;
    private BigDecimal estimatedFee;
    private BigDecimal discountRate;
    private String meetingUrl; // Admin responses only.
    /** Gia sư chính đang được phân công (null nếu chưa phân công). Admin responses only. */
    private Long tutorId;
    private String tutorName;
    /** Điểm đánh giá trung bình của gia sư (1-5, 2 chữ số thập phân); chưa có đánh giá thì null */
    private BigDecimal tutorRating;
    private long tutorRatingCount;
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
