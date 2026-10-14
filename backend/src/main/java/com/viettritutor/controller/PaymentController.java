package com.viettritutor.controller;

import com.viettritutor.common.api.*;
import com.viettritutor.dto.payment.*;
import com.viettritutor.entity.User;
import com.viettritutor.enums.PaymentStatus;
import com.viettritutor.security.CurrentUser;
import com.viettritutor.service.*;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;

@RestController
@RequestMapping("/api/v1")
@RequiredArgsConstructor
@Validated
@Tag(name = "Tuition payments")
public class PaymentController {
    private final PaymentIntentService intents;
    private final PaymentReadService reads;

    @PostMapping("/payment-intents")
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasRole('STUDENT')")
    @Operation(summary = "Quote the fixed server course price for one class",
            description = "Idempotency-Key is required. The quote lasts 5 minutes by default. Starting VNPay reserves a seat until expiry; quoting alone does not. Discounts are not applied.")
    public ApiResponse<PaymentIntentResponse> create(@Valid @RequestBody CreatePaymentIntentRequest input,
                                                     @RequestHeader(value = "Idempotency-Key", required = false) String key,
                                                     @CurrentUser User student) {
        return ApiResponse.ok(intents.create(input.classGroupId(), key, student));
    }

    @PostMapping("/payment-intents/{intentId}/confirm-mock")
    @PreAuthorize("hasRole('STUDENT')")
    @Operation(summary = "Confirm an owned intent using server-controlled demo payment",
            description = "Requires Idempotency-Key and explicitly enabled mock payments in dev/demo/test. Checks price, capacity and student conflicts again. Only successful payment creates enrollment and grants the learning schedule.")
    public ApiResponse<PaymentConfirmationResponse> confirm(@PathVariable @Min(1) Long intentId,
                                                            @RequestHeader(value = "Idempotency-Key", required = false) String key,
                                                            @CurrentUser User student) {
        return ApiResponse.ok(intents.confirm(intentId, key, student));
    }

    @GetMapping("/admin/payments")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Search tuition transactions by status and creation date",
            description = "Date boundaries use Asia/Ho_Chi_Minh; both from and to days are included.")
    public ApiResponse<PageResponse<PaymentResponse>> payments(@CurrentUser User admin,
            @RequestParam(required = false) PaymentStatus status,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to,
            @RequestParam(defaultValue = "0") @Min(0) int page,
            @RequestParam(defaultValue = "20") @Min(1) @Max(100) int size) {
        return ApiResponse.ok(reads.payments(admin, status, from, to, page, size));
    }

    @GetMapping("/payments/{paymentId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'STUDENT')")
    @Operation(summary = "Read a tuition transaction and its refund as admin or the owning student")
    public ApiResponse<PaymentResponse> payment(@PathVariable @Min(1) Long paymentId, @CurrentUser User actor) {
        return ApiResponse.ok(reads.detail(paymentId, actor));
    }
}
