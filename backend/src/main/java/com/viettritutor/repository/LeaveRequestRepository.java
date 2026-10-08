package com.viettritutor.repository;

import com.viettritutor.entity.LeaveRequest;
import com.viettritutor.enums.LeaveRequestStatus;
import org.springframework.data.domain.*;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface LeaveRequestRepository extends JpaRepository<LeaveRequest, Long> {
    List<LeaveRequest> findBySessionIdAndRequesterIdAndRequesterRoleAndLateNoticeFalseOrderByRequestedAtDescIdDesc(
            Long sessionId, Long requesterId, String requesterRole);
    @Query("select r.sessionId from LeaveRequest r where r.id = :id")
    Optional<Long> findSessionId(@Param("id") Long id);

    List<LeaveRequest> findBySessionIdAndStatusOrderByRequestedAtAscIdAsc(Long sessionId, LeaveRequestStatus status);

    @Query("""
            select r from LeaveRequest r where (:status is null or r.status = :status)
              and (:requesterId is null or r.requesterId = :requesterId)
              and (:sessionId is null or r.sessionId = :sessionId)
            """)
    Page<LeaveRequest> search(@Param("status") LeaveRequestStatus status,
                             @Param("requesterId") Long requesterId,
                             @Param("sessionId") Long sessionId, Pageable pageable);
}
