package com.viettritutor.entity;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
@Entity
@Table(name="order_items",uniqueConstraints={@UniqueConstraint(columnNames={"order_id","class_id"}),@UniqueConstraint(columnNames={"order_id","cart_item_id"})})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class OrderItem {
    @Id
    @GeneratedValue(strategy=GenerationType.IDENTITY)
    private Long id;
    @Column(name="order_id",nullable=false)
    private Long orderId;
    @Column(name="cart_item_id",nullable=false)
    private Long cartItemId;
    @Column(name="subject_id",nullable=false)
    private Long subjectId;
    @Column(name="course_id",nullable=false)
    private Long courseId;
    @Column(name="class_id",nullable=false)
    private Long classId;
    @Column(name="subject_name",nullable=false,length=100)
    private String subjectName;
    @Column(name="course_name",nullable=false,length=200)
    private String courseName;
    @Column(name="class_code",length=200)
    private String classCode;
    @Column(name="unit_price",nullable=false,precision=15,scale=0)
    private BigDecimal unitPrice;
    /** Discount behind unitPrice at checkout; null on items created before V23. */
    @Column(name="discount_rate",precision=4,scale=3)
    private BigDecimal discountRate;
    @Column(name="payment_id",unique=true)
    private Long paymentId;
    @Column(name="enrollment_id",unique=true)
    private Long enrollmentId;
}
