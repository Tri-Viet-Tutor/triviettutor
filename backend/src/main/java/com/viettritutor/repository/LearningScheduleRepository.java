package com.viettritutor.repository;

import com.viettritutor.entity.LearningSchedule;
import com.viettritutor.enums.LearningScheduleStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.Optional;
import java.util.List;

public interface LearningScheduleRepository extends JpaRepository<LearningSchedule, Long> {

    @Query("""
            select ls from LearningSchedule ls
            where ls.classGroupId = :classGroupId
              and ls.status = com.viettritutor.enums.LearningScheduleStatus.ACTIVE
              and (:originalDate between ls.startDate and ls.endDate
                   or :replacementDate between ls.startDate and ls.endDate)
            order by ls.studentId, ls.id
            """)
    List<LearningSchedule> findActiveRoster(
            @Param("classGroupId") Long classGroupId, @Param("originalDate") LocalDate originalDate,
            @Param("replacementDate") LocalDate replacementDate);
    @Query("""
            select count(distinct ls.studentId) from LearningSchedule ls
            where ls.classGroupId = :classGroupId
              and ls.status = com.viettritutor.enums.LearningScheduleStatus.ACTIVE
              and ls.endDate >= :today
            """)
    long countActiveStudents(@Param("classGroupId") Long classGroupId, @Param("today") LocalDate today);

    Optional<LearningSchedule> findByEnrollmentId(Long enrollmentId);

    boolean existsByStudentIdAndClassGroupIdAndStatus(
            Long studentId, Long classGroupId, LearningScheduleStatus status);

    boolean existsByStudentIdAndClassGroupIdAndStatusAndStartDateLessThanEqualAndEndDateGreaterThanEqual(
            Long studentId,
            Long classGroupId,
            LearningScheduleStatus status,
            LocalDate startDate,
            LocalDate endDate);
}
