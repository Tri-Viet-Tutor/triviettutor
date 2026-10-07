package com.viettritutor.service;

import com.viettritutor.entity.Session;

import java.util.List;

public interface SessionGenerator {
    List<Session> ensureGenerated(SessionGenerationSpec spec);
}
