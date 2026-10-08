package com.viettritutor.service;

import java.time.LocalTime;

public final class TimeOverlap {
    private TimeOverlap() {}

    public static boolean isOverlapping(LocalTime startA, LocalTime endA, LocalTime startB, LocalTime endB) {
        return startA.isBefore(endB) && startB.isBefore(endA);
    }
}
