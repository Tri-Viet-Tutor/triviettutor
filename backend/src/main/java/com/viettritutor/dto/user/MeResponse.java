package com.viettritutor.dto.user;

import com.fasterxml.jackson.annotation.JsonInclude;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Builder;
import lombok.Data;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@Builder
public class MeResponse {
    private Long id;
    private String email;
    private String fullName;
    private String role;
    private LocalDateTime createdAt;

    @JsonInclude(JsonInclude.Include.ALWAYS)
    private Profile profile;

    @Schema(oneOf = {StudentProfileResponse.class, TutorProfileResponse.class})
    public interface Profile {
    }

    @Data
    @Builder
    public static class StudentProfileResponse implements Profile {
        private String phone;
        private String address;
    }

    @Data
    @Builder
    public static class TutorProfileResponse implements Profile {
        private BigDecimal baseSalary;
        private BigDecimal sessionRate;
        private String bio;
    }
}
