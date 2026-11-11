package com.viettritutor.service;

/**
 * Integration contract implemented by the catalog/class module. Implementations
 * must make completion idempotent because lifecycle evaluation is retryable.
 */
public interface ClassLifecycle {
    void markCompleted(Long classGroupId);

    /** True when every original session is completed, or cancelled and replaced by a completed makeup. */
    boolean allObligationsCompleted(Long classGroupId);
}
