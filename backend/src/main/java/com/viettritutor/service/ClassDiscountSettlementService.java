package com.viettritutor.service;

import com.viettritutor.entity.ClassGroup;
import com.viettritutor.entity.Enrollment;
import com.viettritutor.enums.ClassType;
import com.viettritutor.enums.EnrollmentStatus;
import com.viettritutor.repository.EnrollmentRepository;
import com.viettritutor.repository.PaymentIntentRepository;
import com.viettritutor.repository.PaymentRepository;
import com.viettritutor.repository.RefundRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;

/**
 * Students pay the full price on enrollment. When a group class is closed, each active enrollment
 * is credited the difference to the final group-size tier price (BR-02.11), at most once.
 */
@Service
@RequiredArgsConstructor
public class ClassDiscountSettlementService {
    private final EnrollmentRepository enrollments;
    private final PaymentRepository payments;
    private final PaymentIntentRepository intents;
    private final RefundRepository refunds;
    private final PricingService pricing;
    private final WalletService wallet;

    @Transactional
    public void settle(ClassGroup classGroup) {
        if (classGroup.getClassType() != ClassType.GROUP || classGroup.getCourse() == null) return;
        List<Enrollment> active = enrollments.findByClassGroupIdAndStatusOrderByStudentId(classGroup.getId(), EnrollmentStatus.ACTIVE);
        if (active.size() < 2) return;
        BigDecimal rate = pricing.discount(ClassType.GROUP, active.size() - 1);
        BigDecimal classPrice = classGroup.getCourse().priceFor(classGroup.getTotalSessions());
        for (Enrollment enrollment : active) {
            // A refund already requested was sized on the full fee; crediting now would return the discount twice.
            if (refunds.findByPaymentId(enrollment.getPaymentId()).isPresent()) continue;
            BigDecimal target = pricing.estimate(lockedFullPrice(enrollment, classPrice), rate);
            BigDecimal credit = enrollment.getFeeCharged().subtract(target);
            if (credit.signum() > 0 && wallet.creditClassDiscount(enrollment.getStudentId(), enrollment.getId(), credit,
                    "Hoàn " + rate.movePointRight(2).stripTrailingZeros().toPlainString() + "% học phí lớp "
                            + classGroup.getClassCode() + " (lớp chốt " + active.size() + " học viên)")) {
                enrollment.setDiscountRate(rate);
            }
        }
    }

    /**
     * Undiscounted price this student was quoted (BR-02.04: the price is locked at enrollment, so a later course price
     * change must not move the credit). Intents record the rate behind the charged fee; intents created before that
     * column existed have no record, so they fall back to the class's current price.
     */
    private BigDecimal lockedFullPrice(Enrollment enrollment, BigDecimal currentClassPrice) {
        BigDecimal quoted = payments.findById(enrollment.getPaymentId())
                .flatMap(payment -> intents.findById(payment.getIntentId()))
                .map(intent -> intent.getDiscountRate()).orElse(null);
        if (quoted == null) return currentClassPrice;
        return enrollment.getFeeCharged().divide(BigDecimal.ONE.subtract(quoted), 0, RoundingMode.HALF_UP);
    }
}
