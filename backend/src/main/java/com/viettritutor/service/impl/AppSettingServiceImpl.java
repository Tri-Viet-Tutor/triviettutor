package com.viettritutor.service.impl;
import com.viettritutor.repository.UserRepository;
import com.viettritutor.service.*;
import com.viettritutor.service.AppSettingService;

import com.viettritutor.entity.AppSetting;
import com.viettritutor.entity.User;
import com.viettritutor.repository.AppSettingRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.time.temporal.ChronoUnit;
import java.util.Optional;

/** Reads and writes admin-editable settings stored in app_settings. */
@Service @RequiredArgsConstructor
public class AppSettingServiceImpl implements AppSettingService {
    
    

    private final AppSettingRepository settings;
    private final UserRepository users;
    private final Clock clock;

    @Override
    @Transactional(readOnly=true)
    public Optional<AppSetting> find(String key) {
        return settings.findById(key);
    }

    @Override
    @Transactional
    public AppSetting put(String key,String value,User actor) {
        AppSetting setting=settings.findById(key).orElseGet(() -> AppSetting.builder().key(key).build());
        setting.setValue(value);
        setting.setUpdatedBy(actor==null ? null : actor.getId());
        setting.setUpdatedAt(OffsetDateTime.ofInstant(clock.instant().truncatedTo(ChronoUnit.MICROS),ZoneOffset.UTC));
        return settings.saveAndFlush(setting);
    }

    @Override
    @Transactional(readOnly=true)
    public int autoPresentMinutes() {
        return find(ATTENDANCE_AUTO_PRESENT_MINUTES).map(AppSetting::getValue).map(v -> {
            try { return Integer.parseInt(v.trim()); } catch(NumberFormatException ex) { return DEFAULT_AUTO_PRESENT_MINUTES; }
        }).orElse(DEFAULT_AUTO_PRESENT_MINUTES);
    }

    @Override
    @Transactional(readOnly = true)
    public String updatedByName(Long userId) {
        if (userId == null) return null;
        return users.findById(userId).map(User::getFullName).orElse(null);
    }
}
