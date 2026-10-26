package com.viettritutor.controller;

import com.viettritutor.common.api.ApiResponse;
import com.viettritutor.common.exception.*;
import com.viettritutor.dto.payment.*;
import com.viettritutor.entity.User;
import com.viettritutor.security.CurrentUser;
import com.viettritutor.service.VnpayPaymentService;
import io.swagger.v3.oas.annotations.Operation;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.constraints.Min;
import lombok.RequiredArgsConstructor;
import org.slf4j.*;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.util.MultiValueMap;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1")
@RequiredArgsConstructor
@Validated
public class VnpayPaymentController {
    private static final Logger log = LoggerFactory.getLogger(VnpayPaymentController.class);
    private final VnpayPaymentService service;
    private final com.viettritutor.service.WalletTopupService topups;

    @PostMapping("/payment-intents/{intentId}/vnpay")
    @PreAuthorize("hasRole('STUDENT')")
    @Operation(summary = "Reserve a seat and create a signed VNPay Sandbox redirect for an owned intent")
    public ApiResponse<VnpayCheckoutResponse> checkout(@PathVariable @Min(1) Long intentId, @CurrentUser User student,
                                                       HttpServletRequest request) {
        return ApiResponse.ok(service.checkout(intentId, student, request.getHeader("Origin"), request.getRemoteAddr()));
    }

    @GetMapping("/payment-intents/{intentId}")
    @PreAuthorize("hasRole('STUDENT')")
    public ApiResponse<PaymentIntentDetailResponse> detail(@PathVariable @Min(1) Long intentId, @CurrentUser User student) {
        return ApiResponse.ok(service.detail(intentId, student));
    }

    @DeleteMapping("/payment-intents/{intentId}")
    @PreAuthorize("hasRole('STUDENT')")
    public ApiResponse<PaymentIntentDetailResponse> cancel(@PathVariable @Min(1) Long intentId, @CurrentUser User student) {
        return ApiResponse.ok(service.cancel(intentId, student));
    }

    @GetMapping("/payments/vnpay/return")
    @PreAuthorize("hasRole('STUDENT')")
    @Operation(summary = "Verify an owned VNPay browser return without settling the payment")
    public ApiResponse<PaymentIntentDetailResponse> returned(@RequestParam MultiValueMap<String, String> params, @CurrentUser User student) {
        return ApiResponse.ok(service.returned(params, student));
    }

    @GetMapping("/payments/vnpay/ipn")
    @Operation(summary = "Receive a signed VNPay server callback; uses the VNPay acknowledgement format")
    public VnpayIpnResponse ipn(@RequestParam MultiValueMap<String, String> params) {
        String reference = params.getFirst("vnp_TxnRef");
        VnpayIpnResponse response;
        try {
            response = reference != null && reference.startsWith("WLT") ? topups.ipn(params) : service.ipn(params);
        }
        catch (BusinessException exception) {
            response = new VnpayIpnResponse(exception.getErrorCode() == ErrorCode.INVALID_PAYMENT_SIGNATURE ? "97" : "99", "Cannot confirm transaction");
        } catch (RuntimeException exception) {
            log.error("VNPay IPN settlement failed", exception);
            response = new VnpayIpnResponse("99", "Cannot confirm transaction");
        }
        // References are opaque order ids, not secrets; logging the outcome makes missed settlements traceable.
        log.info("VNPay IPN reference={} responseCode={} rspCode={}", reference, params.getFirst("vnp_ResponseCode"), response.code());
        return response;
    }
}
