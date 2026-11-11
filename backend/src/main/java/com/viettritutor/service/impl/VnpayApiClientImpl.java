package com.viettritutor.service.impl;
import com.viettritutor.service.*;
import com.viettritutor.service.VnpayApiClient;

import com.viettritutor.common.exception.*;
import com.viettritutor.config.VnpayProperties;
import lombok.RequiredArgsConstructor;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.MediaType;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import java.util.*;

@Component
@RequiredArgsConstructor
public class VnpayApiClientImpl implements VnpayApiClient {
    private static final org.slf4j.Logger log = org.slf4j.LoggerFactory.getLogger(VnpayApiClient.class);
    private final VnpayProperties properties;
    private final VnpaySignature signature;

    @Override
    public Map<String, String> exchange(Map<String, String> fields, String signingData, String command) {
        properties.requireEnabled();
        Map<String, String> body = new LinkedHashMap<>(fields);
        body.put("vnp_SecureHash", signature.hash(signingData));
        try {
            Map<String, Object> raw = post(body);
            if (raw == null) throw new IllegalArgumentException();
            Map<String, String> response = new HashMap<>();
            raw.forEach((key, value) -> response.put(key, value == null ? "" : value.toString()));
            List<String> keys = new ArrayList<>(List.of("vnp_ResponseId", "vnp_Command", "vnp_ResponseCode", "vnp_Message",
                    "vnp_TmnCode", "vnp_TxnRef", "vnp_Amount", "vnp_BankCode", "vnp_PayDate", "vnp_TransactionNo",
                    "vnp_TransactionType", "vnp_TransactionStatus", "vnp_OrderInfo"));
            if ("querydr".equals(command)) keys.addAll(List.of("vnp_PromotionCode", "vnp_PromotionAmount"));
            String problem = !signature.matches(VnpayApiClient.join(response, keys), response.get("vnp_SecureHash")) ? "signature"
                    : !properties.getTmnCode().equals(response.get("vnp_TmnCode")) ? "tmnCode"
                    : !command.equals(response.get("vnp_Command")) ? "command"
                    : !fields.get("vnp_TxnRef").equals(response.get("vnp_TxnRef")) ? "txnRef" : null;
            log.info("VNPay {} txnRef={} responseCode={} transactionType={} transactionStatus={} message={} rejected={}",
                    command, fields.get("vnp_TxnRef"), response.get("vnp_ResponseCode"), response.get("vnp_TransactionType"),
                    response.get("vnp_TransactionStatus"), response.get("vnp_Message"), problem);
            if (problem != null) throw new IllegalArgumentException("Untrusted VNPay response: " + problem);
            return response;
        } catch (RuntimeException exception) {
            // Without this the refund silently stays PENDING with code UNKNOWN.
            log.warn("VNPay {} failed for txnRef={}: {}", command, fields.get("vnp_TxnRef"), exception.toString());
            throw new BusinessException(ErrorCode.PAYMENT_GATEWAY_ERROR);
        }
    }

    protected Map<String, Object> post(Map<String, String> body) {
        var factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(Math.multiplyExact(properties.getTimeoutSeconds(), 1000));
        factory.setReadTimeout(Math.multiplyExact(properties.getTimeoutSeconds(), 1000));
        return RestClient.builder().requestFactory(factory).build().post().uri(properties.getApiUrl())
                .contentType(MediaType.APPLICATION_JSON).body(body).retrieve().body(new ParameterizedTypeReference<>() {});
    }

    
}
