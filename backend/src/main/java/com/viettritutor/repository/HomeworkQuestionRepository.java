package com.viettritutor.repository;
import com.viettritutor.entity.HomeworkQuestion;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;
import java.util.List;
public interface HomeworkQuestionRepository extends JpaRepository<HomeworkQuestion, Long> {
    List<HomeworkQuestion> findByHomeworkIdOrderByPositionAsc(Long homeworkId);
    boolean existsByHomeworkId(Long homeworkId);
    // A bulk delete runs immediately, so the replacement rows can reuse the same positions.
    @Modifying(flushAutomatically = true)
    @Query("delete from HomeworkQuestion q where q.homeworkId = :homeworkId")
    void deleteByHomework(@Param("homeworkId") Long homeworkId);
}
