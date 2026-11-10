package com.viettritutor.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.OffsetDateTime;

/** One admin-editable setting (ATT-01, AI-01). Secret values hold ciphertext, never plain text. */
@Entity
@Table(name="app_settings")
@Getter @Setter @Builder @NoArgsConstructor @AllArgsConstructor
public class AppSetting {
    @Id @Column(name="setting_key",length=100) private String key;
    @Column(name="setting_value",columnDefinition="text") private String value;
    @Column(name="updated_by") private Long updatedBy;
    @Column(name="updated_at",nullable=false) private OffsetDateTime updatedAt;
}
