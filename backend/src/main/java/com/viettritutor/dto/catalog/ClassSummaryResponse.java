package com.viettritutor.dto.catalog;

import com.viettritutor.enums.ClassStatus;

import java.util.Map;

/** Số lớp theo trạng thái (GET /admin/classes/summary) cho các tab đếm ở trang quản trị lớp học. */
public record ClassSummaryResponse(long total, Map<ClassStatus, Long> byStatus) {}
