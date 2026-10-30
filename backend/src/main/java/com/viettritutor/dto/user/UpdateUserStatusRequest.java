package com.viettritutor.dto.user;

import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/** PATCH /admin/users/{id}/status — lock (true) or unlock (false) an account (FR-AUTH-03). */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class UpdateUserStatusRequest {
    @NotNull
    private Boolean locked;
}
