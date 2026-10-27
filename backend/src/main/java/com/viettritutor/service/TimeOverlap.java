package com.viettritutor.service;

import java.time.LocalTime;

public final class TimeOverlap {
    private TimeOverlap() {}

    public static boolean isOverlapping(LocalTime startA, LocalTime endA, LocalTime startB, LocalTime endB) {
        if (startA == null || endA == null || startB == null || endB == null) {
            return false;
        }
        return startA.isBefore(endB) && startB.isBefore(endA);
    }
}
