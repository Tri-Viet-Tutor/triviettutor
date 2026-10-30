package com.viettritutor.repository;

import com.viettritutor.entity.EmailVerification;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface EmailVerificationRepository extends JpaRepository<EmailVerification, Long> {

    Optional<EmailVerification> findTopByEmailAndVerifiedFalseOrderByCreatedAtDesc(String email);

    Optional<EmailVerification> findTopByEmailOrderByCreatedAtDesc(String email);

    void deleteAllByEmail(String email);

    /**
     * Atomically records one wrong OTP entry while the code is still under the limit.
     * Returns 0 when the limit was already reached (possibly by a concurrent request).
     */
    @Modifying(flushAutomatically = true)
    @Query("""
            update EmailVerification v set v.failedAttempts = v.failedAttempts + 1
            where v.id = :id and v.failedAttempts < :maxAttempts
            """)
    int incrementFailedAttempts(@Param("id") Long id, @Param("maxAttempts") int maxAttempts);
}
