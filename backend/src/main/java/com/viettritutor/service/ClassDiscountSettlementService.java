package com.viettritutor.service;

import com.viettritutor.entity.ClassGroup;
import com.viettritutor.entity.Enrollment;
import com.viettritutor.enums.ClassType;
import com.viettritutor.enums.EnrollmentStatus;
import com.viettritutor.repository.EnrollmentRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;

/**
 * Students pay the full price on enrollment. When a group class is closed, each active enrollment
 * is credited the difference to the final group-size tier price (BR-02.11), at most once.
 */
@Service
@RequiredArgsConstructor
public class ClassDiscountSettlementService {
    private final EnrollmentRepository enrollments;
    private final PricingService pricing;
    private final WalletService wallet;

    @Transactional
    public void settle(ClassGroup classGroup) {
        if (classGroup.getClassType() != ClassType.GROUP || classGroup.getCourse() == null) return;
        List<Enrollment> active = enrollments.findByClassGroupIdAndStatusOrderByStudentId(classGroup.getId(), EnrollmentStatus.ACTIVE);
        if (active.size() < 2) return;
        BigDecimal rate = pricing.discount(ClassType.GROUP, active.size() - 1);
        BigDecimal classPrice = classGroup.getCourse().priceFor(classGroup.getTotalSessions());
        BigDecimal target = pricing.estimate(classPrice, rate);
        for (Enrollment enrollment : active) {
            BigDecimal credit = enrollment.getFeeCharged().subtract(target);
            if (credit.signum() > 0 && wallet.creditClassDiscount(enrollment.getStudentId(), enrollment.getId(), credit,
                    "Hoàn " + rate.movePointRight(2).stripTrailingZeros().toPlainString() + "% học phí lớp "
                            + classGroup.getClassCode() + " (lớp chốt " + active.size() + " học viên)")) {
                enrollment.setDiscountRate(rate);
            }
        }
    }
}
