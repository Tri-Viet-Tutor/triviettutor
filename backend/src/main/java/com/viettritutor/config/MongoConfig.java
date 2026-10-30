package com.viettritutor.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.mongo.MongoClientSettingsBuilderCustomizer;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.mongodb.config.EnableMongoAuditing;
import org.springframework.data.mongodb.repository.config.EnableMongoRepositories;

import java.util.concurrent.TimeUnit;

/**
 * Configuration for MongoDB repositories and auditing.
 */
@Configuration
@EnableMongoAuditing
@EnableMongoRepositories(basePackages = "com.viettritutor.repository.mongo")
public class MongoConfig {

    /**
     * MongoDB only stores optional meeting audit logs. The driver's default 30s server selection
     * timeout made every classroom token request and LiveKit webhook hang for 30s while MongoDB
     * was unreachable, so fail fast and let callers fall back.
     */
    @Bean
    public MongoClientSettingsBuilderCustomizer mongoTimeoutCustomizer(
            @Value("${app.mongodb.server-selection-timeout-ms:3000}") long serverSelectionTimeoutMs) {
        return builder -> builder.applyToClusterSettings(cluster ->
                cluster.serverSelectionTimeout(serverSelectionTimeoutMs, TimeUnit.MILLISECONDS));
    }
}
