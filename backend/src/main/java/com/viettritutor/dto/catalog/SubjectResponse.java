package com.viettritutor.dto.catalog;

import com.viettritutor.entity.Subject;

/** Một môn học trong bảng subjects; {@code code} là mã môn lưu ở khóa học, ví dụ "MATH", "PHYSICS". */
public record SubjectResponse(Long id, String code) {
    public static SubjectResponse from(Subject subject) {
        return new SubjectResponse(subject.getId(), subject.getName());
    }
}
