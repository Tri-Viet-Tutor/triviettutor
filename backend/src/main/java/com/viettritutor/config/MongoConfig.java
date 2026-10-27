package com.viettritutor.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.data.mongodb.config.EnableMongoAuditing;
import org.springframework.data.mongodb.repository.config.EnableMongoRepositories;

/**
 * Configuration for MongoDB repositories and auditing.
 */
@Configuration
@EnableMongoAuditing
@EnableMongoRepositories(basePackages = "com.viettritutor.repository.mongo")
public class MongoConfig {
}
