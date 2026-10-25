package com.viettritutor.controller;

import com.viettritutor.common.api.*;
import com.viettritutor.dto.wallet.*;
import com.viettritutor.dto.payment.PaymentConfirmationResponse;
import com.viettritutor.entity.User;
import com.viettritutor.security.CurrentUser;
import com.viettritutor.service.*;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.util.MultiValueMap;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

@RestController @RequestMapping("/api/v1")
@RequiredArgsConstructor @Validated @PreAuthorize("hasRole('STUDENT')")
public class WalletController {
    private final WalletService wallets;
    private final WalletTopupService topups;
    private final WalletPaymentService payments;

    @GetMapping("/wallet")
    public ApiResponse<WalletResponse> view(@CurrentUser User student) {
        return ApiResponse.ok(wallets.view(student));
    }
    @GetMapping("/wallet/transactions")
    public ApiResponse<PageResponse<WalletTransactionResponse>> history(@CurrentUser User student,
            @RequestParam(defaultValue = "0") @Min(0) int page,
            @RequestParam(defaultValue = "20") @Min(1) @Max(100) int size) {
        return ApiResponse.ok(wallets.history(student, page, size));
    }
    @PostMapping("/wallet/topups") @ResponseStatus(HttpStatus.CREATED)
    public ApiResponse<WalletTopupResponse> create(@CurrentUser User student,
            @RequestBody @Valid CreateWalletTopupRequest input,
            @RequestHeader(value = "Idempotency-Key", required = false) String key, HttpServletRequest request) {
        return ApiResponse.ok(topups.create(input.amount(), key, student, request.getHeader("Origin"), request.getRemoteAddr()));
    }
    @GetMapping("/wallet/topups/{id}")
    public ApiResponse<WalletTopupResponse> detail(@PathVariable @Min(1) Long id, @CurrentUser User student, HttpServletRequest request) {
        return ApiResponse.ok(topups.detail(id, student, request.getRemoteAddr()));
    }
    @GetMapping("/wallet/vnpay/return")
    public ApiResponse<WalletTopupResponse> returned(@RequestParam MultiValueMap<String, String> params,
            @CurrentUser User student, HttpServletRequest request) {
        return ApiResponse.ok(topups.returned(params, student, request.getRemoteAddr()));
    }
    @PostMapping("/payment-intents/{id}/wallet")
    public ApiResponse<PaymentConfirmationResponse> confirm(@PathVariable @Min(1) Long id, @CurrentUser User student,
            @RequestHeader(value = "Idempotency-Key", required = false) String key) {
        return ApiResponse.ok(payments.confirm(id, key, student));
    }
}
