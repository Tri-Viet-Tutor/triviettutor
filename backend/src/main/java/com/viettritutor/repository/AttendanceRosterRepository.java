package com.viettritutor.repository;

import com.viettritutor.entity.AttendanceRosterMember;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface AttendanceRosterRepository extends JpaRepository<AttendanceRosterMember, Long> {
    List<AttendanceRosterMember> findBySessionIdOrderByStudentId(Long sessionId);
    List<AttendanceRosterMember> findBySessionIdIn(java.util.Collection<Long> sessionIds);
}
