package com.viettritutor.dto.notification;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.viettritutor.entity.Notification;
import lombok.Builder;
import lombok.Getter;
import java.time.OffsetDateTime;

@Getter
@Builder
@JsonInclude(JsonInclude.Include.NON_NULL)
public class NotificationResponse {
    private Long id;
    private String type;
    private String title;
    private String message;
    private String link;
    private OffsetDateTime createdAt;
    private OffsetDateTime readAt;

    public static NotificationResponse from(Notification n) {
        return NotificationResponse.builder().id(n.getId()).type(n.getType()).title(n.getTitle())
                .message(n.getMessage()).link(n.getLink()).createdAt(n.getCreatedAt()).readAt(n.getReadAt()).build();
    }
}
