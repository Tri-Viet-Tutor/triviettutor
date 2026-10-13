package com.viettritutor.service;

import com.viettritutor.common.exception.*;
import com.viettritutor.entity.PaymentOperation;
import com.viettritutor.enums.PaymentOperationType;
import com.viettritutor.repository.PaymentOperationRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;
import java.security.*;
import java.time.*;
import java.util.*;

@Service
@RequiredArgsConstructor
public class PaymentIdempotencyService {
    private final PaymentOperationRepository repository;
    private final Clock clock;

    public Optional<Long> replay(Long actorId, PaymentOperationType operation, String key, String request) {
        validateKey(key);
        String fingerprint = fingerprint(request);
        return repository.findByActorIdAndOperationAndIdempotencyKey(actorId, operation, key).map(saved -> {
            if (!saved.getRequestFingerprint().equals(fingerprint)) throw new BusinessException(ErrorCode.IDEMPOTENCY_CONFLICT);
            return saved.getResultId();
        });
    }

    public void remember(Long actorId, PaymentOperationType operation, String key, String request, Long resultId) {
        repository.save(PaymentOperation.builder().actorId(actorId).operation(operation).idempotencyKey(key)
                .requestFingerprint(fingerprint(request)).resultId(resultId).createdAt(OffsetDateTime.now(clock)).build());
    }

    public void validateKey(String key) {
        if (key == null || !key.matches("[!-~]{1,100}")) throw new BusinessException(ErrorCode.INVALID_IDEMPOTENCY_KEY);
    }

    private String fingerprint(String input) {
        try {
            return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(input.getBytes(StandardCharsets.UTF_8)));
        } catch (NoSuchAlgorithmException exception) {
            throw new IllegalStateException(exception);
        }
    }
}
