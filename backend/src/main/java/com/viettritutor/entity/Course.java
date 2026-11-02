package com.viettritutor.entity;

import com.viettritutor.enums.GradeLevel;
import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;

@Entity
@Table(name = "courses")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Course {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 200)
    private String name;

    @Column(nullable = false, length = 100)
    private String subject;

    @Column(name = "subject_id", nullable = false)
    private Long subjectId;

    @Enumerated(EnumType.STRING)
    @Column(name = "grade_level", nullable = false, length = 20)
    private GradeLevel gradeLevel;

    @Column(name = "base_price_1on1", nullable = false, precision = 15, scale = 0)
    private BigDecimal basePrice1on1;

    @Column(name = "total_sessions", nullable = false)
    private Integer totalSessions;

    /**
     * Học phí 1 kèm 1 của một lớp có {@code sessions} buổi = giá khóa quy theo buổi × số buổi của lớp
     * (basePrice1on1 là giá cho totalSessions buổi; khóa mới lưu totalSessions = 1 nên basePrice1on1 là giá mỗi buổi).
     */
    public java.math.BigDecimal priceFor(Integer sessions) {
        if (sessions == null || totalSessions == null || totalSessions <= 0 || sessions.equals(totalSessions)) return basePrice1on1;
        return basePrice1on1.multiply(java.math.BigDecimal.valueOf(sessions))
                .divide(java.math.BigDecimal.valueOf(totalSessions), 0, java.math.RoundingMode.HALF_UP);
    }

    /** Học phí 1 kèm 1 cho một buổi */
    public java.math.BigDecimal pricePerSession() {
        return priceFor(1);
    }

    @Column(name = "duration_minutes", nullable = false)
    private Integer durationMinutes;

    @Column(columnDefinition = "text")
    private String description;

    @Builder.Default
    @Column(nullable = false)
    private boolean active = true;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now().truncatedTo(ChronoUnit.MICROS);
        updatedAt = createdAt;
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now().truncatedTo(ChronoUnit.MICROS);
    }
}