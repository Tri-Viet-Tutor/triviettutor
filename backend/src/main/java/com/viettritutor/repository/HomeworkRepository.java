package com.viettritutor.repository;
import com.viettritutor.entity.*;
import com.viettritutor.enums.SubmissionStatus;
import java.time.OffsetDateTime;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;
import org.springframework.data.domain.*;
import java.util.Optional;
public interface HomeworkRepository extends JpaRepository<Homework, Long> {
    Page<Homework> findBySessionId(Long sessionId, Pageable pageable);
    Page<Homework> findBySessionIdAndPublishedAtIsNotNull(Long sessionId, Pageable pageable);
    interface StudentHomeworkView {
        Homework getHomework();
        Session getSession();
        HomeworkSubmission getSubmission();
    }

    @Query(value = """
            select h as homework, session as session, submission as submission

            from Homework h
            join Session session on session.id = h.sessionId
            left join HomeworkSubmission submission on submission.homeworkId = h.id and submission.studentId = :studentId
            where h.publishedAt is not null
            and exists (
                select enrollment.id from LearningSchedule enrollment
                where enrollment.studentId = :studentId and enrollment.classGroupId = session.classGroupId
                and enrollment.status = com.viettritutor.enums.LearningScheduleStatus.ACTIVE
                and enrollment.startDate <= session.sessionDate and enrollment.endDate >= session.sessionDate
            )
            and (:status is null or submission.status = :status
                or (:status = com.viettritutor.enums.SubmissionStatus.NOT_STARTED and submission.id is null))
            and (:from is null or h.dueAt >= :from)
            and (:to is null or h.dueAt <= :to)
            order by h.dueAt asc, h.id asc
            """, countQuery = """
            select count(h.id)

            from Homework h
            join Session session on session.id = h.sessionId
            left join HomeworkSubmission submission on submission.homeworkId = h.id and submission.studentId = :studentId
            where h.publishedAt is not null
            and exists (
                select enrollment.id from LearningSchedule enrollment
                where enrollment.studentId = :studentId and enrollment.classGroupId = session.classGroupId
                and enrollment.status = com.viettritutor.enums.LearningScheduleStatus.ACTIVE
                and enrollment.startDate <= session.sessionDate and enrollment.endDate >= session.sessionDate
            )
            and (:status is null or submission.status = :status
                or (:status = com.viettritutor.enums.SubmissionStatus.NOT_STARTED and submission.id is null))
            and (:from is null or h.dueAt >= :from)
            and (:to is null or h.dueAt <= :to)
            """)
    Page<StudentHomeworkView> findStudentHomeworks(@Param("studentId") Long studentId,
            @Param("status") SubmissionStatus status, @Param("from") OffsetDateTime from,
            @Param("to") OffsetDateTime to, Pageable pageable);

    @Query("select h.sessionId from Homework h where h.id = :id")
    Optional<Long> findSessionId(@Param("id") Long id);
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select h from Homework h where h.id = :id")
    Optional<Homework> findForUpdate(@Param("id") Long id);
}
