package com.viettritutor.service;

/** Fallback event used until the class module provides a ClassLifecycle bean. */
public record ClassTeachingCompletedEvent(Long classGroupId) {
}
