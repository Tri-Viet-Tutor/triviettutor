package com.viettritutor.controller;

import com.viettritutor.common.api.ApiResponse;
import com.viettritutor.dto.payment.CreatePaymentIntentRequest;
import com.viettritutor.dto.payment.PaymentIntentResponse;
import com.viettritutor.dto.payment.SepayWebhookDto;
import com.viettritutor.entity.User;
import com.viettritutor.security.CurrentUser;
import com.viettritutor.service.PaymentService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@Slf4j
@RestController
@RequestMapping("/api/v1")
@RequiredArgsConstructor
@Tag(name = "Payments & SePay", description = "Endpoints for VietQR SePay payments and webhook handling")
public class PaymentController {

    private final PaymentService paymentService;

    @Operation(summary = "Tạo yêu cầu thanh toán ghi danh lớp với VietQR SePay")
    @PostMapping("/payment-intents")
    @PreAuthorize("hasRole('STUDENT')")
    public ResponseEntity<ApiResponse<PaymentIntentResponse>> createPaymentIntent(
            @Valid @RequestBody CreatePaymentIntentRequest request,
            @CurrentUser User actor) {
        PaymentIntentResponse response = paymentService.createPaymentIntent(actor.getId(), request);
        return ResponseEntity.ok(ApiResponse.ok(response));
    }

    @Operation(summary = "Tra cứu thông tin yêu cầu thanh toán theo ID")
    @GetMapping("/payment-intents/{intentId}")
    @PreAuthorize("hasAnyRole('STUDENT', 'ADMIN')")
    public ResponseEntity<ApiResponse<PaymentIntentResponse>> getPaymentIntent(
            @PathVariable Long intentId,
            @CurrentUser User actor) {
        boolean isAdmin = "ROLE_ADMIN".equals(actor.getRole());
        PaymentIntentResponse response = paymentService.getPaymentIntent(intentId, actor.getId(), isAdmin);
        return ResponseEntity.ok(ApiResponse.ok(response));
    }

    @Operation(summary = "Tra cứu thông tin yêu cầu thanh toán theo paymentCode")
    @GetMapping("/payment-intents/code/{paymentCode}")
    @PreAuthorize("hasAnyRole('STUDENT', 'ADMIN')")
    public ResponseEntity<ApiResponse<PaymentIntentResponse>> getPaymentIntentByCode(
            @PathVariable String paymentCode,
            @CurrentUser User actor) {
        boolean isAdmin = "ROLE_ADMIN".equals(actor.getRole());
        PaymentIntentResponse response = paymentService.getPaymentIntentByCode(paymentCode, actor.getId(), isAdmin);
        return ResponseEntity.ok(ApiResponse.ok(response));
    }

    @Operation(summary = "[WEBHOOK] Tiếp nhận thông báo thanh toán từ SePay")
    @PostMapping("/payments/sepay-webhook")
    public ResponseEntity<Map<String, Object>> handleSepayWebhook(
            @RequestBody SepayWebhookDto payload,
            @RequestHeader(value = "Authorization", required = false) String authHeader) {
        log.info("[SePay Webhook] Nhận payload: {}", payload);
        try {
            paymentService.handleSepayWebhook(payload, authHeader);
            // Theo quy ước SePay: luôn trả về HTTP 200 {"success": true}
            return ResponseEntity.ok(Map.of("success", true));
        } catch (Exception ex) {
            log.error("[SePay Webhook] Lỗi khi xử lý Webhook: {}", ex.getMessage());
            // Trả về success: true để SePay không retry dồn dập
            return ResponseEntity.ok(Map.of("success", true, "message", "Error logged"));
        }
    }

    @Operation(summary = "[DEV / TEST ONLY] Giả lập thanh toán SePay thành công")
    @PostMapping("/payments/bypass-sepay/{paymentCode}")
    public ResponseEntity<ApiResponse<PaymentIntentResponse>> bypassSepayPayment(
            @PathVariable String paymentCode) {
        PaymentIntentResponse response = paymentService.bypassPayment(paymentCode);
        return ResponseEntity.ok(ApiResponse.ok(response));
    }
}
