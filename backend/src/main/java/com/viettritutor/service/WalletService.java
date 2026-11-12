package com.viettritutor.service;

import com.viettritutor.common.api.PageResponse;
import com.viettritutor.common.exception.*;
import com.viettritutor.dto.wallet.*;
import com.viettritutor.entity.*;
import com.viettritutor.repository.*;
import jakarta.persistence.*;
import org.springframework.data.domain.*;
import java.math.BigDecimal;
import java.time.*;

/** Port of Bike Exchange's lazy wallet and balance history, serialized by owner. */
public interface WalletService {

    WalletResponse view(User student);
    PageResponse<WalletTransactionResponse> history(User student, int page, int size);
    void post(Long studentId, String type, BigDecimal amount, Long topupId, Long paymentId, Long refundId, String description);
    boolean creditClassDiscount(Long studentId, Long enrollmentId, BigDecimal amount, String description);
/** Group-size discount already credited to the wallet for this enrollment (zero when none). */
    BigDecimal classDiscountCredited(Long enrollmentId);
}
