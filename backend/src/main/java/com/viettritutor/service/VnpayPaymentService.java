package com.viettritutor.service;

import com.viettritutor.common.exception.*;
import com.viettritutor.config.VnpayProperties;
import com.viettritutor.dto.payment.*;
import com.viettritutor.entity.*;
import com.viettritutor.enums.*;
import com.viettritutor.repository.*;
import jakarta.persistence.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.util.MultiValueMap;

import java.math.BigDecimal;
import java.time.*;
import java.time.format.*;
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

@Service
@RequiredArgsConstructor
public class VnpayPaymentService {
    public static final DateTimeFormatter DATE = DateTimeFormatter.ofPattern("uuuuMMddHHmmss").withResolverStyle(ResolverStyle.STRICT);
    public static final ZoneId ZONE = ZoneId.of("Asia/Ho_Chi_Minh");
    static final Duration RECONCILE_COOLDOWN = Duration.ofSeconds(30);
    private final PaymentIntentRepository intents;
    private final PaymentRepository payments;
    private final EnrollmentRepository enrollments;
    private final EnrollmentPaymentSupport support;
    private final LearningScheduleService learning;
    private final PaymentReadService reads;
    private final VnpayProperties properties;
    private final VnpaySignature signature;
    private final VnpayReturnUrl returns;
    private final VnpayApiClient gateway;
    private final TransactionTemplate transaction;
    private final EntityManager entityManager;
    private final Clock clock;
    // Per-intent querydr throttle; in-memory is enough because it only limits load on VNPay, never correctness.
    private final Map<Long, Instant> lastReconcile = new ConcurrentHashMap<>();

    @Transactional
    public VnpayCheckoutResponse checkout(Long intentId, User student, String origin, String clientIp) {
        properties.requireEnabled();
        support.student(student);
        PaymentIntent intent = find(intentId);
        support.owner(intent.getStudentId(), student);
        ClassGroup group = lock(intent);
        if (intent.getStatus() != PaymentIntentStatus.PENDING || intent.getCancelledAt() != null) {
            throw new BusinessException(ErrorCode.PAYMENT_INTENT_NOT_PENDING);
        }
        if (!clock.instant().isBefore(intent.getExpiresAt().toInstant())) throw new PaymentIntentExpiredException();
        var admission = support.admission(group, student.getId(), intentId);
        if (intent.getVnpayReference() == null) {
            if (intent.getAmount().compareTo(admission.expectedAmount()) != 0
                    || !intent.getCourseId().equals(admission.course().getId())) throw new BusinessException(ErrorCode.PAYMENT_PRICE_CHANGED);
            intent.setVnpayReference("TVT" + UUID.randomUUID().toString().replace("-", ""));
            intent.setVnpayCreatedAt(OffsetDateTime.now(clock).truncatedTo(ChronoUnit.SECONDS));
            intent.setVnpayReturnUrl(returns.resolve(origin));
            intents.saveAndFlush(intent);
        }
        Map<String, String> fields = new TreeMap<>();
        fields.put("vnp_Version", "2.1.0");
        fields.put("vnp_Command", "pay");
        fields.put("vnp_TmnCode", properties.getTmnCode());
        fields.put("vnp_Amount", cents(intent.getAmount()));
        fields.put("vnp_CurrCode", "VND");
        fields.put("vnp_TxnRef", intent.getVnpayReference());
        fields.put("vnp_OrderInfo", "Tuition for class " + intent.getClassGroupId());
        fields.put("vnp_OrderType", "other");
        fields.put("vnp_Locale", "vn");
        fields.put("vnp_ReturnUrl", intent.getVnpayReturnUrl());
        fields.put("vnp_IpAddr", clientIp);
        fields.put("vnp_CreateDate", date(intent.getVnpayCreatedAt()));
        fields.put("vnp_ExpireDate", date(intent.getExpiresAt()));
        String query = signature.query(fields);
        return new VnpayCheckoutResponse(intent.getId(), intent.getVnpayReference(), intent.getAmount(),
                properties.getPaymentUrl() + "?" + query + "&vnp_SecureHash=" + signature.hash(query), intent.getExpiresAt());
    }

    @Transactional
    public VnpayIpnResponse ipn(MultiValueMap<String, String> input) {
        Map<String, String> fields = signature.verified(input);
        var found = intents.findByVnpayReference(fields.get("vnp_TxnRef"));
        if (found.isEmpty()) return new VnpayIpnResponse("01", "Order not found");
        return settle(found.get(), fields);
    }

    /**
     * Recovers a tuition payment whose IPN never reached this backend. Asks VNPay querydr for the signed
     * transaction result and, only when it reports a completed payment, settles it through the same code as the IPN.
     * A pending or unknown result leaves the intent untouched; failures stay the IPN's responsibility.
     */
    public PaymentIntentDetailResponse reconcile(Long id, User student) {
        support.student(student);
        PaymentIntent intent = find(id);
        support.owner(intent.getStudentId(), student);
        Optional<Payment> prior = payments.findByIntentId(id);
        if (intent.getVnpayReference() == null || (prior.isPresent() && prior.get().getPaidAt() != null)) {
            return transaction.execute(ignored -> response(find(id)));
        }
        properties.requireEnabled();
        if (properties.getServerIp() == null || !properties.getServerIp().matches("[0-9a-fA-F:.]{7,45}")) {
            throw new BusinessException(ErrorCode.PAYMENT_GATEWAY_DISABLED);
        }
        if (!reconcileAllowed(id)) return transaction.execute(ignored -> response(find(id)));
        Map<String, String> query = new LinkedHashMap<>();
        query.put("vnp_RequestId", UUID.randomUUID().toString().replace("-", ""));
        query.put("vnp_Version", "2.1.0");
        query.put("vnp_Command", "querydr");
        query.put("vnp_TmnCode", properties.getTmnCode());
        query.put("vnp_TxnRef", intent.getVnpayReference());
        query.put("vnp_OrderInfo", "Reconcile tuition " + intent.getId());
        query.put("vnp_TransactionDate", date(intent.getVnpayCreatedAt()));
        query.put("vnp_CreateDate", date(OffsetDateTime.now(clock)));
        query.put("vnp_IpAddr", properties.getServerIp());
        String data = VnpayApiClient.join(query, List.of("vnp_RequestId", "vnp_Version", "vnp_Command", "vnp_TmnCode",
                "vnp_TxnRef", "vnp_TransactionDate", "vnp_CreateDate", "vnp_IpAddr", "vnp_OrderInfo"));
        // The gateway call stays outside the database transaction so no lock is held while waiting on VNPay.
        Map<String, String> result = gateway.exchange(query, data, "querydr");
        if (!intent.getVnpayReference().equals(result.get("vnp_TxnRef"))) throw new BusinessException(ErrorCode.PAYMENT_GATEWAY_ERROR);
        boolean paid = "00".equals(result.get("vnp_ResponseCode")) && "00".equals(result.get("vnp_TransactionStatus"))
                && "01".equals(result.get("vnp_TransactionType"));
        if (paid) {
            VnpayIpnResponse outcome = transaction.execute(ignored -> settle(find(id), result));
            if (outcome != null && "04".equals(outcome.code())) throw new BusinessException(ErrorCode.INVALID_PAYMENT_SIGNATURE);
        }
        return transaction.execute(ignored -> response(find(id)));
    }

    /** At most one querydr per intent per cooldown window; repeated clicks just read the current state. */
    private boolean reconcileAllowed(Long intentId) {
        Instant now = clock.instant();
        lastReconcile.values().removeIf(at -> !now.isBefore(at.plus(RECONCILE_COOLDOWN)));
        boolean[] allowed = {false};
        lastReconcile.compute(intentId, (key, at) -> {
            if (at != null && now.isBefore(at.plus(RECONCILE_COOLDOWN))) return at;
            allowed[0] = true;
            return now;
        });
        return allowed[0];
    }

    // Shared by the IPN and querydr reconciliation; the caller has already authenticated the fields.
    private VnpayIpnResponse settle(PaymentIntent intent, Map<String, String> fields) {
        ClassGroup group = lock(intent);
        if (!cents(intent.getAmount()).equals(fields.get("vnp_Amount"))) return new VnpayIpnResponse("04", "Invalid amount");
        String responseCode = fields.get("vnp_ResponseCode");
        String transactionStatus = fields.get("vnp_TransactionStatus");
        if (responseCode == null || !responseCode.matches("[0-9]{2}")
                || transactionStatus == null || !transactionStatus.matches("[0-9]{2}")) {
            throw new BusinessException(ErrorCode.INVALID_PAYMENT_SIGNATURE);
        }
        boolean success = "00".equals(responseCode) && "00".equals(transactionStatus);
        OffsetDateTime paidAt = success ? paidDate(fields.get("vnp_PayDate")) : null;
        String providerNo = fields.get("vnp_TransactionNo");
        if (success && (providerNo == null || !providerNo.matches("[0-9]{1,15}") || new BigDecimal(providerNo).signum() == 0
                || paidAt.isBefore(intent.getVnpayCreatedAt()) || paidAt.isAfter(OffsetDateTime.now(clock).plusMinutes(1)))) {
            throw new BusinessException(ErrorCode.INVALID_PAYMENT_SIGNATURE);
        }
        Optional<Payment> prior = payments.findByIntentId(intent.getId());
        if (prior.isPresent() && (!success || prior.get().getPaidAt() != null)) {
            if (success && !Objects.equals(prior.get().getProviderTransactionNo(), providerNo)) {
                throw new BusinessException(ErrorCode.INVALID_PAYMENT_SIGNATURE);
            }
            return new VnpayIpnResponse("02", "Order already confirmed");
        }
        Payment payment = prior.orElseGet(() -> Payment.builder().intentId(intent.getId()).studentId(intent.getStudentId())
                .classGroupId(group.getId()).amount(intent.getAmount()).refundedAmount(BigDecimal.ZERO).method("VNPAY")
                .transactionRef(intent.getVnpayReference()).createdAt(OffsetDateTime.now(clock)).build());
        payment.setPaidAt(paidAt);
        payment.setProviderTransactionNo(success ? providerNo : null);
        payment.setStatus(success ? PaymentStatus.COMPLETED : PaymentStatus.FAILED);
        intent.setStatus(success ? PaymentIntentStatus.COMPLETED : PaymentIntentStatus.FAILED);
        EnrollmentPaymentSupport.Admission admission = null;
        if (success) {
            String rejection = null;
            if (intent.getCancelledAt() != null) rejection = "PAYMENT_CANCELLED";
            else if (!paidAt.toInstant().isBefore(intent.getExpiresAt().toInstant())) rejection = "PAYMENT_INTENT_EXPIRED";
            else {
                try {
                    admission = support.admission(group, intent.getStudentId(), intent.getId());
                    if (!admission.course().getId().equals(intent.getCourseId())) {
                        admission = null;
                        rejection = "CLASS_COURSE_CHANGED";
                    }
                }
                catch (BusinessException exception) { rejection = exception.getErrorCode().name(); }
            }
            if (rejection != null) {
                payment.setStatus(PaymentStatus.REQUIRES_REFUND);
                payment.setRefundReason(rejection);
            }
        }
        payment = payments.saveAndFlush(payment);
        if (admission != null) {
            Enrollment enrollment = enrollments.saveAndFlush(Enrollment.builder().studentId(intent.getStudentId())
                    .classGroupId(group.getId()).paymentId(payment.getId()).feeCharged(intent.getAmount())
                    // Record the rate behind the charged amount; intents created before V23 fall back to today's rate.
                    .discountRate(intent.getDiscountRate() != null ? intent.getDiscountRate() : admission.discountRate())
                    .enrollmentSizeAtTime(admission.enrollmentSize())
                    .status(EnrollmentStatus.ACTIVE).enrolledAt(OffsetDateTime.now(clock)).build());
            learning.activate(enrollment.getId(), intent.getStudentId(), group.getId(), admission.start(), admission.end());
        }
        return new VnpayIpnResponse("00", "Confirm success");
    }

    @Transactional(readOnly = true)
    public PaymentIntentDetailResponse detail(Long id, User student) {
        support.student(student);
        PaymentIntent intent = find(id);
        support.owner(intent.getStudentId(), student);
        return response(intent);
    }

    @Transactional(readOnly = true)
    public PaymentIntentDetailResponse returned(MultiValueMap<String, String> input, User student) {
        support.student(student);
        Map<String, String> fields = signature.verified(input);
        PaymentIntent intent = intents.findByVnpayReference(fields.get("vnp_TxnRef"))
                .orElseThrow(() -> new BusinessException(ErrorCode.PAYMENT_INTENT_NOT_FOUND));
        support.owner(intent.getStudentId(), student);
        if (!cents(intent.getAmount()).equals(fields.get("vnp_Amount"))) throw new BusinessException(ErrorCode.INVALID_PAYMENT_SIGNATURE);
        return response(intent);
    }

    @Transactional
    public PaymentIntentDetailResponse cancel(Long id, User student) {
        support.student(student);
        PaymentIntent intent = find(id);
        support.owner(intent.getStudentId(), student);
        lock(intent);
        if (intent.getStatus() == PaymentIntentStatus.PENDING) {
            intent.setCancelledAt(OffsetDateTime.now(clock));
            intent.setStatus(PaymentIntentStatus.EXPIRED);
        }
        return response(intent);
    }

    private PaymentIntentDetailResponse response(PaymentIntent intent) {
        Payment payment = payments.findByIntentId(intent.getId()).orElse(null);
        Enrollment enrollment = payment == null ? null : enrollments.findByPaymentId(payment.getId()).orElse(null);
        return new PaymentIntentDetailResponse(PaymentIntentResponse.from(intent, clock), intent.getCancelledAt() != null,
                payment == null ? null : reads.response(payment), enrollment == null ? null : reads.enrollment(enrollment));
    }

    private PaymentIntent find(Long id) {
        return intents.findById(id).orElseThrow(() -> new BusinessException(ErrorCode.PAYMENT_INTENT_NOT_FOUND));
    }

    private ClassGroup lock(PaymentIntent intent) {
        ClassGroup group = support.lockClass(intent.getClassGroupId());
        support.lockPeople(intent.getStudentId());
        entityManager.refresh(intent, LockModeType.PESSIMISTIC_WRITE);
        return group;
    }

    public static String cents(BigDecimal amount) {
        String value = amount.multiply(BigDecimal.valueOf(100)).toBigIntegerExact().toString();
        if (!value.matches("[0-9]{1,12}")) throw new BusinessException(ErrorCode.PAYMENT_GATEWAY_ERROR);
        return value;
    }

    public static String date(OffsetDateTime value) { return DATE.format(value.atZoneSameInstant(ZONE)); }

    private OffsetDateTime paidDate(String value) {
        try { return LocalDateTime.parse(value, DATE).atZone(ZONE).toOffsetDateTime(); }
        catch (RuntimeException exception) { throw new BusinessException(ErrorCode.INVALID_PAYMENT_SIGNATURE); }
    }
}
