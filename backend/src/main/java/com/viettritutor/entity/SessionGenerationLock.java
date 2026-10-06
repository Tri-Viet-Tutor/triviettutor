package com.viettritutor.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "session_generation_locks")
@Getter
@NoArgsConstructor
@AllArgsConstructor
public class SessionGenerationLock {

    @Id
    @Column(name = "class_group_id")
    private Long classGroupId;
}
