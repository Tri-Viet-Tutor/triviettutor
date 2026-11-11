package com.viettritutor.service;

import com.viettritutor.common.api.PageResponse;
import com.viettritutor.common.exception.*;
import com.viettritutor.dto.payroll.*;
import com.viettritutor.entity.*;
import com.viettritutor.enums.*;
import com.viettritutor.repository.*;
import jakarta.persistence.*;
import java.time.*;
import java.util.*;

public interface PayrollService {

    PayrollResponse get(int year,int month,User actor);
    PayrollResponse finalizePeriod(int year,int month,String key,User actor);
    PageResponse<PayrollLineResponse> mine(Integer year,Integer month,int page,int size,User actor);
/**
     * PAYR-02: các tháng của chính gia sư mà trung tâm chưa chốt lương, tính tạm theo buổi đã dạy xong.
     * Tháng đã chốt không trả ở đây vì đã nằm trong GET /tutor/payroll. Chưa khai báo lương cứng hoặc
     * đơn giá buổi thì trả rỗng: dashboard chỉ thiếu số tạm tính chứ không vỡ.
     */
    List<PayrollLineResponse> myEstimate(User actor);
}
