package com.viettritutor.service;

import com.viettritutor.dto.payment.ActiveEnrollmentStudent;
import java.util.List;

public interface EnrollmentQuery {
    List<ActiveEnrollmentStudent> listActiveStudents(Long classId);
}
