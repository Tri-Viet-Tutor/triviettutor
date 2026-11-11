package com.viettritutor.service;

import com.viettritutor.common.exception.*;
import com.viettritutor.entity.*;
import com.viettritutor.enums.*;
import com.viettritutor.repository.*;
import java.time.*;
import java.util.*;

public interface ClassScheduleService {

    LocalDate validateDates(LocalDate start, LocalDate deadline);
    void ensureGenerated(ClassGroup c);
/**
     * The sessions {@link #ensureGenerated} would create, built in memory without saving (no ids). Used to suggest
     * tutors for a draft class whose schedule is generated only when it is published or a tutor is assigned.
     */
    List<Session> plannedSessions(ClassGroup c);
    List<Session> plannedSessions( LocalDate startDate, SchedulePattern pattern, TimeSlot timeSlot, int totalSessions );
    void requireConfigured(ClassGroup c);
    void reschedule(ClassGroup c, LocalDate start, LocalDate deadline, User actor, String reason);
/**
     * Cancels a class's open sessions and terminates its ACTIVE tutor assignment. Caller holds the class lock
     * and sets the class status. A null actor means an automated (system) cancellation.
     */
    void cancelClass(ClassGroup c, User actor, String reason);
/** A null actor means an automated (system) cancellation. */
    void cancelSessions(ClassGroup c, User actor, String reason);
/**
     * Cancels a class that failed to open and releases its tutor slots
     * so the class can be reopened later.
     *
     * Caller holds the class lock and sets the class status.
     */
    void failToOpenClass(ClassGroup c, String reason);
}
