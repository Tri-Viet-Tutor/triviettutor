package com.viettritutor.service;

import com.viettritutor.entity.Session;
import com.viettritutor.enums.*;
import com.viettritutor.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.*;

@Service
@RequiredArgsConstructor
public class ClassCompletionService implements ClassLifecycle {
    private final ClassGroupRepository classes;
    private final SessionRepository sessions;

    public boolean allObligationsCompleted(Long id) {
        List<Session> all = sessions.findByClassGroupIdOrderBySessionNumberAsc(id);
        var originals = all.stream().filter(s -> s.getOriginalSession() == null).toList();
        return !originals.isEmpty() && originals.stream().allMatch(s ->
                s.getStatus() == SessionStatus.COMPLETED || (s.getStatus() == SessionStatus.CANCELLED
                        && all.stream().anyMatch(m -> m.getOriginalSession() != null
                        && m.getOriginalSession().getId().equals(s.getId()) && m.getStatus() == SessionStatus.COMPLETED)));
    }

    @Override
    @Transactional
    public void markCompleted(Long classGroupId) {
        classes.findForUpdate(classGroupId).ifPresent(c -> {
            if (c.getStatus() == ClassStatus.IN_PROGRESS && allObligationsCompleted(classGroupId)) {
                c.setStatus(ClassStatus.COMPLETED);
            }
        });
    }
}
