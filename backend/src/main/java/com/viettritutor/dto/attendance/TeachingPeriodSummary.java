package com.viettritutor.dto.attendance;

import java.time.YearMonth;
import java.util.List;

public record TeachingPeriodSummary(
        Long tutorId, YearMonth month, List<TeachingSessionResponse> completed,
        List<TeachingSessionResponse> cancelled, List<TeachingSessionResponse> substitutedOut,
        List<TeachingSessionResponse> unfinalized) {}
