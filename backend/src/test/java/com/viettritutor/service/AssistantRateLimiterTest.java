package com.viettritutor.service;

import com.viettritutor.common.exception.*;
import com.viettritutor.config.AssistantProperties;
import org.junit.jupiter.api.*;

import java.time.*;

import static org.assertj.core.api.Assertions.*;

class AssistantRateLimiterTest {
    static class MovableClock extends Clock {
        Instant now = Instant.parse("2030-06-01T03:00:00Z");
        @Override public ZoneId getZone() { return ZoneId.of("Asia/Ho_Chi_Minh"); }
        @Override public Clock withZone(ZoneId zone) { return this; }
        @Override public Instant instant() { return now; }
    }

    MovableClock clock = new MovableClock();
    AssistantRateLimiter limiter;

    @BeforeEach void setUp() {
        AssistantProperties properties = new AssistantProperties();
        properties.setMaxPerMinute(2);
        properties.setMaxPerDay(3);
        properties.setGlobalMaxPerDay(4);
        limiter = new AssistantRateLimiter(properties, clock);
    }

    static void assertLimited(Runnable call) {
        assertThatThrownBy(call::run).isInstanceOfSatisfying(BusinessException.class,
                error -> assertThat(error.getErrorCode()).isEqualTo(ErrorCode.ASSISTANT_RATE_LIMITED));
    }

    @Test void perMinuteThenPerDayLimitsApplyToEachRequester() {
        assertThat(limiter.acquire("user:1")).isEqualTo(2);
        assertThat(limiter.acquire("user:1")).isEqualTo(1);
        assertLimited(() -> limiter.acquire("user:1"));
        clock.now = clock.now.plusSeconds(60);
        assertThat(limiter.acquire("user:1")).isZero();
        clock.now = clock.now.plusSeconds(60);
        assertLimited(() -> limiter.acquire("user:1"));
        assertThat(limiter.acquire("ip:10.0.0.1")).isEqualTo(2);
    }

    @Test void globalDailyCapStopsEveryoneAndResetsNextDay() {
        limiter.acquire("user:1"); limiter.acquire("user:2"); limiter.acquire("user:3"); limiter.acquire("user:4");
        assertLimited(() -> limiter.acquire("user:5"));
        clock.now = clock.now.plus(Duration.ofDays(1));
        assertThat(limiter.acquire("user:5")).isEqualTo(2);
    }
}
