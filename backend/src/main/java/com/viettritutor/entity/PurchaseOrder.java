package com.viettritutor.entity;

import jakarta.persistence.*;
import lombok.*;

import com.viettritutor.enums.OrderStatus;
import java.math.BigDecimal;
import java.time.OffsetDateTime;
@Entity
@Table(name="orders")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PurchaseOrder {
    @Id
    @GeneratedValue(strategy=GenerationType.IDENTITY)
    private Long id;
    @Column(name="student_id",nullable=false)
    private Long studentId;
    @Enumerated(EnumType.STRING)
    @Column(nullable=false,length=30)
    private OrderStatus status;
    @Column(name="total_amount",nullable=false,precision=18,scale=0)
    private BigDecimal totalAmount;
    @Column(name="refunded_amount",nullable=false,precision=18,scale=0)
    private BigDecimal refundedAmount;
    @Column(name="cart_version",nullable=false)
    private long cartVersion;
    @Column(name="created_at",nullable=false)
    private OffsetDateTime createdAt;
    @Column(name="expires_at",nullable=false)
    private OffsetDateTime expiresAt;
    @Column(name="paid_at")
    private OffsetDateTime paidAt;
    @Column(name="cancelled_at")
    private OffsetDateTime cancelledAt;
    @Column(name="cancellation_reason",length=1000)
    private String cancellationReason;
}
