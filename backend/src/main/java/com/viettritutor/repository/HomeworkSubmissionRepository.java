package com.viettritutor.repository;
import com.viettritutor.entity.HomeworkSubmission;
import com.viettritutor.enums.SubmissionStatus;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;
import org.springframework.data.domain.*;
import java.util.Optional;
public interface HomeworkSubmissionRepository extends JpaRepository<HomeworkSubmission, Long> {
    Optional<HomeworkSubmission> findByHomeworkIdAndStudentId(Long homeworkId, Long studentId);
    @Query("select s.homeworkId from HomeworkSubmission s where s.id = :id")
    Optional<Long> findHomeworkId(@Param("id") Long id);
    @Query("""
            select s from HomeworkSubmission s where s.homeworkId = :homeworkId
            and s.status in (com.viettritutor.enums.SubmissionStatus.SUBMITTED, com.viettritutor.enums.SubmissionStatus.GRADED)
            and (:status is null or s.status = :status)
            """)
    Page<HomeworkSubmission> findSubmitted(@Param("homeworkId") Long homeworkId, @Param("status") SubmissionStatus status, Pageable pageable);
}
