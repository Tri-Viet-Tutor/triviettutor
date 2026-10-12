package com.viettritutor.service;

import com.viettritutor.common.exception.*;
import com.viettritutor.dto.payment.ActiveEnrollmentStudent;
import com.viettritutor.enums.EnrollmentStatus;
import com.viettritutor.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class DefaultEnrollmentQuery implements EnrollmentQuery {
    private final EnrollmentRepository enrollments;
    private final ClassGroupRepository classes;

    @Override
    @Transactional(readOnly = true)
    public List<ActiveEnrollmentStudent> listActiveStudents(Long classId) {
        if (!classes.existsById(classId)) throw new BusinessException(ErrorCode.CLASS_NOT_FOUND);
        return enrollments.findByClassGroupIdAndStatusOrderByStudentId(classId, EnrollmentStatus.ACTIVE).stream()
                .map(enrollment -> new ActiveEnrollmentStudent(enrollment.getId(), enrollment.getStudentId())).toList();
    }
}
