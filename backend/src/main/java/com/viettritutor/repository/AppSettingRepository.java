package com.viettritutor.repository;

import com.viettritutor.entity.AppSetting;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AppSettingRepository extends JpaRepository<AppSetting,String> {}
