package com.viettritutor;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

/**
 * VietTriTutor Spring Boot Application entry point.
 *
 * Architecture overview:
 * - REST endpoints live under com.viettritutor.controller.*
 * - Business logic lives under com.viettritutor.service.*
 * - Persistence lives under com.viettritutor.repository.* and entity.*
 * - Request/response DTOs are grouped by feature under com.viettritutor.dto.*
 * - Shared utilities live under com.viettritutor.common.*
 * - Security (JWT) lives under com.viettritutor.security.*
 * - Configuration beans live under com.viettritutor.config.*
 */
@SpringBootApplication
public class VietTriTutorApplication {

    public static void main(String[] args) {
        try {
            io.github.cdimascio.dotenv.Dotenv dotenv = io.github.cdimascio.dotenv.Dotenv.configure()
                    .ignoreIfMissing()
                    .load();
            dotenv.entries().forEach(entry -> {
                if (System.getProperty(entry.getKey()) == null) {
                    System.setProperty(entry.getKey(), entry.getValue());
                }
            });
        } catch (Exception ignored) {
            // In containerized or production environments where .env is not present,
            // ignore.
        }

        SpringApplication.run(VietTriTutorApplication.class, args);
    }
}
