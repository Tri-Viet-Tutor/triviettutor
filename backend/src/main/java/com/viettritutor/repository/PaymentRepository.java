package com.viettritutor.repository;

import com.viettritutor.entity.Payment;
import com.viettritutor.enums.PaymentStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface PaymentRepository extends JpaRepository<Payment, Long> {

    Optional<Payment> findByPaymentCode(String paymentCode);

    List<Payment> findByStudentId(Long studentId);

    List<Payment> findByStudentIdAndStatus(Long studentId, PaymentStatus status);

    boolean existsByPaymentCode(String paymentCode);

    boolean existsBySepayTransactionId(String sepayTransactionId);

    boolean existsBySepayReferenceCode(String sepayReferenceCode);
}
