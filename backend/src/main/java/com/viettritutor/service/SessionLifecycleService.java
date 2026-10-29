package com.viettritutor.service;

public interface SessionLifecycleService {
    int advanceStartedClasses();
    int advanceEligibleSessions();
    int resolveExpiredPendingReschedules();
    boolean evaluateClassCompletion(Long classGroupId);
    int evaluateAllClasses();
    int evaluateRegistrationDeadlines();
}
