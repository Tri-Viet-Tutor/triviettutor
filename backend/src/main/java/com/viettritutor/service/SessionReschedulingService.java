package com.viettritutor.service;

import com.viettritutor.dto.leave.CancelSessionRequest;
import com.viettritutor.dto.leave.MakeupRequest;
import com.viettritutor.dto.leave.SubstituteRequest;
import com.viettritutor.dto.schedule.SessionResponse;
import com.viettritutor.entity.User;

public interface SessionReschedulingService {
    SessionResponse makeup(Long sessionId, MakeupRequest input, User admin);
    SessionResponse substitute(Long sessionId, SubstituteRequest input, User admin);
    SessionResponse cancel(Long sessionId, CancelSessionRequest input, User admin);
}
