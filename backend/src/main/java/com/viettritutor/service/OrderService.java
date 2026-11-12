package com.viettritutor.service;

import com.viettritutor.common.api.PageResponse;
import com.viettritutor.common.exception.*;
import com.viettritutor.dto.order.*;
import com.viettritutor.entity.*;
import com.viettritutor.enums.*;
import com.viettritutor.repository.*;
import jakarta.persistence.*;
import org.springframework.data.domain.*;
import java.time.*;
import java.util.*;

public interface OrderService {

    OrderResponse checkout(CheckoutRequest input,String key,User student);
    OrderResponse pay(Long orderId,String key,User student);
    OrderResponse cancel(Long orderId,String reason,String key,User student);
    OrderResponse detail(Long id,User actor);
    PageResponse<OrderResponse> list(User actor,boolean admin,Long studentId,OrderStatus status,LocalDate from,LocalDate to,int page,int size);
}
