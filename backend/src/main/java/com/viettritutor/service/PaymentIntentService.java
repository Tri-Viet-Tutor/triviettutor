package com.viettritutor.service;

import com.viettritutor.common.exception.*;
import com.viettritutor.dto.payment.*;
import com.viettritutor.entity.*;
import com.viettritutor.enums.*;
import com.viettritutor.repository.*;
import org.springframework.transaction.annotation.Transactional;
import java.math.BigDecimal;
import java.time.*;
import java.util.UUID;

public interface PaymentIntentService {

    PaymentIntentResponse create(Long classId, String key, User student);

    PaymentConfirmationResponse confirm(Long intentId, String key, User student);
}
