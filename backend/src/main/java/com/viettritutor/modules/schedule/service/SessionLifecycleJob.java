package com.viettritutor.modules.schedule.service;

import lombok.RequiredArgsConstructor;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class SessionLifecycleJob {

    private final SessionLifecycleService lifecycleService;

    @Scheduled(fixedDelayString = "${app.jobs.session-lifecycle-delay-ms:60000}")
    public void run() {
        lifecycleService.advanceEligibleSessions();
        lifecycleService.evaluateAllClasses();
    }
}
