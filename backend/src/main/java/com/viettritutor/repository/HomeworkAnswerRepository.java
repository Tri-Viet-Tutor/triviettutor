package com.viettritutor.repository;
import com.viettritutor.entity.HomeworkAnswer;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Collection;
import java.util.List;
public interface HomeworkAnswerRepository extends JpaRepository<HomeworkAnswer, Long> {
    List<HomeworkAnswer> findBySubmissionId(Long submissionId);
    List<HomeworkAnswer> findBySubmissionIdIn(Collection<Long> submissionIds);
}
