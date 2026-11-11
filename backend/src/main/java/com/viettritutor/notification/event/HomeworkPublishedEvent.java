package com.viettritutor.notification.event;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.List;

/**
 * A homework was published to these students. Raised inside the publish transaction; the emails go out
 * only after it commits (see {@link HomeworkPublishedMailer}).
 */
public record HomeworkPublishedEvent(Long homeworkId, String title, String instructions, Long classGroupId,
                                     Integer sessionNumber, LocalDate sessionDate, OffsetDateTime openAt,
                                     OffsetDateTime dueAt, boolean passwordProtected, int questionCount,
                                     BigDecimal maxScore, String tutorName, List<Long> studentIds) {}
