package com.viettritutor.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.OffsetDateTime;

/** A tutor's complaint about one finalized payslip (PAYR-02). */
@Entity
@Table(name="payroll_disputes")
@Getter @Setter @Builder @NoArgsConstructor @AllArgsConstructor
public class PayrollDispute {
    @Id @GeneratedValue(strategy=GenerationType.IDENTITY) private Long id;
    @Column(name="payroll_line_id",nullable=false,unique=true) private Long payrollLineId;
    @Column(name="tutor_id",nullable=false) private Long tutorId;
    @Column(nullable=false,length=1000) private String reason;
    @Column(name="created_at",nullable=false) private OffsetDateTime createdAt;
}
