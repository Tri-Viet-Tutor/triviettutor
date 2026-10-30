package com.viettritutor.service;

import com.viettritutor.common.api.PageResponse;
import com.viettritutor.dto.catalog.CourseRequest;
import com.viettritutor.dto.catalog.CourseResponse;
import com.viettritutor.dto.catalog.CourseSummaryResponse;
import com.viettritutor.dto.catalog.SubjectResponse;
import com.viettritutor.enums.GradeLevel;

import java.util.List;

public interface AdminCourseService {
    CourseResponse create(CourseRequest request);

    /** {@code keyword}: tìm trong tên khóa, không phân biệt hoa thường; null hoặc rỗng là bỏ qua. */
    PageResponse<CourseResponse> list(String subject, GradeLevel gradeLevel, Boolean active, String keyword, int page, int size);

    /** Không lọc theo tên khóa (giữ cho các nơi gọi cũ, ví dụ AssistantContextBuilder). */
    default PageResponse<CourseResponse> list(String subject, GradeLevel gradeLevel, Boolean active, int page, int size) {
        return list(subject, gradeLevel, active, null, page, size);
    }

    CourseResponse update(Long courseId, CourseRequest request);

    /** Đảo trạng thái bán. Giữ để tương thích; client mới dùng {@link #setActive}. */
    CourseResponse toggle(Long courseId);

    /** Đặt trạng thái bán; gửi lặp cùng giá trị không đổi gì thêm. */
    CourseResponse setActive(Long courseId, boolean active);

    CourseSummaryResponse summary();

    /** Xóa hẳn khóa chưa từng có lớp hay đơn hàng; ngược lại trả COURSE_IN_USE (dùng Ngừng bán). */
    void delete(Long courseId);

    /** Mọi môn học đang có, sắp theo mã. */
    List<SubjectResponse> subjects();
}
