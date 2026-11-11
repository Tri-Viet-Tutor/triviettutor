package com.viettritutor.controller;

import com.viettritutor.common.api.ApiResponse;
import com.viettritutor.dto.payroll.PayrollDisputeRequest;
import com.viettritutor.dto.payroll.PayrollLineResponse;
import com.viettritutor.entity.User;
import com.viettritutor.security.CurrentUser;
import com.viettritutor.service.PayrollDisputeService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController @RequestMapping("/api/v1") @RequiredArgsConstructor
@Tag(name="Payroll",description="Monthly VND salary from verified completed teaching. Cancelled sessions are reconciliation only.")
public class PayrollDisputeController {
    private final PayrollDisputeService disputes;

    @PostMapping("/tutor/payroll/{year}/{month}/dispute") @PreAuthorize("hasRole('TUTOR')")
    @Operation(summary="Complain about the tutor's finalized payslip",
            description="Only the authenticated tutor and a finalized month. One complaint per payslip (409 on repeat). "
                    + "The payslip becomes DISPUTED and active admins are emailed. Amounts are not changed.")
    public ApiResponse<PayrollLineResponse> dispute(@PathVariable int year,@PathVariable int month,
            @Valid @RequestBody PayrollDisputeRequest body,@Parameter(hidden=true) @CurrentUser User actor) {
        return ApiResponse.ok(disputes.dispute(year,month,body.reason(),actor));
    }
}
