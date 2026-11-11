package com.viettritutor;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.ConfigurationPropertiesScan;
import org.springframework.scheduling.annotation.EnableScheduling;

import java.nio.file.Files;
import java.nio.file.Path;

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
@ConfigurationPropertiesScan
@EnableScheduling
public class VietTriTutorApplication {

    public static void main(String[] args) {
        // 1. Nap bien moi truong tu .env (ho tro ca root va backend/)
        try {
            loadEnvironment(Path.of(""));
        } catch (Exception e) {
            System.err.println("[WARN] Khong the nap file .env: " + e.getMessage());
        }

        // 2. Pre-flight check bien cau hinh
        validateEnvironment();

        // 3. Khoi chay Spring Boot voi khoi bat loi chan doan
        try {
            SpringApplication.run(VietTriTutorApplication.class, args);
        } catch (Throwable t) {
            printDiagnosticError(t);
            System.exit(1);
        }
    }

    static void loadEnvironment(Path workingDirectory) {
        Path projectRoot = workingDirectory.toAbsolutePath().normalize();
        if (projectRoot.getFileName() != null
                && projectRoot.getFileName().toString().equals("backend")
                && Files.isRegularFile(projectRoot.resolve("pom.xml"))) {
            projectRoot = projectRoot.getParent();
        }

        Path envFile = projectRoot.resolve(".env");
        if (!Files.isRegularFile(envFile)) {
            envFile = projectRoot.resolve("backend/.env");
        }
        if (!Files.isRegularFile(envFile)) {
            return;
        }

        var dotenv = io.github.cdimascio.dotenv.Dotenv.configure()
                .directory(envFile.getParent().toString())
                .load();
        dotenv.entries().forEach(entry -> {
            if (System.getProperty(entry.getKey()) == null && System.getenv(entry.getKey()) == null) {
                System.setProperty(entry.getKey(), entry.getValue());
            }
        });
    }

    private static void validateEnvironment() {
        String dbUrl = System.getProperty("DB_URL", System.getenv("DB_URL"));
        if (dbUrl == null || dbUrl.isBlank()) {
            System.err.println("[CANH BAO] Chua tim thay bien DB_URL! Hay dam bao file .env co chua DB_URL.");
        }
    }

    private static void printDiagnosticError(Throwable t) {
        Throwable root = t;
        while (root.getCause() != null && root.getCause() != root) {
            root = root.getCause();
        }

        String rootName = root.getClass().getSimpleName();
        String rootMsg = root.getMessage() != null ? root.getMessage() : "Khong co mo ta loi.";

        System.err.println("\n" + "=".repeat(75));
        System.err.println("KHOI DONG BACKEND THAT BAI! (BACKEND STARTUP ERROR)");
        System.err.println("=".repeat(75));
        if (rootMsg.contains("Schema-validation") || rootName.contains("SchemaManagementException")) {
            System.err.println("LOAI LOI: LECH SCHEMA DATABASE (DATABASE SCHEMA MISMATCH)");
            System.err.println("CHI TIET: " + rootMsg);
            System.err.println("GOI Y KHAC PHUC:");
            System.err.println("   - Database dang thieu cot hoac bang ma Java Entity yeu cau.");
            System.err.println("   - Tao file migration Flyway moi (hoac them cot vao DB) de dong bo voi Entity.");
        } else if (rootMsg.contains("password authentication failed") || rootMsg.contains("FATAL: password")) {
            System.err.println("CHI TIET: " + rootMsg);
            System.err.println("GOI Y KHAC PHUC:");
            System.err.println("   - Kiem tra DB_USERNAME va DB_PASSWORD trong file backend/.env.");
        } else if (rootMsg.contains("Connection refused") || rootMsg.contains("connection to server") || rootName.contains("CannotGetJdbcConnectionException")) {
            System.err.println("LOAI LOI: KHONG KET NOI DUOC TOI DATABASE");
            System.err.println("CHI TIET: " + rootMsg);
            System.err.println("GOI Y KHAC PHUC:");
            System.err.println("   - Kiem tra DB_URL trong .env, cong 5432, hoac kiem tra ket noi mang Internet.");
        } else if (rootMsg.contains("Could not resolve placeholder") || rootName.contains("IllegalArgumentException")) {
            System.err.println("LOAI LOI: THIEU BIEN MOI TRUONG CAU HINH");
            System.err.println("CHI TIET: " + rootMsg);
            System.err.println("GOI Y KHAC PHUC:");
            System.err.println("   - Kiem tra ten bien trong application.yml va bo sung vao backend/.env.");
        } else if (rootMsg.contains("Address already in use") || rootName.contains("PortInUseException")) {
            System.err.println("LOAI LOI: CONG 8080 DANG BI CHIEM DUNG (PORT IN USE)");
            System.err.println("CHI TIET: " + rootMsg);
            System.err.println("GOI Y KHAC PHUC:");
            System.err.println("   - Tien trinh khac hoac backend cu dang chay ngam tren port 8080.");
            System.err.println("   - Dung lenh tat: netstat -ano | findstr :8080 va taskkill /F /PID <pid>.");
        } else {
            System.err.println("NGUYEN NHAN GOC (" + rootName + "):");
            System.err.println(rootMsg);
            System.err.println("GOI Y: Xem chi tiet stack trace ben duoi de biet vi tri loi.");
        }

        System.err.println("=".repeat(75) + "\n");
    }
}
