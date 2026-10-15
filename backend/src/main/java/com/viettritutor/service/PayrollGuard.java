package com.viettritutor.service;

// The payroll module supplies this contract to protect finalized payroll periods.
public interface PayrollGuard {
    void assertSessionEditable(Long sessionId);
    default void prepareSessionGeneration(java.util.List<java.time.LocalDate> dates) {}
    default void assertDateEditable(java.time.LocalDate date) {}
}
