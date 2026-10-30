package com.viettritutor.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.util.function.IntSupplier;

@Component
@RequiredArgsConstructor
@Slf4j
public class SessionLifecycleJob {

    private final SessionLifecycleService lifecycleService;

    @Scheduled(fixedDelayString = "${app.jobs.session-lifecycle-delay-ms:60000}")
    public void run() {
        // Each step is isolated so a failure in one never skips the steps after it.
        step("advanceStartedClasses", lifecycleService::advanceStartedClasses);
        step("advanceEligibleSessions", lifecycleService::advanceEligibleSessions);
        step("resolveExpiredPendingReschedules", lifecycleService::resolveExpiredPendingReschedules);
        step("evaluateAllClasses", lifecycleService::evaluateAllClasses);
        step("evaluateRegistrationDeadlines", lifecycleService::evaluateRegistrationDeadlines);
    }

    private void step(String name, IntSupplier action) {
        try {
            int changed = action.getAsInt();
            log.debug("Session lifecycle step {} affected {} record(s)", name, changed);
        } catch (RuntimeException ex) {
            log.error("Session lifecycle step {} failed", name, ex);
        }
    }
}
