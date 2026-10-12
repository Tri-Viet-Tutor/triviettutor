package com.viettritutor.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.viettritutor.entity.ClassChange;
import com.viettritutor.repository.ClassChangeRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import java.time.Clock;
import java.time.OffsetDateTime;

@Service
@RequiredArgsConstructor
public class ClassAuditService {
    private final ClassChangeRepository changes;
    private final ObjectMapper json;
    private final Clock clock;
    public void record(Long classId, Long actorId, String action, Object details) {
        try {
            changes.save(ClassChange.builder().classGroupId(classId).actorId(actorId).action(action)
                    .details(json.writeValueAsString(details)).changedAt(OffsetDateTime.now(clock)).build());
        } catch (JsonProcessingException ex) {
            throw new IllegalStateException("Could not serialize class audit", ex);
        }
    }
}
