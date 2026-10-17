package com.viettritutor.dto.order;

import com.viettritutor.enums.OrderStatus;
import com.viettritutor.dto.payment.PaymentResponse;
import lombok.*;
import java.time.OffsetDateTime;
import java.math.BigDecimal;
import java.util.List;
@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class OrderResponse {
    private Long id;
    private Long studentId;
    private OrderStatus status;
    private BigDecimal totalAmount;
    private BigDecimal refundedAmount;
    private String currency;
    private long cartVersion;
    private OffsetDateTime createdAt;
    private OffsetDateTime expiresAt;
    private OffsetDateTime paidAt;
    private OffsetDateTime cancelledAt;
    private String cancellationReason;
    private List<Item> items;
    private List<PaymentResponse> payments;
    @Getter
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Item {
        private Long id;
        private Long cartItemId;
        private Long subjectId;
        private Long courseId;
        private Long classId;
        private String subjectName;
        private String courseName;
        private String classCode;
        private BigDecimal unitPrice;
        private Long paymentId;
        private Long enrollmentId;
    }
}
