package com.viettritutor.dto.rating;

import java.math.BigDecimal;

public record TutorRatingSummaryResponse(
        Long tutorId,
        String tutorName,
        BigDecimal averageRating,
        long totalRatings
) {}