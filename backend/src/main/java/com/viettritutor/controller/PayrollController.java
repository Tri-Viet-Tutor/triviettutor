package com.viettritutor.controller;
import com.viettritutor.common.api.*;
import com.viettritutor.dto.payroll.*;
import com.viettritutor.entity.User;
import com.viettritutor.security.CurrentUser;
import com.viettritutor.service.PayrollDisputeService;
import com.viettritutor.service.PayrollService;
import io.swagger.v3.oas.annotations.*;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController @RequestMapping("/api/v1") @RequiredArgsConstructor
@Tag(name="Payroll",description="Monthly VND salary from verified completed teaching. Cancelled sessions are reconciliation only.")
public class PayrollController {
    private final PayrollService payroll;
    private final PayrollDisputeService disputes;
    @GetMapping("/admin/payroll/{year}/{month}") @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary="Preview or read monthly payroll",
            description="Read-only. Current baseSalary/rate for DRAFT; immutable snapshots for FINALIZED. Includes cancelled, substituted-out, unresolved sessions and blockingSessionIds.")
    public ApiResponse<PayrollResponse> get(@PathVariable int year,@PathVariable int month,
            @Parameter(hidden=true) @CurrentUser User actor) {
        return ApiResponse.ok(disputes.decorate(payroll.get(year,month,actor)));
    }
    @PostMapping("/admin/payroll/{year}/{month}/finalize") @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary="Finalize monthly payroll",
            description="No body. Requires Idempotency-Key (1-100 letters/digits/._:-), an ended month and no unresolved sessions. Retry of an already finalized month returns the saved snapshot. Key reuse for another month returns 409. This does not transfer money.")
    public ApiResponse<PayrollResponse> finalizePeriod(@PathVariable int year,@PathVariable int month,
            @Parameter(required=true,description="Unique request key; retries return the same finalized period")
            @RequestHeader(value="Idempotency-Key",required=false) String key,
            @Parameter(hidden=true) @CurrentUser User actor) {
        return ApiResponse.ok(payroll.finalizePeriod(year,month,key,actor));
    }
    @GetMapping("/tutor/payroll") @PreAuthorize("hasRole('TUTOR')")
    @Operation(summary="Read the tutor's finalized payroll history",
            description="Only the authenticated tutor. Optional year/month filters; month requires year. page=0, size=20 (1-100). Latest month first; no draft or other tutors' pay.")
    public ApiResponse<PageResponse<PayrollLineResponse>> mine(@RequestParam(required=false) Integer year,
            @RequestParam(required=false) Integer month,@RequestParam(defaultValue="0") int page,
            @RequestParam(defaultValue="20") int size,@Parameter(hidden=true) @CurrentUser User actor) {
        return ApiResponse.ok(disputes.decorate(payroll.mine(year,month,page,size,actor),actor));
    }
}
