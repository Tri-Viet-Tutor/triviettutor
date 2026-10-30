package com.viettritutor.config;

import com.mongodb.MongoClientSettings;
import org.junit.jupiter.api.Test;

import java.util.concurrent.TimeUnit;

import static org.junit.jupiter.api.Assertions.assertEquals;

class MongoConfigTest {

    @Test
    void serverSelectionFailsFastInsteadOfTheDriverDefault30s() {
        MongoClientSettings.Builder builder = MongoClientSettings.builder();

        new MongoConfig().mongoTimeoutCustomizer(3000).customize(builder);

        assertEquals(3000, builder.build().getClusterSettings().getServerSelectionTimeout(TimeUnit.MILLISECONDS));
    }
}
