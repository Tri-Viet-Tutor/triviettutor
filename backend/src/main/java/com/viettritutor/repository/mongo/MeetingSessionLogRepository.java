package com.viettritutor.repository.mongo;

import com.viettritutor.document.MeetingSessionLog;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

/**
 * Mongo repository for meeting session audit logs.
 */
@Repository
public interface MeetingSessionLogRepository extends MongoRepository<MeetingSessionLog, String> {

    Optional<MeetingSessionLog> findBySessionId(String sessionId);

    List<MeetingSessionLog> findByRoomName(String roomName);

    List<MeetingSessionLog> findByClassGroupId(Long classGroupId);

    List<MeetingSessionLog> findByHostUserId(Long hostUserId);

    Page<MeetingSessionLog> findByRoomName(String roomName, Pageable pageable);
}
