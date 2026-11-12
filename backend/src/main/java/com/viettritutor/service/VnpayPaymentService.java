package com.viettritutor.service;

import com.viettritutor.common.exception.*;
import com.viettritutor.dto.payment.*;
import com.viettritutor.entity.*;
import com.viettritutor.enums.*;
import com.viettritutor.repository.*;
import jakarta.persistence.*;
import org.springframework.util.MultiValueMap;
import java.math.BigDecimal;
import java.time.*;
import java.time.format.*;
import java.util.*;

public interface VnpayPaymentService {

public static final DateTimeFormatter DATE = DateTimeFormatter.ofPattern("uuuuMMddHHmmss").withResolverStyle(ResolverStyle.STRICT);
public static final ZoneId ZONE = ZoneId.of("Asia/Ho_Chi_Minh");
    VnpayCheckoutResponse checkout(Long intentId, User student, String origin, String clientIp);
    VnpayIpnResponse ipn(MultiValueMap<String, String> input);
/**
     * Recovers a tuition payment whose IPN never reached this backend. Asks VNPay querydr for the signed
     * transaction result and, only when it reports a completed payment, settles it through the same code as the IPN.
     * A pending or unknown result leaves the intent untouched; failures stay the IPN's responsibility.
     */
    PaymentIntentDetailResponse reconcile(Long id, User student);
    PaymentIntentDetailResponse detail(Long id, User student);
    PaymentIntentDetailResponse returned(MultiValueMap<String, String> input, User student);
    PaymentIntentDetailResponse cancel(Long id, User student);
public static String cents(BigDecimal amount) {
        String value = amount.multiply(BigDecimal.valueOf(100)).toBigIntegerExact().toString();
        if (!value.matches("[0-9]{1,12}")) throw new BusinessException(ErrorCode.PAYMENT_GATEWAY_ERROR);
        return value;
    }
public static String date(OffsetDateTime value) { return DATE.format(value.atZoneSameInstant(ZONE)); }
}
