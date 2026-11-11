package com.viettritutor.entity;

import java.util.Arrays;
import java.util.Collection;
import java.util.List;
import java.util.stream.Collectors;

/** Sets of option indexes stored as sorted, comma-separated text ("0,2") in correct_options / selected_options. */
public final class OptionIndexes {
    private OptionIndexes() {}

    /** Sorted, distinct indexes; empty for null or blank text */
    public static List<Integer> parse(String text) {
        if (text == null || text.isBlank()) return List.of();
        return Arrays.stream(text.split(",")).map(String::trim).map(Integer::valueOf).distinct().sorted().toList();
    }

    /** Text for two or more indexes; null for zero or one (those live in the single-index column alone) */
    public static String format(Collection<Integer> indexes) {
        List<Integer> sorted = indexes.stream().distinct().sorted().toList();
        return sorted.size() < 2 ? null : sorted.stream().map(String::valueOf).collect(Collectors.joining(","));
    }

    /** The full set from the single-index column plus the multi-index column */
    public static List<Integer> of(Integer single, String multiple) {
        if (multiple != null) return parse(multiple);
        return single == null ? List.of() : List.of(single);
    }
}
