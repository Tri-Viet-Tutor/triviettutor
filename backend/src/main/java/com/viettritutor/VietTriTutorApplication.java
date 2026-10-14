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
        // 1. Nạp biến môi trường từ .env (hỗ trợ cả root và backend/)
        try {
            java.io.File envFile = new java.io.File(".env");
            java.io.File backendEnvFile = new java.io.File("backend/.env");
            io.github.cdimascio.dotenv.DotenvBuilder builder = io.github.cdimascio.dotenv.Dotenv.configure().ignoreIfMissing();
            if (!envFile.exists() && backendEnvFile.exists()) {
                builder.directory("backend");
            }
            io.github.cdimascio.dotenv.Dotenv dotenv = builder.load();
            dotenv.entries().forEach(entry -> {
                if (System.getProperty(entry.getKey()) == null) {
                    System.setProperty(entry.getKey(), entry.getValue());
                }
            });
        } catch (Exception e) {
            System.err.println("⚠️ [WARN] Không thể nạp file .env: " + e.getMessage());
        }

        // 2. Pre-flight check biến cấu hình
        validateEnvironment();

        // 3. Khởi chạy Spring Boot với khối bắt lỗi chẩn đoán
        try {
            SpringApplication.run(VietTriTutorApplication.class, args);
        } catch (Throwable t) {
            printDiagnosticError(t);
            System.exit(1);
        }
    }

    private static void validateEnvironment() {
        String dbUrl = System.getProperty("DB_URL", System.getenv("DB_URL"));
        if (dbUrl == null || dbUrl.isBlank()) {
            System.err.println("⚠️ [CẢNH BÁO] Chưa tìm thấy biến DB_URL! Hãy đảm bảo file .env có chứa DB_URL.");
        }
    }

    private static void printDiagnosticError(Throwable t) {
        Throwable root = t;
        while (root.getCause() != null && root.getCause() != root) {
            root = root.getCause();
        }

        String rootName = root.getClass().getSimpleName();
        String rootMsg = root.getMessage() != null ? root.getMessage() : "Không có mô tả lỗi.";

        System.err.println("\n" + "=".repeat(75));
        System.err.println("❌ KHỞI ĐỘNG BACKEND THẤT BẠI! (BACKEND STARTUP ERROR)");
        System.err.println("=".repeat(75));

        if (rootMsg.contains("Schema-validation") || rootName.contains("SchemaManagementException")) {
            System.err.println("📌 LOẠI LỖI: LỆCH SCHEMA DATABASE (DATABASE SCHEMA MISMATCH)");
            System.err.println("👉 CHI TIẾT: " + rootMsg);
            System.err.println("💡 GỢI Ý KHẮC PHỤC:");
            System.err.println("   - Database trên Supabase đang thiếu cột hoặc bảng mà Java Entity yêu cầu.");
            System.err.println("   - Kiểm tra xem Flyway migration mới nhất đã được áp dụng lên DB chưa.");
        } else if (rootMsg.contains("password authentication failed") || rootMsg.contains("FATAL: password")) {
            System.err.println("📌 LOẠI LỖI: SAI MẬT KHẨU HOẶC TÀI KHOẢN DATABASE");
            System.err.println("👉 CHI TIẾT: " + rootMsg);
            System.err.println("💡 GỢI Ý KHẮC PHỤC:");
            System.err.println("   - Kiểm tra DB_USERNAME và DB_PASSWORD trong file backend/.env.");
        } else if (rootMsg.contains("Connection refused") || rootMsg.contains("connection to server") || rootName.contains("CannotGetJdbcConnectionException")) {
            System.err.println("📌 LOẠI LỖI: KHÔNG KẾT NỐI ĐƯỢC TỚI DATABASE");
            System.err.println("👉 CHI TIẾT: " + rootMsg);
            System.err.println("💡 GỢI Ý KHẮC PHỤC:");
            System.err.println("   - Kiểm tra DB_URL trong .env, cổng 5432, hoặc kiểm tra kết nối mạng Internet.");
        } else if (rootMsg.contains("Could not resolve placeholder") || rootName.contains("IllegalArgumentException")) {
            System.err.println("📌 LOẠI LỖI: THIẾU BIẾN MÔI TRƯỜNG CẤU HÌNH");
            System.err.println("👉 CHI TIẾT: " + rootMsg);
            System.err.println("💡 GỢI Ý KHẮC PHỤC:");
            System.err.println("   - Kiểm tra tên biến trong application.yml và bổ sung vào backend/.env.");
        } else if (rootMsg.contains("Address already in use") || rootName.contains("PortInUseException")) {
            System.err.println("📌 LOẠI LỖI: CỔNG 8080 ĐANG BỊ CHIẾM DỤNG (PORT IN USE)");
            System.err.println("👉 CHI TIẾT: " + rootMsg);
            System.err.println("💡 GỢI Ý KHẮC PHỤC:");
            System.err.println("   - Tiến trình khác hoặc backend cũ đang chạy ngầm trên port 8080.");
            System.err.println("   - Dùng lệnh tắt: netstat -ano | findstr :8080 và taskkill /F /PID <pid>.");
        } else {
            System.err.println("📌 NGUYÊN NHÂN GỐC (" + rootName + "):");
            System.err.println("👉 " + rootMsg);
            System.err.println("💡 GỢI Ý: Xem chi tiết stack trace bên dưới để biết vị trí lỗi.");
        }

        System.err.println("=".repeat(75) + "\n");
    }
}
