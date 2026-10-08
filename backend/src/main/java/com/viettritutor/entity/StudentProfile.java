package com.viettritutor.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "student_profiles")
@Getter
@Setter
@NoArgsConstructor
public class StudentProfile {
    @Id
    private Long id;

    @MapsId
    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "id")
    private User user;

    @Column(length = 20)
    private String phone;

    @Column(columnDefinition = "text")
    private String address;
}
