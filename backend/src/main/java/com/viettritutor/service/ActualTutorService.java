package com.viettritutor.service;

import com.viettritutor.dto.attendance.ActualTutorChange;
import com.viettritutor.dto.schedule.SessionResponse;
import com.viettritutor.entity.User;

/**
 * Corrects who actually taught a session after it started (for example a no-show covered by another tutor).
 * Before the start, substitution goes through the leave flow instead.
 */
public interface ActualTutorService {

    SessionResponse change(Long sessionId, ActualTutorChange input, User admin);
}
