package com.viettritutor.service.impl;
import com.viettritutor.service.*;
import com.viettritutor.service.VnpayRefundService;

import com.viettritutor.common.exception.*;
import com.viettritutor.config.VnpayProperties;
import com.viettritutor.dto.payment.*;
import com.viettritutor.entity.User;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.*;
import java.util.*;

@Service
@RequiredArgsConstructor
public class VnpayRefundServiceImpl implements VnpayRefundService {
    private final VnpayRefundTransactions transactions;
    private final VnpayApiClient client;
    private final VnpayProperties properties;
    private final Clock clock;

    @Override
    public RefundResponse refund(Long paymentId, Long enrollmentId, RefundRequest input, String key, User actor, boolean studentCancel) {
        requireConfigured();
        return send(transactions.prepare(paymentId, enrollmentId, input, key, actor, studentCancel));
    }

    @Override
    public RefundResponse retry(Long refundId, User admin) {
        requireConfigured();
        return send(transactions.retry(refundId, admin));
    }

    @Override
    public RefundResponse reconcile(Long refundId, User admin) {
        requireConfigured();
        var request = transactions.context(refundId, admin);
        if ("COMPLETED".equals(request.status())) return transactions.detail(refundId);
        Map<String, String> fields = base("querydr", UUID.randomUUID().toString().replace("-", ""), request);
        fields.put("vnp_OrderInfo", "Reconcile refund " + request.refundId());
        String data = VnpayApiClient.join(fields, List.of("vnp_RequestId", "vnp_Version", "vnp_Command", "vnp_TmnCode",
                "vnp_TxnRef", "vnp_TransactionDate", "vnp_CreateDate", "vnp_IpAddr", "vnp_OrderInfo"));
        return exchange(request.refundId(), fields, data, "querydr");
    }

    private RefundResponse send(VnpayRefundTransactions.Request request) {
        if (!request.send()) return transactions.detail(request.refundId());
        Map<String, String> fields = base("refund", request.reference(), request);
        fields.put("vnp_CreateDate", VnpayPaymentService.date(request.createdAt()));
        fields.put("vnp_TransactionType", request.amount().compareTo(request.paidAmount()) == 0 ? "02" : "03");
        fields.put("vnp_Amount", VnpayPaymentService.cents(request.amount()));
        fields.put("vnp_CreateBy", request.actorId().toString());
        fields.put("vnp_OrderInfo", "Refund tuition " + request.refundId());
        String data = VnpayApiClient.join(fields, List.of("vnp_RequestId", "vnp_Version", "vnp_Command", "vnp_TmnCode",
                "vnp_TransactionType", "vnp_TxnRef", "vnp_Amount", "vnp_TransactionNo", "vnp_TransactionDate",
                "vnp_CreateBy", "vnp_CreateDate", "vnp_IpAddr", "vnp_OrderInfo"));
        return exchange(request.refundId(), fields, data, "refund");
    }

    private RefundResponse exchange(Long id, Map<String, String> fields, String data, String command) {
        Map<String, String> response;
        try { response = client.exchange(fields, data, command); }
        catch (BusinessException exception) { response = null; }
        return transactions.apply(id, response);
    }

    private Map<String, String> base(String command, String requestId, VnpayRefundTransactions.Request request) {
        Map<String, String> fields = new LinkedHashMap<>();
        fields.put("vnp_RequestId", requestId);
        fields.put("vnp_Version", "2.1.0");
        fields.put("vnp_Command", command);
        fields.put("vnp_TmnCode", properties.getTmnCode());
        fields.put("vnp_TxnRef", request.paymentReference());
        fields.put("vnp_TransactionNo", request.providerNo());
        fields.put("vnp_TransactionDate", VnpayPaymentService.date(request.paymentCreatedAt()));
        fields.put("vnp_CreateDate", VnpayPaymentService.date(OffsetDateTime.now(clock)));
        fields.put("vnp_IpAddr", properties.getServerIp());
        return fields;
    }

    private void requireConfigured() {
        properties.requireEnabled();
        if (properties.getServerIp() == null || !properties.getServerIp().matches("[0-9a-fA-F:.]{7,45}")) {
            throw new BusinessException(ErrorCode.PAYMENT_GATEWAY_DISABLED);
        }
    }
}
