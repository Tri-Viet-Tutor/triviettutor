package com.viettritutor.service;

import com.viettritutor.dto.attendance.*;

import java.time.YearMonth;
import java.util.List;

public interface TeachingQuery {
    List<TeachingSessionResponse> completedSessions(Long tutorId, YearMonth month);
    TeachingPeriodSummary periodSummary(Long tutorId, YearMonth month);
}
