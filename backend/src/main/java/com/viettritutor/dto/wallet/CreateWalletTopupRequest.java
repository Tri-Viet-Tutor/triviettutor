package com.viettritutor.dto.wallet;
import jakarta.validation.constraints.*;
import java.math.BigDecimal;
public record CreateWalletTopupRequest(@NotNull @Positive @Digits(integer = 10, fraction = 0) BigDecimal amount) {}
