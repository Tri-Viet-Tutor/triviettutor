package com.viettritutor.dto.wallet;
import com.viettritutor.entity.WalletTransaction;
import java.math.BigDecimal;
import java.time.OffsetDateTime;
public record WalletTransactionResponse(Long transactionId, String type, BigDecimal amount,
                                         BigDecimal balanceAfter, String description, OffsetDateTime createdAt) {
    public static WalletTransactionResponse from(WalletTransaction t) {
        return new WalletTransactionResponse(t.getId(), t.getType(), t.getAmount(), t.getBalanceAfter(), t.getDescription(), t.getCreatedAt());
    }
}
