package com.viettritutor.dto.rating;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public record TutorRatingResponse(
        Long id,
        Long studentId,
        Long tutorId,
        BigDecimal rating,
        String comment,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
) {}
