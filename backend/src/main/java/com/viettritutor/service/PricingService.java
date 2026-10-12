package com.viettritutor.service;

import com.viettritutor.enums.ClassType;
import org.springframework.stereotype.Service;
import java.math.BigDecimal;
import java.math.RoundingMode;

@Service
public class PricingService {
    public BigDecimal discount(ClassType type, long currentStudents) {
        if (type == ClassType.ONE_ON_ONE) return BigDecimal.ZERO;
        long nextSize = currentStudents + 1;
        // The first group seat uses the documented provisional 20% policy.
        return new BigDecimal(nextSize <= 3 ? "0.20" : nextSize <= 5 ? "0.35" : "0.40");
    }

    public BigDecimal estimate(BigDecimal basePrice, BigDecimal discount) {
        return basePrice.multiply(BigDecimal.ONE.subtract(discount)).setScale(0, RoundingMode.HALF_UP);
    }
}
