package com.viettritutor.controller;

import com.viettritutor.common.api.ApiResponse;
import com.viettritutor.config.AssistantProperties;
import com.viettritutor.dto.settings.AssistantSettingsDto;
import com.viettritutor.dto.settings.AttendanceSettingsDto;
import com.viettritutor.entity.AppSetting;
import com.viettritutor.entity.User;
import com.viettritutor.security.CurrentUser;
import com.viettritutor.service.AppSettingService;
import com.viettritutor.service.AssistantSettingsService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.Comparator;
import java.util.Objects;
import java.util.stream.Stream;

@RestController @RequestMapping("/api/v1/admin/settings") @RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
@Tag(name="Admin settings",description="Settings an admin changes at runtime without redeploying.")
public class AdminSettingsController {
    private final AppSettingService settings;
    private final AssistantSettingsService assistant;
    private final AssistantProperties assistantProperties;

    @GetMapping("/attendance")
    @Operation(summary="Read the automatic attendance threshold (ATT-01)")
    public ApiResponse<AttendanceSettingsDto.Response> attendance() {
        return ApiResponse.ok(attendanceResponse());
    }

    @PutMapping("/attendance")
    @Operation(summary="Change the automatic attendance threshold (ATT-01)",
            description="Minutes in the online classroom that mark a student PRESENT (1-240); 0 turns it off. "
                    + "Existing records are never overwritten; tutors and admins can still correct attendance by hand.")
    public ApiResponse<AttendanceSettingsDto.Response> updateAttendance(@Valid @RequestBody AttendanceSettingsDto.Request body,
            @Parameter(hidden=true) @CurrentUser User admin) {
        settings.put(AppSettingService.ATTENDANCE_AUTO_PRESENT_MINUTES,String.valueOf(body.autoPresentMinutes()),admin);
        return ApiResponse.ok(attendanceResponse());
    }

    @GetMapping("/assistant")
    @Operation(summary="Read the chatbot settings (AI-01)",description="The API key is never returned, only where it comes from and its last 4 characters.")
    public ApiResponse<AssistantSettingsDto.Response> assistant() {
        return ApiResponse.ok(assistantResponse());
    }

    @PutMapping("/assistant")
    @Operation(summary="Change the chatbot API key and advisory prompt (AI-01)",
            description="Null fields stay unchanged. apiKey \"\" removes the saved key (GEMINI_API_KEY is used again); "
                    + "systemPrompt \"\" restores the default. The key is stored encrypted; privacy rules are always appended to the prompt.")
    public ApiResponse<AssistantSettingsDto.Response> updateAssistant(@Valid @RequestBody AssistantSettingsDto.Request body,
            @Parameter(hidden=true) @CurrentUser User admin) {
        assistant.update(body.apiKey(),body.systemPrompt(),admin);
        return ApiResponse.ok(assistantResponse());
    }

    private AssistantSettingsDto.Response assistantResponse() {
        AssistantSettingsService.KeySource source=assistant.keySource();
        AppSetting last=Stream.of(AssistantSettingsService.API_KEY,AssistantSettingsService.PROMPT)
                .map(key -> settings.find(key).orElse(null)).filter(Objects::nonNull)
                .max(Comparator.comparing(AppSetting::getUpdatedAt)).orElse(null);
        var custom=assistant.customPrompt();
        return new AssistantSettingsDto.Response(source!=AssistantSettingsService.KeySource.NONE,source.name(),assistant.keyHint(),
                custom.orElse(AssistantSettingsService.DEFAULT_PROMPT),custom.isPresent(),AssistantSettingsService.DEFAULT_PROMPT,
                assistantProperties.getGeminiModel(),last==null ? null : last.getUpdatedAt(),updatedBy(last));
    }

    private AttendanceSettingsDto.Response attendanceResponse() {
        int minutes=settings.autoPresentMinutes();
        AppSetting saved=settings.find(AppSettingService.ATTENDANCE_AUTO_PRESENT_MINUTES).orElse(null);
        return new AttendanceSettingsDto.Response(minutes,minutes>0,saved==null ? null : saved.getUpdatedAt(),updatedBy(saved));
    }

    private String updatedBy(AppSetting saved) {
        return saved == null ? null : settings.updatedByName(saved.getUpdatedBy());
    }
}
