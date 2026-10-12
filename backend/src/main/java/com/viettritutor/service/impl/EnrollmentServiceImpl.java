package com.viettritutor.service.impl;

import com.viettritutor.dto.payment.EnrollmentResponse;
import com.viettritutor.entity.ClassGroup;
import com.viettritutor.entity.Enrollment;
import com.viettritutor.enums.EnrollmentStatus;
import com.viettritutor.repository.ClassGroupRepository;
import com.viettritutor.repository.EnrollmentRepository;
import com.viettritutor.service.EnrollmentService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class EnrollmentServiceImpl implements EnrollmentService {

    private final EnrollmentRepository enrollmentRepository;
    private final ClassGroupRepository classGroupRepository;

    @Override
    @Transactional(readOnly = true)
    public List<EnrollmentResponse> getMyEnrollments(Long studentId) {
        List<Enrollment> enrollments = enrollmentRepository.findByStudentIdAndStatus(studentId, EnrollmentStatus.ACTIVE);
        return enrollments.stream().map(e -> {
            ClassGroup cg = classGroupRepository.findById(e.getClassGroupId()).orElse(null);
            return EnrollmentResponse.builder()
                    .enrollmentId(e.getId())
                    .studentId(e.getStudentId())
                    .classGroupId(e.getClassGroupId())
                    .classCode(cg != null ? cg.getClassCode() : null)
                    .courseTitle(cg != null && cg.getCourse() != null ? cg.getCourse().getName() : null)
                    .feeCharged(e.getFeeCharged())
                    .discountRate(e.getDiscountRate())
                    .status(e.getStatus())
                    .enrolledAt(e.getEnrolledAt())
                    .build();
        }).toList();
    }
}
