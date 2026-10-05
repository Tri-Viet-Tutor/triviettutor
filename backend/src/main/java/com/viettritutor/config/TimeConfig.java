package com.viettritutor.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableScheduling;

import java.time.Clock;
import java.time.ZoneId;

@Configuration
@EnableScheduling
public class TimeConfig {

    @Bean
    public ZoneId applicationZoneId(@Value("${app.time-zone:Asia/Ho_Chi_Minh}") String timeZone) {
        return ZoneId.of(timeZone);
    }

    @Bean
    public Clock applicationClock(ZoneId applicationZoneId) {
        return Clock.system(applicationZoneId);
    }
}
