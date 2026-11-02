package com.viettritutor.dto.catalog;

/** Số khóa học theo trạng thái bán (GET /admin/courses/summary), dùng cho các tab đếm ở trang quản trị. */
public record CourseSummaryResponse(long total, long active, long inactive) {}
