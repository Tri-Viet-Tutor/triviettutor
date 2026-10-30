package com.viettritutor.service;

import org.junit.jupiter.api.Test;
import org.mockito.InOrder;

import static org.mockito.Mockito.*;

class SessionLifecycleJobTest {

    @Test
    void runsEveryStepInOrderEvenWhenEarlierStepsFail() {
        SessionLifecycleService service = mock(SessionLifecycleService.class);
        when(service.advanceStartedClasses()).thenThrow(new IllegalStateException("db down"));
        when(service.evaluateAllClasses()).thenThrow(new IllegalStateException("bad class"));

        new SessionLifecycleJob(service).run();

        InOrder order = inOrder(service);
        order.verify(service).advanceStartedClasses();
        order.verify(service).advanceEligibleSessions();
        order.verify(service).resolveExpiredPendingReschedules();
        order.verify(service).evaluateAllClasses();
        order.verify(service).evaluateRegistrationDeadlines();
    }
}
