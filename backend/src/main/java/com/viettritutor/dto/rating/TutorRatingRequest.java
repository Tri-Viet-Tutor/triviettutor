package com.viettritutor.dto.rating;

import jakarta.validation.constraints.*;

import java.math.BigDecimal;

public record TutorRatingRequest(
        @NotNull Long classGroupId,
        @NotNull
        @DecimalMin("1.0")
        @DecimalMax("5.0")
        @Digits(integer = 1, fraction = 1)
        BigDecimal rating,

        @Size(max = 2000) // matches tutor_reviews.comment VARCHAR(2000) (V18)
        String comment
) {}
