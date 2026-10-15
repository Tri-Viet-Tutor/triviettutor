package com.viettritutor.entity;
import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;

@Entity
@Table(name="payroll_lines",uniqueConstraints=@UniqueConstraint(columnNames={"period_id","tutor_id"}))
@Getter @Setter @Builder @NoArgsConstructor @AllArgsConstructor
public class PayrollLine {
    @Id @GeneratedValue(strategy=GenerationType.IDENTITY) private Long id;
    @Column(name="period_id",nullable=false) private Long periodId;
    @Column(name="tutor_id",nullable=false) private Long tutorId;
    @Column(name="tutor_name",nullable=false) private String tutorName;
    @Column(name="base_salary",nullable=false,precision=15,scale=0) private BigDecimal baseSalary;
    @Column(name="session_rate",nullable=false,precision=15,scale=0) private BigDecimal sessionRate;
    @Column(name="valid_sessions",nullable=false) private int validSessions;
    @Column(name="session_pay",nullable=false,precision=30,scale=0) private BigDecimal sessionPay;
    @Column(name="total_pay",nullable=false,precision=30,scale=0) private BigDecimal totalPay;
    @Column(nullable=false,columnDefinition="text") private String reconciliation;
}
