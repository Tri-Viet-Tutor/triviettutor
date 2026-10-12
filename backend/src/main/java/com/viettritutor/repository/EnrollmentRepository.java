package com.viettritutor.repository;

import com.viettritutor.entity.Enrollment;
import com.viettritutor.enums.EnrollmentStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface EnrollmentRepository extends JpaRepository<Enrollment, Long> {

    Optional<Enrollment> findByStudentIdAndClassGroupIdAndStatus(Long studentId, Long classGroupId, EnrollmentStatus status);

    List<Enrollment> findByStudentId(Long studentId);

    List<Enrollment> findByStudentIdAndStatus(Long studentId, EnrollmentStatus status);

    boolean existsByStudentIdAndClassGroupIdAndStatus(Long studentId, Long classGroupId, EnrollmentStatus status);

    long countByClassGroupIdAndStatus(Long classGroupId, EnrollmentStatus status);

    List<Enrollment> findByClassGroupIdAndStatus(Long classGroupId, EnrollmentStatus status);
}
