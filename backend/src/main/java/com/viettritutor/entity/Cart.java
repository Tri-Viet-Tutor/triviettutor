package com.viettritutor.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name="carts")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Cart {
    @Id
    @GeneratedValue(strategy=GenerationType.IDENTITY)
    private Long id;
    @Column(name="student_id",nullable=false,unique=true)
    private Long studentId;
    @Column(nullable=false)
    private long version;
}
