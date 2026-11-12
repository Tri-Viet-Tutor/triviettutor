package com.viettritutor.service;

import com.viettritutor.common.exception.*;
import com.viettritutor.dto.catalog.*;
import com.viettritutor.entity.*;
import com.viettritutor.enums.*;
import com.viettritutor.repository.*;
import java.net.*;
import java.time.*;
import java.util.*;

public interface ClassService {

    ClassResponse create(CreateClassRequest request, User actor);
    ClassResponse changeStatus(Long id, ChangeClassStatusRequest request, User actor);
/**
     * Xóa hẳn lớp chưa từng có học viên, thanh toán hay lịch sử dạy (Bản nháp, Chưa mở đăng ký hoặc Đã hủy).
     * Xóa kèm lịch buổi, phân công gia sư và nhật ký của lớp; còn dữ liệu khác thì trả CLASS_IN_USE.
     */
    void delete(Long id, User actor);
    ClassResponse reopen(Long id, ReopenClassRequest request, User actor);
}
