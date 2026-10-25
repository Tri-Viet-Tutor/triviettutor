package com.viettritutor.repository;
import com.viettritutor.entity.WalletTransaction;
import org.springframework.data.domain.*;
import org.springframework.data.jpa.repository.JpaRepository;
public interface WalletTransactionRepository extends JpaRepository<WalletTransaction, Long> {
    Page<WalletTransaction> findByWalletId(Long walletId, Pageable pageable);
}
