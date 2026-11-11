package com.viettritutor.notification.scheduler;

import com.viettritutor.entity.ClassGroup;
import com.viettritutor.entity.Enrollment;
import com.viettritutor.entity.Session;
import com.viettritutor.entity.User;
import com.viettritutor.enums.EnrollmentStatus;
import com.viettritutor.notification.event.SessionReminderEvent;
import com.viettritutor.repository.ClassGroupRepository;
import com.viettritutor.repository.EnrollmentRepository;
import com.viettritutor.repository.SessionRepository;
import com.viettritutor.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.OffsetDateTime;
import java.util.List;

@Slf4j
@Component
@RequiredArgsConstructor
public class SessionReminderScheduler {

    private final SessionRepository sessions;
    private final EnrollmentRepository enrollments;
    private final ClassGroupRepository classGroups;
    private final UserRepository users;
    private final ApplicationEventPublisher eventPublisher;
    private final Clock clock;

    /**
     * Chạy định kỳ mỗi 10 phút.
     * Quét các buổi học bắt đầu trong khoảng 50 đến 70 phút tới (mốc xấp xỉ 60 phút)
     * và chưa được gửi thông báo nhắc nhở.
     */
    @Scheduled(cron = "${app.scheduling.reminder-cron:0 */10 * * * *}")
    @Transactional
    public void scanAndSendReminders() {
        LocalDate today = LocalDate.now(clock);
        LocalTime nowTime = LocalTime.now(clock);
        LocalTime fromTime = nowTime.plusMinutes(50);
        LocalTime toTime = nowTime.plusMinutes(70);

        List<Session> upcomingSessions = sessions.findUpcomingSessionsForReminder(today, fromTime, toTime);
        if (upcomingSessions.isEmpty()) {
            return;
        }

        log.info("Found {} sessions requiring 60-minute reminder for date {}", upcomingSessions.size(), today);

        for (Session session : upcomingSessions) {
            try {
                // 1. Thông tin lớp học
                String className = classGroups.findById(session.getClassGroupId())
                        .map(ClassGroup::getClassCode)
                        .orElse("Lớp học #" + session.getClassGroupId());

                // 2. Thông tin gia sư
                Long tutorId = session.getActualTutorId() != null ? session.getActualTutorId() : session.getScheduledTutorId();
                String tutorEmail = null;
                String tutorName = "Gia sư";
                if (tutorId != null) {
                    User tutor = users.findById(tutorId).orElse(null);
                    if (tutor != null) {
                        tutorEmail = tutor.getEmail();
                        tutorName = tutor.getFullName();
                    }
                }

                // 3. Thông tin học viên đang học
                List<Enrollment> activeEnrollments = enrollments.findByClassGroupIdAndStatusOrderByStudentId(
                        session.getClassGroupId(), EnrollmentStatus.ACTIVE);
                List<Long> studentIds = activeEnrollments.stream().map(Enrollment::getStudentId).distinct().toList();
                List<String> studentEmails = users.findAllById(studentIds).stream()
                        .map(User::getEmail)
                        .filter(e -> e != null && !e.isBlank())
                        .toList();

                // 4. Phát tán sự kiện gửi mail
                eventPublisher.publishEvent(new SessionReminderEvent(
                        session.getId(),
                        className,
                        session.getSessionDate(),
                        session.getStartTime(),
                        session.getEndTime(),
                        session.getMeetingUrl(),
                        tutorEmail,
                        tutorName,
                        studentEmails
                ));

                // 5. Đánh dấu đã gửi nhắc nhở để không gửi lặp
                session.setReminderSentAt(OffsetDateTime.now(clock));
                sessions.save(session);
            } catch (Exception e) {
                log.error("Failed to process session reminder for session ID {}: {}", session.getId(), e.getMessage());
            }
        }
    }
}
