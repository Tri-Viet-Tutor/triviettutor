package com.viettritutor.repository;

import com.viettritutor.entity.EmailVerification;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface EmailVerificationRepository extends JpaRepository<EmailVerification, Long> {

    Optional<EmailVerification> findTopByEmailAndVerifiedFalseOrderByCreatedAtDesc(String email);

    void deleteAllByEmail(String email);
}
