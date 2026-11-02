package com.viettritutor.dto.catalog;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;

/** Đặt trạng thái bán của khóa (PUT /admin/courses/{id}/active). Gửi lại cùng giá trị nhiều lần cho cùng kết quả. */
public record CourseActiveRequest(
        @NotNull @Schema(example = "true", description = "true = đang bán, false = ngừng bán") Boolean active) {}
