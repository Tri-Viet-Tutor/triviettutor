package com.viettritutor.service;

import com.viettritutor.common.api.PageResponse;
import com.viettritutor.common.exception.*;
import com.viettritutor.config.WalletProperties;
import com.viettritutor.dto.wallet.*;
import com.viettritutor.entity.*;
import com.viettritutor.repository.*;
import jakarta.persistence.*;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.math.BigDecimal;
import java.time.*;

/** Port of Bike Exchange's lazy wallet and balance history, serialized by owner. */
@Service @RequiredArgsConstructor
public class WalletService {
    private static final BigDecimal MAX_BALANCE = new BigDecimal("999999999999999");
    private final WalletRepository wallets;
    private final WalletTransactionRepository transactions;
    private final EnrollmentPaymentSupport support;
    private final WalletProperties properties;
    private final EntityManager entityManager;
    private final Clock clock;

    @Transactional
    public WalletResponse view(User student) {
        support.student(student);
        support.lockPeople(student.getId());
        Wallet wallet = ownedWallet(student.getId());
        return new WalletResponse(wallet.getId(), wallet.getBalance(), "VND",
                properties.getTopupMinAmount(), properties.getTopupMaxAmount());
    }

    @Transactional(readOnly = true)
    public PageResponse<WalletTransactionResponse> history(User student, int page, int size) {
        support.student(student);
        if (page < 0 || size < 1 || size > 100) throw new BusinessException(ErrorCode.INVALID_PAGINATION);
        Pageable paging = PageRequest.of(page, size, Sort.by("id").descending());
        return PageResponse.from(wallets.findByStudentId(student.getId())
                .map(w -> transactions.findByWalletId(w.getId(), paging))
                .orElseGet(() -> Page.empty(paging)).map(WalletTransactionResponse::from));
    }

    // Internal only. Callers have already locked class/intent/payment as needed.
    // Taking the owner lock also makes lazy wallet creation safe across all writes.
    @Transactional
    public void post(Long studentId, String type, BigDecimal amount,
                     Long topupId, Long paymentId, Long refundId, String description) {
        if (amount == null || amount.signum() <= 0 || amount.stripTrailingZeros().scale() > 0) {
            throw new IllegalArgumentException("Wallet entries require positive whole VND");
        }
        boolean validSource = switch (type) {
            case "TOPUP" -> topupId != null && paymentId == null && refundId == null;
            case "TUITION" -> paymentId != null && topupId == null && refundId == null;
            case "REFUND" -> refundId != null && topupId == null && paymentId == null;
            default -> false;
        };
        if (!validSource) throw new IllegalArgumentException("Wallet entry requires its matching source");
        support.lockPeople(studentId);
        Wallet wallet = ownedWallet(studentId);
        BigDecimal next = "TUITION".equals(type) ? wallet.getBalance().subtract(amount) : wallet.getBalance().add(amount);
        if (next.signum() < 0) throw new BusinessException(ErrorCode.WALLET_INSUFFICIENT_FUNDS);
        if (next.compareTo(MAX_BALANCE) > 0) throw new BusinessException(ErrorCode.WALLET_BALANCE_LIMIT);
        wallet.setBalance(next);
        transactions.saveAndFlush(WalletTransaction.builder().walletId(wallet.getId()).type(type).amount(amount)
                .balanceAfter(next).topupId(topupId).paymentId(paymentId).refundId(refundId)
                .description(description).createdAt(OffsetDateTime.now(clock)).build());
    }

    @Transactional
    public boolean creditClassDiscount(Long studentId, Long enrollmentId, BigDecimal amount, String description) {
        if (amount == null || amount.signum() <= 0 || amount.stripTrailingZeros().scale() > 0) return false;
        if (transactions.existsByEnrollmentId(enrollmentId)) return false;
        support.lockPeople(studentId);
        Wallet wallet = ownedWallet(studentId);
        BigDecimal next = wallet.getBalance().add(amount);
        if (next.compareTo(MAX_BALANCE) > 0) throw new BusinessException(ErrorCode.WALLET_BALANCE_LIMIT);
        wallet.setBalance(next);
        transactions.saveAndFlush(WalletTransaction.builder().walletId(wallet.getId()).type("CLASS_DISCOUNT").amount(amount)
                .balanceAfter(next).enrollmentId(enrollmentId).description(description)
                .createdAt(OffsetDateTime.now(clock)).build());
        return true;
    }

    /** Group-size discount already credited to the wallet for this enrollment (zero when none). */
    @Transactional(readOnly = true)
    public BigDecimal classDiscountCredited(Long enrollmentId) {
        if (enrollmentId == null) return BigDecimal.ZERO;
        return transactions.findByEnrollmentId(enrollmentId).map(WalletTransaction::getAmount).orElse(BigDecimal.ZERO);
    }

    private Wallet ownedWallet(Long studentId) {
        Wallet wallet = wallets.findByStudentId(studentId).orElseGet(() -> wallets.saveAndFlush(Wallet.builder()
                .studentId(studentId).balance(BigDecimal.ZERO).createdAt(OffsetDateTime.now(clock)).build()));
        entityManager.refresh(wallet, LockModeType.PESSIMISTIC_WRITE);
        return wallet;
    }
}
