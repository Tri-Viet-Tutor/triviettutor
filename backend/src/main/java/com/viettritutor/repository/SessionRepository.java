package com.viettritutor.repository;

import com.viettritutor.entity.Session;
import com.viettritutor.enums.SessionStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import jakarta.persistence.LockModeType;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface SessionRepository extends JpaRepository<Session, Long>, JpaSpecificationExecutor<Session> {

    @Query("select s.classGroupId from Session s where s.id = :id")
    Optional<Long> findClassGroupId(@Param("id") Long id);

    @Query("""
            select s from Session s
            where s.status <> com.viettritutor.enums.SessionStatus.CANCELLED
              and s.sessionDate between :from and :to
              and exists (
                  select ls.id from LearningSchedule ls
                  where ls.studentId = :studentId and ls.classGroupId = s.classGroupId
                    and ls.status = com.viettritutor.enums.LearningScheduleStatus.ACTIVE
                    and s.sessionDate between ls.startDate and ls.endDate
              )
            order by s.sessionDate, s.startTime, s.id
            """)
    List<Session> findStudentCommitments(@Param("studentId") Long studentId,
                                       @Param("from") LocalDate from, @Param("to") LocalDate to);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select s from Session s where s.classGroupId = :classGroupId order by s.id")
    List<Session> findClassSessionsForUpdate(@Param("classGroupId") Long classGroupId);

    @Query("""
            select s from Session s
            where s.status <> com.viettritutor.enums.SessionStatus.CANCELLED
              and coalesce(s.actualTutorId, s.scheduledTutorId) = :tutorId
              and s.sessionDate between :from and :to
            order by s.sessionDate, s.startTime, s.id
            """)
    List<Session> findTutorCommitments(@Param("tutorId") Long tutorId,
                                     @Param("from") LocalDate from, @Param("to") LocalDate to);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select s from Session s where s.classGroupId = :classGroupId and s.originalSession is null order by s.sessionNumber")
    List<Session> findOriginalSessionsForUpdate(@Param("classGroupId") Long classGroupId);

    List<Session> findByClassGroupIdOrderBySessionNumberAsc(Long classGroupId);

    Optional<Session> findByOriginalSessionId(Long originalSessionId);

    List<Session> findByStatusAndSessionDateLessThanEqual(SessionStatus status, LocalDate date);

    @Query("select distinct s.classGroupId from Session s")
    List<Long> findDistinctClassGroupIds();

    @Query("""
            select s from Session s
            where (:from is null or s.sessionDate >= :from)
              and (:to is null or s.sessionDate <= :to)
              and (:status is null or s.status = :status)
              and (:classGroupId is null or s.classGroupId = :classGroupId)
              and (
                    (:role = 'ROLE_TUTOR' and (s.scheduledTutorId = :userId or s.actualTutorId = :userId))
                 or (:role = 'ROLE_STUDENT' and exists (
                        select ls.id from LearningSchedule ls
                        where ls.studentId = :userId
                          and ls.classGroupId = s.classGroupId
                          and ls.status = com.viettritutor.enums.LearningScheduleStatus.ACTIVE
                          and s.sessionDate between ls.startDate and ls.endDate
                    ))
              )
            order by s.sessionDate, s.startTime, s.id
            """)
    List<Session> findVisibleSessions(
            @Param("userId") Long userId,
            @Param("role") String role,
            @Param("from") LocalDate from,
            @Param("to") LocalDate to,
            @Param("status") SessionStatus status,
            @Param("classGroupId") Long classGroupId);

    @Query("""
            select s from Session s
            where (:from is null or s.sessionDate >= :from)
              and (:to is null or s.sessionDate <= :to)
              and (:status is null or s.status = :status)
              and (:classGroupId is null or s.classGroupId = :classGroupId)
              and (:tutorId is null or s.scheduledTutorId = :tutorId or s.actualTutorId = :tutorId)
            """)
    Page<Session> findAdminSessions(
            @Param("from") LocalDate from,
            @Param("to") LocalDate to,
            @Param("status") SessionStatus status,
            @Param("classGroupId") Long classGroupId,
            @Param("tutorId") Long tutorId,
            Pageable pageable);
}
