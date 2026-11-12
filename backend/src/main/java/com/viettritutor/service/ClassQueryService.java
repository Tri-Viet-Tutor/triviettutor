package com.viettritutor.service;

import com.viettritutor.common.api.PageResponse;
import com.viettritutor.common.exception.*;
import com.viettritutor.dto.catalog.ClassResponse;
import com.viettritutor.entity.*;
import com.viettritutor.enums.*;
import com.viettritutor.repository.*;
import org.springframework.data.domain.*;
import java.time.*;
import java.util.*;

public interface ClassQueryService {

    PageResponse<ClassResponse> adminList(Long courseId, ClassStatus status, ClassType type, SchedulePattern pattern, String keyword, int page, int size);
    PageResponse<ClassResponse> catalog(String subject, GradeLevel grade, DeliveryMode mode, SchedulePattern pattern, TimeSlot slot, int page, int size);
/** Danh mục lớp mở; {@code excludeStudentId} khác null thì bỏ các lớp học viên đó đang có chỗ ACTIVE */
    PageResponse<ClassResponse> catalog(String subject, GradeLevel grade, DeliveryMode mode, SchedulePattern pattern, TimeSlot slot, Long excludeStudentId, Long tutorId, int page, int size);
/** Số lớp theo từng trạng thái (mọi trạng thái đều có mặt, kể cả 0) và tổng số lớp */
    com.viettritutor.dto.catalog.ClassSummaryResponse adminSummary();
    ClassResponse detail(Long id);
/**
     * Chi tiết lớp công khai. Lớp ENROLLING đã đủ chỗ bị ẩn (404) với khách và học viên không có chỗ trong lớp,
     * để học viên không thấy và không đăng ký được lớp đã đủ người; nhân sự (staff) vẫn xem được.
     */
    ClassResponse detail(Long id, Long viewerId, boolean staff);
    long students(Long classId);
    ClassResponse response(ClassGroup c, boolean admin, boolean includeSessions);
}
