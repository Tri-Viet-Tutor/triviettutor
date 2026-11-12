package com.viettritutor.scheduler;

import com.viettritutor.enums.ClassStatus;
import com.viettritutor.repository.ClassGroupRepository;
import com.viettritutor.service.ClassCancellationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.Clock;
import java.time.LocalDate;
import java.util.List;


@Slf4j
@Component
@RequiredArgsConstructor
public class ClassCancellationScheduler {

    private final ClassGroupRepository classes;
    private final ClassCancellationService cancellationService;
    private final Clock clock;

    @Scheduled(
            cron = "${app.class-cancellation.cron:0 0 0 * * *}",
            zone = "Asia/Ho_Chi_Minh"
    )
    public void cancelExpiredClasses() {
        LocalDate today = LocalDate.now(clock);

        log.info("========== CLASS CANCELLATION SCHEDULER TRIGGERED ==========");
        log.info("Current date: {}", today);

        List<Long> expiredClassIds = classes.findExpiredClassIds(
                ClassStatus.ENROLLING,
                today
        );

        log.info(
                "Found {} expired classes: {}",
                expiredClassIds.size(),
                expiredClassIds
        );

        for (Long classId : expiredClassIds) {
            try {
                boolean processed =
                        cancellationService.cancelIfNotEnoughStudents(classId);

                log.info(
                        "Class {} cancellation processing result: {}",
                        classId,
                        processed
                );

            } catch (Exception ex) {
                log.error(
                        "Failed to process automatic cancellation for class {}",
                        classId,
                        ex
                );
            }
        }

        log.info("========== CLASS CANCELLATION SCHEDULER FINISHED ==========");
    }
}
