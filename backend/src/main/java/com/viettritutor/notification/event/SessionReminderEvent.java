package com.viettritutor.notification.event;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;

/**
 * Event published 60 minutes before a session starts.
 * Recipient: Tutor and enrolled Students.
 */
public record SessionReminderEvent(
        Long sessionId,
        String className,
        LocalDate sessionDate,
        LocalTime startTime,
        LocalTime endTime,
        String meetingUrl,
        String tutorEmail,
        String tutorName,
        List<String> studentEmails
) {}
