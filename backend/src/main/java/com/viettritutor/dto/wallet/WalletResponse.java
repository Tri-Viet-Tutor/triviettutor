package com.viettritutor.dto.wallet;
import java.math.BigDecimal;
public record WalletResponse(Long walletId, BigDecimal balance, String currency,
                             BigDecimal minTopupAmount, BigDecimal maxTopupAmount) {}
