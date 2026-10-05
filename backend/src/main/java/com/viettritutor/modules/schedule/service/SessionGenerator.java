package com.viettritutor.modules.schedule.service;

import com.viettritutor.modules.schedule.domain.Session;

import java.util.List;

public interface SessionGenerator {
    List<Session> ensureGenerated(SessionGenerationSpec spec);
}
