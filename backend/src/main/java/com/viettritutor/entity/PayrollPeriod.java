package com.viettritutor.entity;
import com.viettritutor.enums.PayrollStatus;
import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.OffsetDateTime;

@Entity
@Table(name="payroll_periods", uniqueConstraints={
    @UniqueConstraint(columnNames={"year_no","month_no"}), @UniqueConstraint(columnNames="idempotency_key")})
@Getter @Setter @Builder @NoArgsConstructor @AllArgsConstructor
public class PayrollPeriod {
    @Id @GeneratedValue(strategy=GenerationType.IDENTITY) private Long id;
    @Column(name="year_no",nullable=false) private int year;
    @Column(name="month_no",nullable=false) private int month;
    @Enumerated(EnumType.STRING) @Column(nullable=false,length=20) private PayrollStatus status;
    @Column(name="total_payroll",nullable=false,precision=38,scale=0) private BigDecimal totalPayroll;
    @Column(name="finalized_by",nullable=false) private Long finalizedBy;
    @Column(name="finalized_at",nullable=false) private OffsetDateTime finalizedAt;
    @Column(name="idempotency_key",nullable=false,length=100) private String idempotencyKey;
}
