package com.viettritutor.config;

import org.springframework.context.annotation.ComponentScan;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.FilterType;
import org.springframework.data.jpa.repository.config.EnableJpaRepositories;

/**
 * Configuration for Spring Data JPA repositories, explicitly excluding Mongo repositories.
 */
@Configuration
@EnableJpaRepositories(
        basePackages = "com.viettritutor.repository",
        excludeFilters = @ComponentScan.Filter(
                type = FilterType.REGEX,
                pattern = "com\\.viettritutor\\.repository\\.mongo\\..*"
        )
)
public class JpaConfig {
}
