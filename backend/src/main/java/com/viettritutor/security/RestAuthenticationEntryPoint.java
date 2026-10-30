package com.viettritutor.security;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.viettritutor.common.api.ApiResponse;
import com.viettritutor.common.exception.ErrorCode;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.LockedException;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.web.AuthenticationEntryPoint;
import org.springframework.stereotype.Component;
import java.io.IOException;

@Component
@RequiredArgsConstructor
public class RestAuthenticationEntryPoint implements AuthenticationEntryPoint {
    private final ObjectMapper objectMapper;

    @Override
    public void commence(HttpServletRequest request, HttpServletResponse response,
                         AuthenticationException exception) throws IOException {
        // Always 401 so the frontend ends the session; a locked account gets its own code.
        ErrorCode code = exception instanceof LockedException ? ErrorCode.ACCOUNT_LOCKED : ErrorCode.UNAUTHORIZED;
        response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
        response.setContentType("application/json");
        objectMapper.writeValue(response.getOutputStream(),
                ApiResponse.error(code.getDefaultMessage(), code.name()));
    }
}
