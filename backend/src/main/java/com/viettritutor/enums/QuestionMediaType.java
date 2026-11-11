package com.viettritutor.enums;
import com.fasterxml.jackson.annotation.JsonCreator;

/** Loại tư liệu minh họa kèm một câu hỏi: ảnh gia sư tải lên, hoặc video dán link từ ngoài. */
public enum QuestionMediaType {
    IMAGE, VIDEO;
    @JsonCreator
    public static QuestionMediaType fromJson(String value) { return valueOf(value); }
}
