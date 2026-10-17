package com.viettritutor.repository;

import com.viettritutor.entity.Payment;
import org.springframework.data.jpa.repository.*;
import java.util.Optional;

public interface PaymentRepository extends JpaRepository<Payment, Long>, JpaSpecificationExecutor<Payment> {
    java.util.List<Payment> findByOrderIdOrderById(Long orderId);
    Optional<Payment> findByIntentId(Long intentId);
}
