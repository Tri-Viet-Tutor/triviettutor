package com.viettritutor.entity;

import jakarta.persistence.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.OffsetDateTime;

/** Adapted from Bike Exchange Wallet; VND uses exact decimal arithmetic. */
@Entity @Table(name = "wallets")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class Wallet {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Column(name = "student_id", nullable = false, unique = true)
    private Long studentId;
    @Column(nullable = false, precision = 15, scale = 0)
    private BigDecimal balance;
    @Column(name = "created_at", nullable = false)
    private OffsetDateTime createdAt;
}
