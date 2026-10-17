package com.viettritutor.controller;

import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import java.nio.file.*;
import java.sql.*;
import java.util.*;

/** Runs the HTTP/transaction suite on real migrations in a disposable PostgreSQL schema. */
@EnabledIfEnvironmentVariable(named="CART_POSTGRES_URL",matches="jdbc:postgresql:.*")
class CartOrderPostgresTest extends CartOrderHttpTest {
    private static final String SCHEMA="cart_test_"+UUID.randomUUID().toString().replace("-", "");
    private static String required(String name) {
        return Objects.requireNonNull(System.getenv(name),"Set "+name);
    }
    private static Connection connect() throws SQLException {
        return DriverManager.getConnection(required("CART_POSTGRES_URL"),required("CART_POSTGRES_USER"),required("CART_POSTGRES_PASSWORD"));
    }
    @DynamicPropertySource static void postgres(DynamicPropertyRegistry r) throws Exception {
        String url=required("CART_POSTGRES_URL");
        if(url.contains("currentSchema="))throw new IllegalArgumentException("Supply a base URL without currentSchema");
        // UUID schema is created and migrated atomically; public business data is never used.
        try(var connection=connect();var statement=connection.createStatement()) {
            connection.setAutoCommit(false);
            statement.execute("CREATE SCHEMA "+SCHEMA);
            statement.execute("SET LOCAL search_path TO "+SCHEMA);
            try(var files=Files.list(Path.of("src/main/resources/db/migration"))) {
                for(var file:files.filter(p->p.getFileName().toString().matches("V[0-9]+__.*[.]sql"))
                        .sorted(Comparator.comparingInt(p->Integer.parseInt(p.getFileName().toString().split("__")[0].substring(1)))).toList()) {
                    // V7 explicitly names public for grants; scope that security statement to this schema.
                    String sql=Files.readString(file).replace("SCHEMA public", "SCHEMA "+SCHEMA);
                    statement.execute(sql);
                }
            }
            connection.commit();
        }
        r.add("spring.datasource.url",()->url+(url.contains("?")?"&":"?")+"currentSchema="+SCHEMA);
        r.add("spring.datasource.username",()->required("CART_POSTGRES_USER"));
        r.add("spring.datasource.password",()->required("CART_POSTGRES_PASSWORD"));
        r.add("spring.datasource.driver-class-name",()->"org.postgresql.Driver");
        r.add("spring.jpa.hibernate.ddl-auto",()->"validate");
    }
    @AfterAll static void removeTestSchema() throws Exception {
        if(!SCHEMA.matches("cart_test_[a-f0-9]{32}"))throw new IllegalStateException("Unsafe test schema");
        try(var connection=connect();var statement=connection.createStatement()) {
            statement.execute("DROP SCHEMA "+SCHEMA+" CASCADE");
        }
    }
}
