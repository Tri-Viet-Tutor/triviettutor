
package com.viettritutor.dto.user;

import com.fasterxml.jackson.annotation.JsonInclude;
import io.swagger.v3.oas.annotations.media.Schema;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public record MeResponse(
        Long id,
        String email,
        String fullName,
        String role,
        LocalDateTime createdAt,

        @JsonInclude(JsonInclude.Include.ALWAYS)
        @Schema(oneOf = {
                StudentProfileResponse.class,
                TutorProfileResponse.class
        })
        Profile profile
) {

    public interface Profile {
    }

    public record StudentProfileResponse(
            String phone,
            String address
    ) implements Profile {
    }

    public record TutorProfileResponse(
            BigDecimal baseSalary,
            BigDecimal sessionRate,
            String bio
    ) implements Profile {
    }
}
