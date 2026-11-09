package com.viettritutor.repository;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;

import java.nio.file.Files;
import java.nio.file.Path;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.ResultSet;
import java.util.Comparator;
import java.util.Objects;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Applies the real migrations in a disposable PostgreSQL schema and checks that a Google-only
 * account (no local password, as OAuth2LoginSuccessHandler creates it) can be stored.
 */
@EnabledIfEnvironmentVariable(named = "CART_POSTGRES_URL", matches = "jdbc:postgresql:.*")
class GoogleOnlyUserPostgresTest {

    private static String required(String name) {
        return Objects.requireNonNull(System.getenv(name), "Set " + name);
    }

    @Test
    void migrationsAllowUserWithoutPassword() throws Exception {
        String schema = "google_user_test_" + UUID.randomUUID().toString().replace("-", "");
        try (Connection connection = DriverManager.getConnection(
                required("CART_POSTGRES_URL"), required("CART_POSTGRES_USER"), required("CART_POSTGRES_PASSWORD"));
             var statement = connection.createStatement()) {
            connection.setAutoCommit(false);
            try {
                statement.execute("CREATE SCHEMA " + schema);
                statement.execute("SET LOCAL search_path TO " + schema);
                try (var files = Files.list(Path.of("src/main/resources/db/migration"))) {
                    for (Path file : files.filter(p -> p.getFileName().toString().matches("V[0-9]+__.*[.]sql"))
                            .sorted(Comparator.comparingInt(p -> Integer.parseInt(p.getFileName().toString().split("__")[0].substring(1))))
                            .toList()) {
                        statement.execute(Files.readString(file).replace("SCHEMA public", "SCHEMA " + schema));
                    }
                }
                statement.execute("INSERT INTO users (email, password, full_name, role, enabled, google_id) "
                        + "VALUES ('google-only@example.test', NULL, 'Google User', 'ROLE_STUDENT', true, 'google-sub-1')");
                try (ResultSet rs = statement.executeQuery(
                        "SELECT password IS NULL FROM users WHERE email = 'google-only@example.test'")) {
                    assertTrue(rs.next() && rs.getBoolean(1));
                }
            } finally {
                // Nothing in this test is kept: the schema and its rows vanish with the rollback.
                connection.rollback();
            }
        }
    }
}
