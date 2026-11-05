package com.viettritutor.dto.assignment;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;

public record TutorBoardResponse(Long tutorId, String tutorName,
                                 List<AvailabilityResponse> availability,
                                 List<TeachingSlot> teaching) {
    public record TeachingSlot(Long sessionId, Long classGroupId, LocalDate date, LocalTime startTime, LocalTime endTime) {}
}
