package com.viettritutor.repository;

import com.viettritutor.entity.Payment;
import org.springframework.data.jpa.repository.*;
import java.util.Optional;

public interface PaymentRepository extends JpaRepository<Payment, Long>, JpaSpecificationExecutor<Payment> {
    Optional<Payment> findByIntentId(Long intentId);
}
