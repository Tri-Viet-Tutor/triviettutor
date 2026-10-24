package com.viettritutor.entity;
import jakarta.persistence.*;
import lombok.*;
@Entity @Table(name="payroll_mutex")
@Getter @NoArgsConstructor @AllArgsConstructor
public class PayrollMutex { @Id private Long id; }
