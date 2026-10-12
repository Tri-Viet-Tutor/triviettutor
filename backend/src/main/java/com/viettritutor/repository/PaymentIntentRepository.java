package com.viettritutor.repository;

import com.viettritutor.entity.PaymentIntent;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PaymentIntentRepository extends JpaRepository<PaymentIntent, Long> {}
