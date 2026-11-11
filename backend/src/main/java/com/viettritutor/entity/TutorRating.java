package com.viettritutor.entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * Represents a review given by a student to a tutor.
 * This entity captures the rating and comment provided by the student for a specific tutor.
 * Each student can only leave one review per tutor, enforced by a unique constraint on the combination of studentId and tutorId.
 * ---------------------
 */

@Entity
@Table(
        name = "tutor_reviews",
        uniqueConstraints = {
                @UniqueConstraint(
                        name = "uk_tutor_review_student_class",
                        columnNames = {"student_id", "class_group_id"}
                )
        }
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class TutorRating {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "student_id", nullable = false)
    private User student;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "tutor_id", nullable = false)
    private User tutor;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "class_group_id", nullable = false)
    private ClassGroup classGroup;

    @DecimalMin("1.0")
    @DecimalMax("5.0")
    @Digits(integer = 1, fraction = 1)
    @Column(nullable = false, precision = 2, scale = 1)
    private BigDecimal rating;

    @Column(length = 2000)
    private String comment;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;
}
