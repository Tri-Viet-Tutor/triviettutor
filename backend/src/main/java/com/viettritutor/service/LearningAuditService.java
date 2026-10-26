package com.viettritutor.service;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.viettritutor.entity.*;
import com.viettritutor.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import java.util.LinkedHashMap;
@Service
@RequiredArgsConstructor
public class LearningAuditService {
    private final HomeworkChangeRepository homeworkChanges;
    private final SubmissionChangeRepository submissionChanges;
    private final HomeworkAccessService access;
    private final ObjectMapper json;

    public void homework(Long id, User actor, String action, Object before, Object after) {
        homeworkChanges.save(HomeworkChange.builder().homeworkId(id).actorId(actor.getId()).action(action)
                .details(details(before, after, null)).changedAt(access.now()).build());
    }

    public void submission(Long id, User actor, String action, Object before, Object after, String reason) {
        submissionChanges.save(SubmissionChange.builder().submissionId(id).actorId(actor.getId()).action(action)
                .details(details(before, after, reason)).changedAt(access.now()).build());
    }

    private String details(Object before, Object after, String reason) {
        var values = new LinkedHashMap<String, Object>();
        values.put("before", before); values.put("after", after); values.put("reason", reason);
        try { return json.writeValueAsString(values); }
        catch (JsonProcessingException ex) { throw new IllegalStateException("Cannot serialize learning audit", ex); }
    }
}
