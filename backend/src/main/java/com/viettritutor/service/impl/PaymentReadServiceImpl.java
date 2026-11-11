package com.viettritutor.service.impl;
import com.viettritutor.service.*;
import com.viettritutor.service.PaymentReadService;

import com.viettritutor.common.api.PageResponse;
import com.viettritutor.common.exception.*;
import com.viettritutor.dto.payment.*;
import com.viettritutor.entity.*;
import com.viettritutor.enums.*;
import com.viettritutor.repository.*;
import jakarta.persistence.criteria.Predicate;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.*;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class PaymentReadServiceImpl implements PaymentReadService {
    private final PaymentRepository payments;
    private final EnrollmentRepository enrollments;
    private final RefundRepository refunds;
    private final WalletTransactionRepository walletTransactions;
    private final EnrollmentPaymentSupport support;
    private final ClassGroupRepository classes;
    private final MockPaymentPolicy mockPolicy;
    private final Clock clock;

    @Override
    public PaymentResponse detail(Long paymentId, User actor) {
        Payment payment = payments.findById(paymentId).orElseThrow(() -> new BusinessException(ErrorCode.PAYMENT_NOT_FOUND));
        if ("ROLE_ADMIN".equals(actor.getRole())) {
            support.admin(actor);
        } else {
            support.student(actor);
            support.owner(payment.getStudentId(), actor);
        }
        return response(payment);
    }

    @Override
    public PaymentResponse response(Payment payment) {
        Long enrollmentId = enrollments.findByPaymentId(payment.getId()).map(Enrollment::getId).orElse(null);
        return PaymentResponse.from(payment, enrollmentId, refunds.findByPaymentIdIn(List.of(payment.getId())).stream()
                .map(RefundResponse::from).toList(), enrollmentId == null ? null : walletTransactions.findByEnrollmentId(enrollmentId)
                .map(WalletTransaction::getAmount).orElse(null));
    }

    @Override
    public PageResponse<PaymentResponse> payments(User admin, PaymentStatus status, LocalDate from, LocalDate to, int page, int size) {
        support.admin(admin);
        if (from != null && to != null && from.isAfter(to)) throw new BusinessException(ErrorCode.INVALID_DATE_RANGE);
        OffsetDateTime lower = from == null ? null : from.atStartOfDay(clock.getZone()).toOffsetDateTime();
        OffsetDateTime upper = to == null ? null : to.plusDays(1).atStartOfDay(clock.getZone()).toOffsetDateTime();
        Page<Payment> result = payments.findAll((root, query, cb) -> {
            List<Predicate> filters = new ArrayList<>();
            if (status != null) filters.add(cb.equal(root.get("status"), status));
            if (lower != null) filters.add(cb.greaterThanOrEqualTo(root.get("createdAt"), lower));
            if (upper != null) filters.add(cb.lessThan(root.get("createdAt"), upper));
            return cb.and(filters.toArray(Predicate[]::new));
        }, paging(page, size));
        List<Long> ids = result.getContent().stream().map(Payment::getId).toList();
        Map<Long, Long> enrollmentByPayment = ids.isEmpty() ? Map.of() : enrollments.findByPaymentIdIn(ids).stream()
                .collect(Collectors.toMap(Enrollment::getPaymentId, Enrollment::getId));
        Map<Long, List<RefundResponse>> refundsByPayment = ids.isEmpty() ? Map.of() : refunds.findByPaymentIdIn(ids).stream()
                .collect(Collectors.groupingBy(Refund::getPaymentId, Collectors.mapping(RefundResponse::from, Collectors.toList())));
        Map<Long, java.math.BigDecimal> creditByEnrollment = enrollmentByPayment.isEmpty() ? Map.of() : walletTransactions
                .findByEnrollmentIdIn(enrollmentByPayment.values()).stream()
                .collect(Collectors.toMap(WalletTransaction::getEnrollmentId, WalletTransaction::getAmount));
        return PageResponse.from(result.map(payment -> PaymentResponse.from(payment, enrollmentByPayment.get(payment.getId()),
                refundsByPayment.getOrDefault(payment.getId(), List.of()),
                creditByEnrollment.get(enrollmentByPayment.get(payment.getId())))));
    }

    @Override
    public PageResponse<EnrollmentResponse> mine(User student, EnrollmentStatus status, int page, int size) {
        support.student(student);
        return list(student.getId(), null, status, page, size);
    }

    @Override
    public PageResponse<EnrollmentResponse> classEnrollments(User admin, Long classId, EnrollmentStatus status, int page, int size) {
        support.admin(admin);
        if (!classes.existsById(classId)) throw new BusinessException(ErrorCode.CLASS_NOT_FOUND);
        return list(null, classId, status, page, size);
    }

    /** One enrollment with its latest refund status and whether the student may cancel it for a full refund. */
    @Override
    public EnrollmentResponse enrollment(Enrollment enrollment) {
        return enrollments(List.of(enrollment)).get(0);
    }

    private List<EnrollmentResponse> enrollments(List<Enrollment> rows) {
        List<Long> paymentIds = rows.stream().map(Enrollment::getPaymentId).filter(Objects::nonNull).distinct().toList();
        Map<Long, Refund> latestRefund = paymentIds.isEmpty() ? Map.of() : refunds.findByPaymentIdIn(paymentIds).stream()
                .collect(Collectors.toMap(Refund::getPaymentId, refund -> refund,
                        (a, b) -> a.getId() > b.getId() ? a : b));
        Map<Long, Payment> paymentById = paymentIds.isEmpty() ? Map.of() : payments.findAllById(paymentIds).stream()
                .collect(Collectors.toMap(Payment::getId, payment -> payment));
        Map<Long, Boolean> fullRefund = new HashMap<>();
        return rows.stream().map(enrollment -> {
            Refund refund = latestRefund.get(enrollment.getPaymentId());
            // Same rules the cancel endpoint enforces (BR-02.32 and the refund provider checks in
            // EnrollmentRefundService.settle / VnpayRefundTransactions.prepare); a refund in flight already settles it.
            boolean cancellable = enrollment.getStatus() == EnrollmentStatus.ACTIVE && refund == null
                    && refundableBySelf(paymentById.get(enrollment.getPaymentId()))
                    && fullRefund.computeIfAbsent(enrollment.getClassGroupId(), id -> classes.findById(id)
                            .map(support::fullRefundRequired).orElse(false));
            return EnrollmentResponse.from(enrollment, refund == null ? null : refund.getStatus(), cancellable);
        }).toList();
    }

    private boolean refundableBySelf(Payment payment) {
        if (payment == null || payment.getStatus() != PaymentStatus.COMPLETED || payment.getRefundedAmount().signum() != 0) return false;
        return switch (payment.getMethod()) {
            case "WALLET", "VNPAY" -> true;
            case "MOCK" -> mockPolicy.isEnabled();
            default -> false;
        };
    }

    private PageResponse<EnrollmentResponse> list(Long studentId, Long classId, EnrollmentStatus status, int page, int size) {
        Page<Enrollment> result = enrollments.findAll((root, query, cb) -> {
            List<Predicate> filters = new ArrayList<>();
            if (studentId != null) filters.add(cb.equal(root.get("studentId"), studentId));
            if (classId != null) filters.add(cb.equal(root.get("classGroupId"), classId));
            if (status != null) filters.add(cb.equal(root.get("status"), status));
            return cb.and(filters.toArray(Predicate[]::new));
        }, paging(page, size));
        List<EnrollmentResponse> mapped = enrollments(result.getContent());
        return PageResponse.from(new PageImpl<>(mapped, result.getPageable(), result.getTotalElements()));
    }

    private Pageable paging(int page, int size) {
        if (page < 0 || size < 1 || size > 100) throw new BusinessException(ErrorCode.INVALID_PAGINATION);
        return PageRequest.of(page, size, Sort.by("id").descending());
    }
}
