package com.viettritutor.repository;

import com.viettritutor.enums.SubmissionStatus;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.jdbc.AutoConfigureTestDatabase;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.data.domain.PageRequest;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;

import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.SQLException;
import java.time.OffsetDateTime;
import java.util.Objects;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;

/**
 * PostgreSQL cannot infer the type of an untyped null bind in "? is null" (H2 can), so the
 * student homework list must be checked on a real PostgreSQL schema.
 */
@EnabledIfEnvironmentVariable(named = "CART_POSTGRES_URL", matches = "jdbc:postgresql:.*")
@DataJpaTest(properties = {"spring.flyway.enabled=false", "spring.jpa.hibernate.ddl-auto=create-drop"})
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.NONE)
class HomeworkRepositoryPostgresTest {
    private static final String SCHEMA = "homework_test_" + UUID.randomUUID().toString().replace("-", "");

    @Autowired
    private HomeworkRepository homeworkRepository;

    private static String required(String name) {
        return Objects.requireNonNull(System.getenv(name), "Set " + name);
    }

    private static Connection connect() throws SQLException {
        return DriverManager.getConnection(required("CART_POSTGRES_URL"), required("CART_POSTGRES_USER"),
                required("CART_POSTGRES_PASSWORD"));
    }

    @DynamicPropertySource
    static void postgres(DynamicPropertyRegistry r) throws Exception {
        String url = required("CART_POSTGRES_URL");
        try (var connection = connect(); var statement = connection.createStatement()) {
            statement.execute("CREATE SCHEMA " + SCHEMA);
        }
        r.add("spring.datasource.url", () -> url + (url.contains("?") ? "&" : "?") + "currentSchema=" + SCHEMA);
        r.add("spring.datasource.username", () -> required("CART_POSTGRES_USER"));
        r.add("spring.datasource.password", () -> required("CART_POSTGRES_PASSWORD"));
        r.add("spring.datasource.driver-class-name", () -> "org.postgresql.Driver");
    }

    @AfterAll
    static void removeTestSchema() throws Exception {
        if (!SCHEMA.matches("homework_test_[a-f0-9]{32}")) throw new IllegalStateException("Unsafe test schema");
        try (var connection = connect(); var statement = connection.createStatement()) {
            statement.execute("DROP SCHEMA " + SCHEMA + " CASCADE");
        }
    }

    @Test
    void studentHomeworkListAcceptsMissingOptionalFilters() {
        assertThatCode(() -> homeworkRepository.findStudentHomeworks(1L, null, null, null, PageRequest.of(0, 20)))
                .doesNotThrowAnyException();
        OffsetDateTime now = OffsetDateTime.now();
        assertThat(homeworkRepository.findStudentHomeworks(1L, SubmissionStatus.NOT_STARTED, now.minusDays(1),
                now.plusDays(1), PageRequest.of(0, 20)).getTotalElements()).isZero();
        assertThat(homeworkRepository.findStudentHomeworks(1L, null, now, null, PageRequest.of(0, 20))
                .getTotalElements()).isZero();
    }
}
