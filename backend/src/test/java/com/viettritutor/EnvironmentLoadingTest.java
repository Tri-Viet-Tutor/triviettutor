package com.viettritutor;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.core.env.StandardEnvironment;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;

import static org.assertj.core.api.Assertions.assertThat;

class EnvironmentLoadingTest {
    private static final String KEY = "VIETTRITUTOR_ENV_LOADING_TEST";
    private final String originalValue = System.getProperty(KEY);

    @TempDir
    Path projectRoot;

    @AfterEach
    void restoreProperty() {
        if (originalValue == null) {
            System.clearProperty(KEY);
        } else {
            System.setProperty(KEY, originalValue);
        }
    }

    @ParameterizedTest
    @ValueSource(booleans = {false, true})
    void rootEnvironmentTakesPrecedenceFromEitherLaunchDirectory(boolean fromBackend) throws IOException {
        Path backend = createBackend();
        Files.writeString(projectRoot.resolve(".env"), KEY + "=root-value\n");
        Files.writeString(backend.resolve(".env"), KEY + "=backend-value\n");

        VietTriTutorApplication.loadEnvironment(fromBackend ? backend : projectRoot);

        assertThat(new StandardEnvironment().resolveRequiredPlaceholders("${" + KEY + "}"))
                .isEqualTo("root-value");
    }

    @ParameterizedTest
    @ValueSource(booleans = {false, true})
    void fallsBackToBackendEnvironmentFromEitherLaunchDirectory(boolean fromBackend) throws IOException {
        Path backend = createBackend();
        Files.writeString(backend.resolve(".env"), KEY + "=backend-value\n");

        VietTriTutorApplication.loadEnvironment(fromBackend ? backend : projectRoot);

        assertThat(System.getProperty(KEY)).isEqualTo("backend-value");
    }

    @Test
    void missingEnvironmentFileIsAllowedAndDockerEnvironmentIsIgnored() throws IOException {
        Path backend = createBackend();
        Files.writeString(projectRoot.resolve(".env.docker"), KEY + "=docker-value\n");
        System.clearProperty(KEY);

        VietTriTutorApplication.loadEnvironment(backend);

        assertThat(System.getProperty(KEY)).isNull();
    }

    @Test
    void explicitJvmPropertyTakesPrecedence() throws IOException {
        createBackend();
        Files.writeString(projectRoot.resolve(".env"), KEY + "=file-value\n");
        System.setProperty(KEY, "explicit-value");

        VietTriTutorApplication.loadEnvironment(projectRoot);

        assertThat(System.getProperty(KEY)).isEqualTo("explicit-value");
    }

    private Path createBackend() throws IOException {
        Path backend = Files.createDirectory(projectRoot.resolve("backend"));
        Files.createFile(backend.resolve("pom.xml"));
        return backend;
    }
}
