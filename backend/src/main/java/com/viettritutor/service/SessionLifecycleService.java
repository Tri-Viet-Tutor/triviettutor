package com.viettritutor.service;

public interface SessionLifecycleService {
    int advanceEligibleSessions();
    boolean evaluateClassCompletion(Long classGroupId);
    int evaluateAllClasses();
    int evaluateRegistrationDeadlines();
}
