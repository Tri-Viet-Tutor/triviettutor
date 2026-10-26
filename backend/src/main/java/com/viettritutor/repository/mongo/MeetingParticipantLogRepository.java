package com.viettritutor.repository.mongo;

import com.viettritutor.document.MeetingParticipantLog;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

/**
 * Mongo repository for participant attendance logs.
 */
@Repository
public interface MeetingParticipantLogRepository extends MongoRepository<MeetingParticipantLog, String> {

    List<MeetingParticipantLog> findBySessionId(String sessionId);

    List<MeetingParticipantLog> findBySessionIdAndUserId(String sessionId, Long userId);

    Optional<MeetingParticipantLog> findBySessionIdAndParticipantIdentity(String sessionId, String participantIdentity);

    List<MeetingParticipantLog> findByUserId(Long userId);

    Page<MeetingParticipantLog> findBySessionId(String sessionId, Pageable pageable);
}
