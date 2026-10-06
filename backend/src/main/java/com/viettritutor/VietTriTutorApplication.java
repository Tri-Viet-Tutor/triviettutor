package com.viettritutor;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

/**
 * VietTriTutor Spring Boot Application entry point.
 *
 * Architecture overview:
 *  - REST endpoints live under com.viettritutor.controller.*
 *  - Business logic lives under com.viettritutor.service.*
 *  - Persistence lives under com.viettritutor.repository.* and entity.*
 *  - Request/response DTOs are grouped by feature under com.viettritutor.dto.*
 *  - Shared utilities live under com.viettritutor.common.*
 *  - Security (JWT) lives under com.viettritutor.security.*
 *  - Configuration beans live under com.viettritutor.config.*
 */
@SpringBootApplication
public class VietTriTutorApplication {

    public static void main(String[] args) {
        SpringApplication.run(VietTriTutorApplication.class, args);
    }
}
