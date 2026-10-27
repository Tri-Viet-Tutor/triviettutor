package com.viettritutor.repository;
import com.viettritutor.entity.WalletTopupIntent;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;
public interface WalletTopupIntentRepository extends JpaRepository<WalletTopupIntent, Long> {
    Optional<WalletTopupIntent> findByReference(String reference);
}
