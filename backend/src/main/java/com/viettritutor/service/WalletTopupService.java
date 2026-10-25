package com.viettritutor.service;

import com.viettritutor.common.exception.*;
import com.viettritutor.config.*;
import com.viettritutor.dto.payment.VnpayIpnResponse;
import com.viettritutor.dto.wallet.*;
import com.viettritutor.entity.*;
import com.viettritutor.enums.PaymentOperationType;
import com.viettritutor.repository.*;
import jakarta.persistence.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.MultiValueMap;
import java.math.BigDecimal;
import java.time.*;
import java.time.temporal.ChronoUnit;
import java.util.*;

@Service @RequiredArgsConstructor
public class WalletTopupService {
    private final WalletTopupIntentRepository topups;
    private final WalletService wallet;
    private final EnrollmentPaymentSupport support;
    private final PaymentIdempotencyService idempotency;
    private final WalletProperties settings;
    private final VnpayProperties vnpay;
    private final VnpaySignature signature;
    private final VnpayReturnUrl returns;
    private final EntityManager entityManager;
    private final Clock clock;

    @Transactional
    public WalletTopupResponse create(BigDecimal amount, String key, User student, String origin, String clientIp) {
        support.student(student);
        idempotency.validateKey(key);
        vnpay.requireEnabled();
        if (amount == null || amount.stripTrailingZeros().scale() > 0
                || amount.compareTo(settings.getTopupMinAmount()) < 0 || amount.compareTo(settings.getTopupMaxAmount()) > 0) {
            throw new BusinessException(ErrorCode.WALLET_INVALID_TOPUP_AMOUNT);
        }
        support.lockPeople(student.getId());
        String request = amount.toBigIntegerExact().toString();
        var replay = idempotency.replay(student.getId(), PaymentOperationType.CREATE_TOPUP, key, request);
        if (replay.isPresent()) return response(find(replay.get()), clientIp);
        OffsetDateTime now = OffsetDateTime.now(clock).truncatedTo(ChronoUnit.SECONDS);
        WalletTopupIntent topup = topups.saveAndFlush(WalletTopupIntent.builder().studentId(student.getId())
                .amount(amount).status("PENDING").reference("WLT" + UUID.randomUUID().toString().replace("-", ""))
                .returnUrl(returns.resolve(origin, settings.getVnpayReturnPath())).createdAt(now)
                .expiresAt(now.plusMinutes(settings.getTopupTtlMinutes())).build());
        idempotency.remember(student.getId(), PaymentOperationType.CREATE_TOPUP, key, request, topup.getId());
        return response(topup, clientIp);
    }

    @Transactional(readOnly = true)
    public WalletTopupResponse detail(Long id, User student, String clientIp) {
        support.student(student);
        WalletTopupIntent topup = find(id);
        support.owner(topup.getStudentId(), student);
        return response(topup, clientIp);
    }

    @Transactional(readOnly = true)
    public WalletTopupResponse returned(MultiValueMap<String, String> input, User student, String clientIp) {
        support.student(student);
        Map<String, String> fields = signature.verified(input);
        WalletTopupIntent topup = topups.findByReference(fields.get("vnp_TxnRef"))
                .orElseThrow(() -> new BusinessException(ErrorCode.WALLET_TOPUP_NOT_FOUND));
        support.owner(topup.getStudentId(), student);
        if (!VnpayPaymentService.cents(topup.getAmount()).equals(fields.get("vnp_Amount"))) {
            throw new BusinessException(ErrorCode.INVALID_PAYMENT_SIGNATURE);
        }
        return response(topup, clientIp);
    }

    @Transactional
    public VnpayIpnResponse ipn(MultiValueMap<String, String> input) {
        Map<String, String> fields = signature.verified(input);
        var found = topups.findByReference(fields.get("vnp_TxnRef"));
        if (found.isEmpty()) return new VnpayIpnResponse("01", "Top-up not found");
        WalletTopupIntent topup = found.get();
        support.lockPeople(topup.getStudentId());
        entityManager.refresh(topup, LockModeType.PESSIMISTIC_WRITE);
        if (!VnpayPaymentService.cents(topup.getAmount()).equals(fields.get("vnp_Amount"))) {
            return new VnpayIpnResponse("04", "Invalid amount");
        }
        String code = fields.get("vnp_ResponseCode"), status = fields.get("vnp_TransactionStatus");
        if (code == null || !code.matches("[0-9]{2}") || status == null || !status.matches("[0-9]{2}")) {
            throw new BusinessException(ErrorCode.INVALID_PAYMENT_SIGNATURE);
        }
        boolean success = "00".equals(code) && "00".equals(status);
        OffsetDateTime paidAt = null;
        String providerNo = fields.get("vnp_TransactionNo");
        if (success) {
            try {
                paidAt = LocalDateTime.parse(fields.get("vnp_PayDate"), VnpayPaymentService.DATE)
                        .atZone(VnpayPaymentService.ZONE).toOffsetDateTime();
            } catch (RuntimeException e) { throw new BusinessException(ErrorCode.INVALID_PAYMENT_SIGNATURE); }
            if (providerNo == null || !providerNo.matches("[0-9]{1,15}") || new BigDecimal(providerNo).signum() == 0
                    || paidAt.isBefore(topup.getCreatedAt()) || paidAt.isAfter(OffsetDateTime.now(clock).plusMinutes(1))) {
                throw new BusinessException(ErrorCode.INVALID_PAYMENT_SIGNATURE);
            }
        }
        if ("COMPLETED".equals(topup.getStatus())) {
            if (success && !Objects.equals(providerNo, topup.getProviderTransactionNo())) {
                throw new BusinessException(ErrorCode.INVALID_PAYMENT_SIGNATURE);
            }
            return new VnpayIpnResponse("02", "Top-up already confirmed");
        }
        if (!success) {
            if ("FAILED".equals(topup.getStatus())) return new VnpayIpnResponse("02", "Top-up already confirmed");
            topup.setStatus("FAILED");
        } else {
            // Authenticated money received late must still be accounted for.
            topup.setStatus("COMPLETED");
            topup.setPaidAt(paidAt);
            topup.setProviderTransactionNo(providerNo);
            topups.saveAndFlush(topup);
            wallet.post(topup.getStudentId(), "TOPUP", topup.getAmount(), topup.getId(), null, null, "Nạp tiền qua VNPay Sandbox");
        }
        return new VnpayIpnResponse("00", "Confirm success");
    }

    private WalletTopupIntent find(Long id) {
        return topups.findById(id).orElseThrow(() -> new BusinessException(ErrorCode.WALLET_TOPUP_NOT_FOUND));
    }

    private WalletTopupResponse response(WalletTopupIntent topup, String clientIp) {
        String status = "PENDING".equals(topup.getStatus()) && !clock.instant().isBefore(topup.getExpiresAt().toInstant())
                ? "EXPIRED" : topup.getStatus();
        String url = null;
        if ("PENDING".equals(status) && vnpay.isEnabled() && vnpay.configurationProblems().isEmpty()) {
            Map<String, String> fields = new TreeMap<>();
            fields.put("vnp_Version", "2.1.0"); fields.put("vnp_Command", "pay");
            fields.put("vnp_TmnCode", vnpay.getTmnCode());
            fields.put("vnp_Amount", VnpayPaymentService.cents(topup.getAmount()));
            fields.put("vnp_CurrCode", "VND"); fields.put("vnp_TxnRef", topup.getReference());
            fields.put("vnp_OrderInfo", "Wallet top-up " + topup.getId());
            fields.put("vnp_OrderType", "other"); fields.put("vnp_Locale", "vn");
            fields.put("vnp_ReturnUrl", topup.getReturnUrl()); fields.put("vnp_IpAddr", clientIp);
            fields.put("vnp_CreateDate", VnpayPaymentService.date(topup.getCreatedAt()));
            fields.put("vnp_ExpireDate", VnpayPaymentService.date(topup.getExpiresAt()));
            String query = signature.query(fields);
            url = vnpay.getPaymentUrl() + "?" + query + "&vnp_SecureHash=" + signature.hash(query);
        }
        return new WalletTopupResponse(topup.getId(), topup.getAmount(), status, topup.getReference(),
                url, topup.getExpiresAt(), topup.getPaidAt());
    }
}
