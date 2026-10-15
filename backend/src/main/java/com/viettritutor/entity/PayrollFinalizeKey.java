package com.viettritutor.entity;
import jakarta.persistence.*;
import lombok.*;
@Entity @Table(name="payroll_finalize_keys")
@Getter @NoArgsConstructor @AllArgsConstructor
public class PayrollFinalizeKey {
    @Id @Column(name="request_key",length=100) private String requestKey;
    @Column(name="period_id",nullable=false) private Long periodId;
}
