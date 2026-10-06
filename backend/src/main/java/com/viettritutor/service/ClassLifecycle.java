package com.viettritutor.service;

/**
 * Integration contract implemented by the catalog/class module. Implementations
 * must make completion idempotent because lifecycle evaluation is retryable.
 */
public interface ClassLifecycle {
    void markCompleted(Long classGroupId);
}
