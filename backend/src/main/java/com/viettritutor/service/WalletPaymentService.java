package com.viettritutor.service;

import com.viettritutor.common.exception.*;
import com.viettritutor.dto.payment.*;
import com.viettritutor.entity.*;
import com.viettritutor.enums.*;
import com.viettritutor.repository.*;
import jakarta.persistence.*;
import java.time.*;

public interface WalletPaymentService {

    PaymentConfirmationResponse confirm(Long intentId, String key, User student);
}
