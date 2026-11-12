package com.viettritutor.service;

import com.viettritutor.common.exception.*;
import com.viettritutor.dto.order.CartResponse;
import com.viettritutor.entity.*;
import com.viettritutor.repository.*;
import java.time.*;
import java.util.*;

public interface CartService {

    CartResponse get(User student);
    CartResponse add(Long subjectId,User student);
    CartResponse remove(Long itemId,User student);
    CartResponse clear(User student);
}
