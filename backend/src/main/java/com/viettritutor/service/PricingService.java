package com.viettritutor.service;

import com.viettritutor.enums.ClassType;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;

/**
 * Học phí theo sĩ số (BR-02.11): mỗi học viên trả học phí gốc 1 kèm 1 × (1 − mức giảm),
 * mức giảm lấy theo sĩ số lớp SAU khi ghi nhận học viên đó.
 * Bảng {@link #TIERS} là nguồn duy nhất: thanh toán dùng {@link #discount}, API khóa học trả {@link #tiers}
 * để frontend hiển thị đúng giá học viên sẽ trả mà không tự chép lại tỷ lệ.
 */
public interface PricingService {

    /** Một bậc giá: sĩ số từ {@code minStudents} đến {@code maxStudents} được giảm {@code discountRate}. */
    record Tier(int minStudents, int maxStudents, BigDecimal discountRate) {}

    /** 1 kèm 1 không giảm; nhóm 2–3 giảm 20%, 4–5 giảm 35%, 6–8 giảm 40%. */
    List<Tier> TIERS = List.of(
            new Tier(1, 1, BigDecimal.ZERO),
            new Tier(2, 3, new BigDecimal("0.20")),
            new Tier(4, 5, new BigDecimal("0.35")),
            new Tier(6, 8, new BigDecimal("0.40")));

    /** Một bậc giá trong response: sĩ số, mức giảm và số tiền mỗi học viên trả. */
    record PriceTier(int minStudents, int maxStudents, BigDecimal discountRate, BigDecimal pricePerStudent) {}

    BigDecimal discount(ClassType type, long currentStudents);

    default BigDecimal estimate(BigDecimal basePrice, BigDecimal discount) {
        return price(basePrice, discount);
    }

    /** Học phí mỗi học viên theo từng bậc sĩ số của một khóa có học phí gốc {@code basePrice}. */
    static List<PriceTier> tiers(BigDecimal basePrice) {
        return TIERS.stream().map(tier -> new PriceTier(tier.minStudents(), tier.maxStudents(), tier.discountRate(),
                basePrice == null ? null : price(basePrice, tier.discountRate()))).toList();
    }

    private static BigDecimal price(BigDecimal basePrice, BigDecimal discount) {
        return basePrice.multiply(BigDecimal.ONE.subtract(discount)).setScale(0, RoundingMode.HALF_UP);
    }
}
