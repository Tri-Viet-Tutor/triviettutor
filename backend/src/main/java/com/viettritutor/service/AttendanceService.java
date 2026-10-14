package com.viettritutor.service;

import com.viettritutor.dto.attendance.AttendanceCorrection;
import com.viettritutor.dto.attendance.AttendanceLockInput;
import com.viettritutor.dto.attendance.AttendanceRecordResponse;
import com.viettritutor.dto.attendance.AttendanceResponse;
import com.viettritutor.dto.attendance.AttendanceSubmission;
import com.viettritutor.entity.User;

public interface AttendanceService {
    AttendanceResponse get(Long sessionId, User actor);
    AttendanceResponse submit(Long sessionId, AttendanceSubmission input, User actor);
    AttendanceResponse setLock(Long sessionId, AttendanceLockInput input, User admin);
    AttendanceRecordResponse correct(Long sessionId, Long recordId, AttendanceCorrection input, User admin);
    boolean autoLock(Long sessionId);
}
