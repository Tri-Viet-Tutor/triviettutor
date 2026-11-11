package com.viettritutor.dto.payroll;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/** Body of POST /tutor/payroll/{year}/{month}/dispute. */
public record PayrollDisputeRequest(@NotBlank @Size(min=10,max=1000) String reason) {}
