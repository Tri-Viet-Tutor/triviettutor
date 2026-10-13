package com.viettritutor.service;

import com.viettritutor.common.exception.*;
import com.viettritutor.config.VnpayProperties;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import org.springframework.util.MultiValueMap;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.security.*;
import java.util.*;
import java.util.stream.Collectors;

@Component
@RequiredArgsConstructor
public class VnpaySignature {
    private final VnpayProperties properties;

    public String hash(String data) {
        try {
            Mac mac = Mac.getInstance("HmacSHA512");
            mac.init(new SecretKeySpec(properties.getHashSecret().getBytes(StandardCharsets.UTF_8), "HmacSHA512"));
            return HexFormat.of().formatHex(mac.doFinal(data.getBytes(StandardCharsets.UTF_8)));
        } catch (GeneralSecurityException exception) {
            throw new IllegalStateException(exception);
        }
    }

    public String query(Map<String, String> params) {
        return new TreeMap<>(params).entrySet().stream()
                .filter(entry -> entry.getValue() != null && !entry.getValue().isEmpty())
                .map(entry -> encode(entry.getKey()) + "=" + encode(entry.getValue())).collect(Collectors.joining("&"));
    }

    public boolean matches(String data, String signature) {
        if (signature == null || !signature.matches("[a-fA-F0-9]{128}")) return false;
        return MessageDigest.isEqual(HexFormat.of().parseHex(hash(data)), HexFormat.of().parseHex(signature));
    }

    public Map<String, String> verified(MultiValueMap<String, String> input) {
        properties.requireEnabled();
        Map<String, String> fields = new TreeMap<>();
        for (var entry : input.entrySet()) {
            if (entry.getValue().size() != 1 || entry.getKey().length() > 100
                    || entry.getValue().getFirst() == null || entry.getValue().getFirst().length() > 2000) {
                throw new BusinessException(ErrorCode.INVALID_PAYMENT_SIGNATURE);
            }
            if (entry.getKey().startsWith("vnp_") && !Set.of("vnp_SecureHash", "vnp_SecureHashType").contains(entry.getKey())) {
                fields.put(entry.getKey(), entry.getValue().getFirst());
            }
        }
        if (!matches(query(fields), input.getFirst("vnp_SecureHash"))
                || !properties.getTmnCode().equals(fields.get("vnp_TmnCode"))
                || !fields.getOrDefault("vnp_TxnRef", "").matches("[a-zA-Z0-9]{1,100}")
                || !fields.getOrDefault("vnp_Amount", "").matches("[0-9]{1,12}")) {
            throw new BusinessException(ErrorCode.INVALID_PAYMENT_SIGNATURE);
        }
        return fields;
    }

    private String encode(String value) { return URLEncoder.encode(value, StandardCharsets.US_ASCII); }
}
