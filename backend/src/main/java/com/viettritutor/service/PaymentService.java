package com.viettritutor.service;

import com.viettritutor.dto.payment.CreatePaymentIntentRequest;
import com.viettritutor.dto.payment.PaymentIntentResponse;
import com.viettritutor.dto.payment.SepayWebhookDto;

public interface PaymentService {

    /**
     * Tạo yêu cầu thanh toán (Payment Intent) học phí lớp với mã QR SePay.
     */
    PaymentIntentResponse createPaymentIntent(Long studentId, CreatePaymentIntentRequest request);

    /**
     * Xem thông tin chi tiết Payment Intent theo ID.
     */
    PaymentIntentResponse getPaymentIntent(Long paymentId, Long currentUserId, boolean isAdmin);

    /**
     * Xem thông tin chi tiết Payment Intent theo paymentCode.
     */
    PaymentIntentResponse getPaymentIntentByCode(String paymentCode, Long currentUserId, boolean isAdmin);

    /**
     * Tiếp nhận và xử lý Webhook thông báo thanh toán gửi từ SePay.
     */
    void handleSepayWebhook(SepayWebhookDto payload, String authHeader);

    /**
     * [DEV / TEST ONLY] Giả lập thanh toán SePay thành công cho một mã thanh toán.
     */
    PaymentIntentResponse bypassPayment(String paymentCode);
}
