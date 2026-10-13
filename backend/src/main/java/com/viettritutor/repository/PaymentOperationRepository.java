package com.viettritutor.repository;

import com.viettritutor.entity.PaymentOperation;
import com.viettritutor.enums.PaymentOperationType;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface PaymentOperationRepository extends JpaRepository<PaymentOperation, Long> {
    Optional<PaymentOperation> findByActorIdAndOperationAndIdempotencyKey(
            Long actorId, PaymentOperationType operation, String idempotencyKey);
}
