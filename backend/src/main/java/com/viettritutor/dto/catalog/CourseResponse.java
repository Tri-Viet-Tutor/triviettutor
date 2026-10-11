package com.viettritutor.dto.catalog;

import com.viettritutor.entity.Course;
import com.viettritutor.enums.GradeLevel;
import lombok.Builder;
import lombok.Getter;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Getter
@Builder
public class CourseResponse {
    private Long id;
    private String name;
    private String subject;
    private GradeLevel gradeLevel;
    private BigDecimal basePrice1on1;
    private Integer totalSessions;
    private Integer durationMinutes;
    private String description;
    private boolean active;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public static CourseResponse from(Course course) {
        return CourseResponse.builder()
                .id(course.getId()).name(course.getName()).subject(course.getSubject())
                .gradeLevel(course.getGradeLevel()).basePrice1on1(course.getBasePrice1on1())
                .totalSessions(course.getTotalSessions()).durationMinutes(course.getDurationMinutes())
                .description(course.getDescription()).active(course.isActive())
                .createdAt(course.getCreatedAt()).updatedAt(course.getUpdatedAt())
                .build();
    }
}