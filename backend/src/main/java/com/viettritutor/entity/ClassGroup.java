package com.viettritutor.entity;

import com.viettritutor.enums.ClassStatus;
import com.viettritutor.enums.ClassType;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDate;

// The catalog module can extend this minimal assignment prerequisite.
@Entity
@Table(name = "class_groups")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ClassGroup {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Enumerated(EnumType.STRING)
    @Column(name = "class_type", nullable = false, length = 20)
    private ClassType classType;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private ClassStatus status;

    @Column(name = "enrollment_deadline")
    private LocalDate enrollmentDeadline;
}
