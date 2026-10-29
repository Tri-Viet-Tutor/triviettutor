package com.viettritutor.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name="subjects")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Subject {
    @Id
    @GeneratedValue(strategy=GenerationType.IDENTITY)
    private Long id;
    @Column(nullable=false,unique=true,length=100)
    private String name;
}
