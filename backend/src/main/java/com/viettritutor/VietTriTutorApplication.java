package com.viettritutor;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

/**
 * VietTriTutor Spring Boot Application entry point.
 *
 * Architecture overview:
 *  - Modules are organized by business domain under com.viettritutor.modules.*
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
