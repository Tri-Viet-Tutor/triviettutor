package com.viettritutor.repository;

import com.viettritutor.entity.Enrollment;
import com.viettritutor.enums.EnrollmentStatus;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;

import java.util.*;

public interface EnrollmentRepository extends JpaRepository<Enrollment, Long>, JpaSpecificationExecutor<Enrollment> {
    boolean existsByStudentIdAndClassGroupIdAndStatus(Long studentId, Long classGroupId, EnrollmentStatus status);
    List<Enrollment> findByClassGroupIdAndStatusOrderByStudentId(Long classGroupId, EnrollmentStatus status);
    long countByClassGroupIdAndStatus(Long classGroupId, EnrollmentStatus status);
    List<Enrollment> findByPaymentIdIn(Collection<Long> paymentIds);
    Optional<Enrollment> findByPaymentId(Long paymentId);

    /**
     * Student holds an enrollment with the given status in a class the tutor was assigned to
     * at any point (current or terminated assignment).
     */
    @Query("""
            select count(e) > 0 from Enrollment e, TutorAssignment a
            where e.studentId = :studentId and e.status = :enrollmentStatus
              and a.classGroupId = e.classGroupId and a.tutorId = :tutorId
            """)
    boolean existsStudentTaughtByTutor(@Param("studentId") Long studentId,
                                       @Param("tutorId") Long tutorId,
                                       @Param("enrollmentStatus") EnrollmentStatus enrollmentStatus);
}
