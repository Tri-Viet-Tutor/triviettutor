package com.viettritutor.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableAsync;

/**
 * Enables @Async so slow work (sending one email per student) runs on Spring Boot's
 * applicationTaskExecutor instead of holding the HTTP request.
 */
@Configuration
@EnableAsync
public class AsyncConfig {
}
