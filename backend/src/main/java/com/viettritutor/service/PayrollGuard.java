package com.viettritutor.service;

// The payroll module supplies this contract to protect finalized payroll periods.
public interface PayrollGuard {
    void assertSessionEditable(Long sessionId);
}
