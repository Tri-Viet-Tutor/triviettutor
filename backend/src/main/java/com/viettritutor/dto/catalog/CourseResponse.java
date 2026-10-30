package com.viettritutor.dto.catalog;

import com.viettritutor.entity.Course;
import com.viettritutor.enums.GradeLevel;
import lombok.Builder;
import lombok.Getter;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import com.viettritutor.service.PricingService;

@Getter
@Builder
public class CourseResponse {
    private Long id;
    private String name;
    private String subject;
    private Long subjectId;
    private GradeLevel gradeLevel;
    private BigDecimal basePrice1on1;
    private Integer totalSessions;
    private Integer durationMinutes;
    private String description;
    private boolean active;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    /** Học phí mỗi học viên theo bậc sĩ số (1 kèm 1, 2–3, 4–5, 6–8), tính từ học phí gốc bằng PricingService */
    private List<PricingService.PriceTier> priceTiers;
    /** Học phí 1 kèm 1 cho MỘT buổi; học phí lớp = giá này × số buổi của lớp (số buổi đặt ở từng lớp) */
    private java.math.BigDecimal pricePerSession;

    public static CourseResponse from(Course course) {
        return CourseResponse.builder()
                .id(course.getId()).name(course.getName()).subject(course.getSubject()).subjectId(course.getSubjectId())
                .gradeLevel(course.getGradeLevel()).basePrice1on1(course.getBasePrice1on1())
                .totalSessions(course.getTotalSessions()).durationMinutes(course.getDurationMinutes())
                .description(course.getDescription()).active(course.isActive())
                .createdAt(course.getCreatedAt()).updatedAt(course.getUpdatedAt())
                .priceTiers(PricingService.tiers(course.getBasePrice1on1()))
                .pricePerSession(course.pricePerSession())
                .build();
    }
}