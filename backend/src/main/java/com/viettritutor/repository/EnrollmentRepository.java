package com.viettritutor.repository;

import com.viettritutor.entity.Enrollment;
import com.viettritutor.enums.EnrollmentStatus;
import org.springframework.data.jpa.repository.*;

import java.util.*;

public interface EnrollmentRepository extends JpaRepository<Enrollment, Long>, JpaSpecificationExecutor<Enrollment> {
    boolean existsByStudentIdAndClassGroupIdAndStatus(Long studentId, Long classGroupId, EnrollmentStatus status);
    List<Enrollment> findByClassGroupIdAndStatusOrderByStudentId(Long classGroupId, EnrollmentStatus status);
    long countByClassGroupIdAndStatus(Long classGroupId, EnrollmentStatus status);
    List<Enrollment> findByPaymentIdIn(Collection<Long> paymentIds);
    Optional<Enrollment> findByPaymentId(Long paymentId);
}
