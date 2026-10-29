package com.viettritutor.repository;

import com.viettritutor.entity.AttendanceRecord;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface AttendanceRecordRepository extends JpaRepository<AttendanceRecord, Long> {
    List<AttendanceRecord> findBySessionIdOrderByStudentId(Long sessionId);
    List<AttendanceRecord> findBySessionIdIn(java.util.Collection<Long> sessionIds);
    boolean existsBySessionId(Long sessionId);
}
