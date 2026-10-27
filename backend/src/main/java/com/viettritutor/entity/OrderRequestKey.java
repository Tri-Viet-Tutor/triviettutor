package com.viettritutor.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name="order_request_keys",uniqueConstraints=@UniqueConstraint(columnNames={"actor_id","operation","request_key"}))
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class OrderRequestKey {
    @Id
    @GeneratedValue(strategy=GenerationType.IDENTITY)
    private Long id;
    @Column(name="actor_id",nullable=false)
    private Long actorId;
    @Column(nullable=false,length=20)
    private String operation;
    @Column(name="request_key",nullable=false,length=100)
    private String requestKey;
    @Column(nullable=false,length=64)
    private String fingerprint;
    @Column(name="order_id",nullable=false)
    private Long orderId;
    @Column(nullable=false,columnDefinition="text")
    private String response;
}
