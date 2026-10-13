package com.viettritutor.dto.learning;
import jakarta.validation.constraints.*;
import lombok.Getter;
import lombok.Setter;
@Getter
@Setter
public class HomeworkUpdateRequest extends HomeworkRequest {
    @NotNull
    @PositiveOrZero
    private Long version;
}
