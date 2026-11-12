package com.viettritutor.service;

import com.viettritutor.common.api.PageResponse;
import com.viettritutor.dto.payroll.PayrollLineResponse;
import com.viettritutor.dto.payroll.PayrollResponse;
import com.viettritutor.entity.User;

/**
 * PAYR-02: a tutor complains about a finalized payslip. The payslip then reads DISPUTED and every
 * active admin is emailed after the complaint is committed. Frozen payroll amounts never change here.
 */
public interface PayrollDisputeService {

    PayrollLineResponse dispute(int year,int month,String reason,User actor);
/** Marks disputed payslips in an admin month view; drafts have no payslips yet. */
    PayrollResponse decorate(PayrollResponse response);
/** Marks disputed payslips in a tutor's own history. */
    PageResponse<PayrollLineResponse> decorate(PageResponse<PayrollLineResponse> page,User actor);
}
