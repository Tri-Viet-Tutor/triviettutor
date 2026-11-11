package com.viettritutor.service.impl;

import com.viettritutor.enums.ClassType;
import com.viettritutor.service.PricingService;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;

@Service
public class PricingServiceImpl implements PricingService {

    @Override
    public BigDecimal discount(ClassType type, long currentStudents) {
        if (type == ClassType.ONE_ON_ONE) return BigDecimal.ZERO;
        // Học viên đầu tiên của lớp nhóm tạm tính bậc 2–3 (chính sách tạm thời đã ghi trong tài liệu phân công).
        long nextSize = Math.max(2, currentStudents + 1);
        return TIERS.stream().filter(tier -> nextSize <= tier.maxStudents()).findFirst()
                .orElse(TIERS.getLast()).discountRate();
    }
}
