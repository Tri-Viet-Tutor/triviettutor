package com.viettritutor.entity;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;

@Entity
@Table(name = "tutor_profiles")
@Getter
@Setter
@NoArgsConstructor
public class TutorProfile {
    @Id
    private Long id;

    @MapsId
    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "id")
    private User user;

    @Column(name = "base_salary", nullable = false, precision = 15, scale = 0)
    private BigDecimal baseSalary = BigDecimal.ZERO;

    @Column(name = "session_rate", nullable = false, precision = 15, scale = 0)
    private BigDecimal sessionRate = BigDecimal.ZERO;

    @Column(columnDefinition = "text")
    private String bio;
}
