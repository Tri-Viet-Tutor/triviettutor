package com.viettritutor.dto.assignment;

import java.util.List;

public record AvailableTutorResponse(Long tutorId, String tutorName, boolean available,
                                     boolean declaredAvailabilityCovered,
                                     List<AvailabilityResponse> availability,
                                     List<ScheduleConflictResponse> conflicts) {}
