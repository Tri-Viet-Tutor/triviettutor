package com.viettritutor.dto.order;

import lombok.*;
import java.time.OffsetDateTime;
import java.util.List;
@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CartResponse {
    private Long id;
    private long cartVersion;
    private List<Item> items;
    @Getter
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Item { private Long id;
    private Long subjectId;
    private String subjectName;
    private OffsetDateTime addedAt; }
}
