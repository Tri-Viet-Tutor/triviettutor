package com.viettritutor;

import com.viettritutor.dto.learning.*;
import com.viettritutor.entity.*;
import com.viettritutor.enums.*;
import com.viettritutor.repository.*;
import com.viettritutor.service.*;
import org.springframework.boot.*;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;
import java.math.BigDecimal;
import java.time.*;
import java.util.*;

/** Loopback-only HTTP fixtures. Test sources are excluded from the production jar. */
public class HomeworkTestServer {
    public static void main(String[] args) {
        String password = System.getenv("HOMEWORK_TEST_PASSWORD");
        if (password == null || password.isBlank()) throw new IllegalStateException("Set HOMEWORK_TEST_PASSWORD using the local test script");
        new SpringApplication(VietTriTutorApplication.class, Fixtures.class).run(
                "--spring.profiles.active=homework-test", "--server.address=127.0.0.1",
                "--server.port=" + System.getenv().getOrDefault("HOMEWORK_TEST_PORT", "8083"),
                "--spring.datasource.url=jdbc:h2:mem:homework-http;MODE=PostgreSQL;DB_CLOSE_DELAY=-1",
                "--spring.datasource.driver-class-name=org.h2.Driver", "--spring.datasource.username=sa", "--spring.datasource.password=",
                "--spring.jpa.hibernate.ddl-auto=create-drop", "--spring.jpa.show-sql=false", "--spring.flyway.enabled=false",
                "--spring.mail.host=127.0.0.1", "--spring.mail.port=1", "--spring.mail.username=test@example.test", "--spring.mail.password=unused",
                "--logging.level.org.hibernate.SQL=WARN", "--logging.level.org.springframework.web=WARN",
                "--app.jwt.secret=" + UUID.randomUUID() + UUID.randomUUID());
    }

    @TestConfiguration(proxyBeanMethods = false)
    static class Fixtures {
        @Bean
        ApplicationRunner seedHomeworkFixtures(UserRepository users, PasswordEncoder encoder, ClassGroupRepository classes,
                SessionRepository sessions, LearningScheduleService learning, HomeworkService homeworks,
                HomeworkRepository homeworkRepository, SubmissionService submissions, PlatformTransactionManager manager, Clock clock) {
            return args -> new TransactionTemplate(manager).executeWithoutResult(tx -> {
                String hash = encoder.encode(System.getenv("HOMEWORK_TEST_PASSWORD"));
                Map<String, User> actors = new HashMap<>();
                for (String name : List.of("admin", "tutor", "student", "otherTutor", "otherStudent", "student2")) {
                    String role = name.equals("admin") ? "ADMIN" : name.toLowerCase().contains("tutor") ? "TUTOR" : "STUDENT";
                    actors.put(name, users.saveAndFlush(User.builder().email(name.toLowerCase() + "@homework-test.local")
                            .password(hash).fullName("Homework Test " + name).role("ROLE_" + role).enabled(true).build()));
                }
                LocalDate day = LocalDate.now(clock).plusDays(2);
                ClassGroup c = classes.saveAndFlush(ClassGroup.builder().classType(ClassType.GROUP)
                        .status(ClassStatus.ASSIGNED).enrollmentDeadline(day.minusDays(3)).build());
                List<Session> fixtureSessions = new ArrayList<>();
                for (int i = 0; i < 3; i++) {
                    fixtureSessions.add(sessions.saveAndFlush(Session.builder().classGroupId(c.getId()).sessionNumber(i + 1)
                            .sessionDate(day.plusDays(i)).startTime(LocalTime.of(8, 0)).endTime(LocalTime.of(10, 0))
                            .status(SessionStatus.SCHEDULED).scheduledTutorId(actors.get("tutor").getId())
                            .actualTutorId(i == 1 ? actors.get("otherTutor").getId() : null).actualTutorOverridden(i == 1).build()));
                }
                // Invoke the existing enrollment integration boundary with isolated fixture IDs only.
                learning.activate(10001L, actors.get("student").getId(), c.getId(), day, day.plusDays(2));
                learning.activate(10002L, actors.get("student2").getId(), c.getId(), day, day.plusDays(2));
                HomeworkRequest input = new HomeworkRequest();
                input.setTitle("Expired homework fixture"); input.setInstructions("Read-only expiry fixture");
                input.setDueAt(OffsetDateTime.now(clock).plusDays(3)); input.setMaxScore(BigDecimal.TEN);
                input.setAllowLateSubmission(false);
                var expired = homeworks.create(fixtureSessions.getFirst().getId(), input, actors.get("admin"));
                HomeworkStatusRequest publish = new HomeworkStatusRequest(); publish.setStatus(HomeworkStatus.PUBLISHED); publish.setVersion(expired.getVersion());
                homeworks.changeStatus(expired.getId(), publish, actors.get("admin"));
                var started = submissions.start(expired.getId(), null, actors.get("student2"));
                SubmissionRequest answer = new SubmissionRequest(); answer.setContent("Submitted before expiry"); answer.setVersion(started.getVersion());
                submissions.save(expired.getId(), answer, actors.get("student2"), true);
                homeworkRepository.findById(expired.getId()).orElseThrow().setDueAt(OffsetDateTime.now(clock).minusDays(1));
                input.setTitle("Cancelled session draft");
                homeworks.create(fixtureSessions.get(2).getId(), input, actors.get("admin"));
                fixtureSessions.get(2).setStatus(SessionStatus.CANCELLED);
                sessions.flush();
            });
        }
    }
}
