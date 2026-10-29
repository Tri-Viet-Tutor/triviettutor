package com.viettritutor.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.OffsetDateTime;
@Entity
@Table(name="cart_items",uniqueConstraints=@UniqueConstraint(columnNames={"cart_id","subject_id"}))
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CartItem {
    @Id
    @GeneratedValue(strategy=GenerationType.IDENTITY)
    private Long id;
    @Column(name="cart_id",nullable=false)
    private Long cartId;
    @Column(name="subject_id",nullable=false)
    private Long subjectId;
    @Column(name="added_at",nullable=false)
    private OffsetDateTime addedAt;
}
