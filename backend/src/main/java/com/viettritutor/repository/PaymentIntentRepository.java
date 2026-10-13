package com.viettritutor.repository;

import com.viettritutor.entity.PaymentIntent;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import java.time.OffsetDateTime;
import java.util.*;

public interface PaymentIntentRepository extends JpaRepository<PaymentIntent, Long> {
    Optional<PaymentIntent> findByVnpayReference(String reference);

    @Query("select p from PaymentIntent p where p.status = com.viettritutor.enums.PaymentIntentStatus.PENDING "
            + "and p.vnpayReference is not null and p.cancelledAt is null and p.expiresAt > :now "
            + "and p.classGroupId = :classId")
    List<PaymentIntent> reservedClass(Long classId, OffsetDateTime now);

    @Query("select p from PaymentIntent p where p.status = com.viettritutor.enums.PaymentIntentStatus.PENDING "
            + "and p.vnpayReference is not null and p.cancelledAt is null and p.expiresAt > :now "
            + "and p.studentId = :studentId")
    List<PaymentIntent> reservedStudent(Long studentId, OffsetDateTime now);
}
