package com.viettritutor.controller;

import com.viettritutor.common.api.ApiResponse;
import com.viettritutor.dto.payment.*;
import com.viettritutor.entity.User;
import com.viettritutor.security.CurrentUser;
import com.viettritutor.service.VnpayRefundService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Min;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/admin")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
@Validated
public class VnpayRefundController {
    private final VnpayRefundService refunds;

    @PostMapping("/payments/{paymentId}/refund")
    public ApiResponse<RefundResponse> refund(@PathVariable @Min(1) Long paymentId, @Valid @RequestBody RefundRequest input,
            @RequestHeader(value = "Idempotency-Key", required = false) String key, @CurrentUser User admin) {
        return ApiResponse.ok(refunds.refund(paymentId, null, input, key, admin, false));
    }

    @PostMapping("/refunds/{refundId}/reconcile")
    public ApiResponse<RefundResponse> reconcile(@PathVariable @Min(1) Long refundId, @CurrentUser User admin) {
        return ApiResponse.ok(refunds.reconcile(refundId, admin));
    }

    @PostMapping("/refunds/{refundId}/retry")
    public ApiResponse<RefundResponse> retry(@PathVariable @Min(1) Long refundId, @CurrentUser User admin) {
        return ApiResponse.ok(refunds.retry(refundId, admin));
    }
}
