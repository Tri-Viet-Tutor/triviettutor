package com.viettritutor.repository;

import com.viettritutor.entity.Refund;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.*;

public interface RefundRepository extends JpaRepository<Refund, Long> {
    Optional<Refund> findByEnrollmentId(Long enrollmentId);
    Optional<Refund> findByPaymentId(Long paymentId);
    List<Refund> findByPaymentIdIn(Collection<Long> paymentIds);
}
