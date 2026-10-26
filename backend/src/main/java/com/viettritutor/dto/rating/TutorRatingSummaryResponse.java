package com.viettritutor.dto.rating;

import java.math.BigDecimal;

public record TutorRatingSummaryResponse(
        Long tutorId,
        BigDecimal averageRating,
        long totalRatings
) {}