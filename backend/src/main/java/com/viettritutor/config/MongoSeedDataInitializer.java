package com.viettritutor.config;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import com.fasterxml.jackson.databind.DeserializationFeature;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import com.viettritutor.document.MeetingParticipantLog;
import com.viettritutor.document.MeetingSessionLog;
import com.viettritutor.repository.mongo.MeetingParticipantLogRepository;
import com.viettritutor.repository.mongo.MeetingSessionLogRepository;
import lombok.Getter;
import lombok.Setter;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.context.annotation.Profile;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Component;

import java.io.InputStream;
import java.util.List;

/**
 * Automatically seeds local MongoDB with meeting session and participant logs on startup
 * if the collections are empty, ensuring offline and Docker local setups work out-of-the-box.
 */
@Component
@Profile("dev")
@Slf4j
public class MongoSeedDataInitializer implements ApplicationRunner {

    private final MeetingSessionLogRepository sessionLogRepository;
    private final MeetingParticipantLogRepository participantLogRepository;

    public MongoSeedDataInitializer(
            MeetingSessionLogRepository sessionLogRepository,
            MeetingParticipantLogRepository participantLogRepository) {
        this.sessionLogRepository = sessionLogRepository;
        this.participantLogRepository = participantLogRepository;
    }

    @Override
    public void run(ApplicationArguments args) {
        try {
            long existingCount = sessionLogRepository.count();
            if (existingCount > 0) {
                log.info("MongoDB meeting logs already populated (count: {}), skipping seed.", existingCount);
                return;
            }

            ClassPathResource resource = new ClassPathResource("data/mongo_meeting_logs_seed.json");
            if (!resource.exists()) {
                log.warn("Mongo seed file data/mongo_meeting_logs_seed.json not found on classpath.");
                return;
            }

            ObjectMapper mapper = new ObjectMapper();
            mapper.registerModule(new JavaTimeModule());
            mapper.configure(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES, false);

            try (InputStream is = resource.getInputStream()) {
                MongoSeedData seedData = mapper.readValue(is, MongoSeedData.class);

                if (seedData.getMeetingSessionLogs() != null && !seedData.getMeetingSessionLogs().isEmpty()) {
                    sessionLogRepository.saveAll(seedData.getMeetingSessionLogs());
                    log.info("Seeded {} meeting session logs into MongoDB.", seedData.getMeetingSessionLogs().size());
                }

                if (seedData.getMeetingParticipantLogs() != null && !seedData.getMeetingParticipantLogs().isEmpty()) {
                    participantLogRepository.saveAll(seedData.getMeetingParticipantLogs());
                    log.info("Seeded {} meeting participant logs into MongoDB.", seedData.getMeetingParticipantLogs().size());
                }
            }
        } catch (Exception e) {
            log.warn("Could not auto-seed MongoDB meeting logs (MongoDB might be offline or initializing): {}", e.getMessage());
        }
    }

    @Getter
    @Setter
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class MongoSeedData {
        @JsonProperty("meeting_session_logs")
        private List<MeetingSessionLog> meetingSessionLogs;

        @JsonProperty("meeting_participant_logs")
        private List<MeetingParticipantLog> meetingParticipantLogs;
    }
}
