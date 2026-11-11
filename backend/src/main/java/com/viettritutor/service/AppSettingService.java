package com.viettritutor.service;

import com.viettritutor.entity.AppSetting;
import com.viettritutor.entity.User;
import java.util.Optional;

/** Reads and writes admin-editable settings stored in app_settings. */
public interface AppSettingService {

/** ATT-01: minutes in the online classroom that count as PRESENT; 0 turns automatic attendance off. */
    public static final String ATTENDANCE_AUTO_PRESENT_MINUTES = "attendance.auto_present_minutes";
public static final int DEFAULT_AUTO_PRESENT_MINUTES = 15;
    Optional<AppSetting> find(String key);
    AppSetting put(String key,String value,User actor);
    int autoPresentMinutes();

    String updatedByName(Long userId);
}
