package com.viettritutor;

import com.viettritutor.entity.User;
import com.viettritutor.repository.UserRepository;
import org.springframework.boot.ApplicationRunner;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.UUID;

/**
 * Local HTTP/Swagger test server. Test sources are excluded from the production jar.
 * Uses an in-memory database and binds only to loopback.
 */
public class CourseTestServer {
    public static void main(String[] args) {
        if (System.getenv("COURSE_TEST_PASSWORD") == null || System.getenv("COURSE_TEST_PASSWORD").isBlank()) {
            throw new IllegalStateException("Set COURSE_TEST_PASSWORD through scripts/start-course-test-backend.ps1");
        }
        SpringApplication app = new SpringApplication(VietTriTutorApplication.class, TestUsers.class);
        app.run(
                "--spring.profiles.active=course-test",
                "--server.address=127.0.0.1",
                "--server.port=" + System.getenv().getOrDefault("COURSE_TEST_PORT", "8080"),
                "--spring.datasource.url=jdbc:h2:mem:course-http-test;MODE=PostgreSQL;DB_CLOSE_DELAY=-1",
                "--spring.datasource.driver-class-name=org.h2.Driver",
                "--spring.datasource.username=sa", "--spring.datasource.password=",
                "--spring.jpa.hibernate.ddl-auto=create-drop", "--spring.jpa.show-sql=false",
                "--spring.flyway.enabled=false",
                "--spring.mail.host=127.0.0.1", "--spring.mail.port=1",
                "--spring.mail.username=test@example.test", "--spring.mail.password=unused",
                "--app.jwt.secret=" + UUID.randomUUID() + UUID.randomUUID());
    }

    @TestConfiguration(proxyBeanMethods = false)
    static class TestUsers {
        @Bean
        ApplicationRunner seedCourseTestUsers(UserRepository users, PasswordEncoder encoder) {
            return args -> {
                String hash = encoder.encode(System.getenv("COURSE_TEST_PASSWORD"));
                for (String role : new String[]{"ADMIN", "TUTOR", "STUDENT"}) {
                    users.saveAndFlush(User.builder().email(role.toLowerCase() + "@course-test.local")
                            .password(hash).fullName("Course Test " + role)
                            .role("ROLE_" + role).enabled(true).build());
                }
            };
        }
    }
}