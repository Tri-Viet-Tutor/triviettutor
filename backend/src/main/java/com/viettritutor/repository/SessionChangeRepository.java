package com.viettritutor.repository;

import com.viettritutor.entity.SessionChange;
import org.springframework.data.jpa.repository.JpaRepository;

public interface SessionChangeRepository extends JpaRepository<SessionChange, Long> {
    java.util.List<SessionChange> findBySessionIdInOrderByChangedAtAscIdAsc(java.util.Collection<Long> sessionIds);
}
