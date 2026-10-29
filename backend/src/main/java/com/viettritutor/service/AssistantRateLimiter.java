package com.viettritutor.service;

import com.viettritutor.common.exception.*;
import com.viettritutor.config.AssistantProperties;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.time.*;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Giới hạn số câu hỏi chatbot để không tốn phí API: theo phút và theo ngày cho từng người hỏi,
 * cộng một trần chung mỗi ngày cho cả hệ thống. Đếm trong bộ nhớ, khởi động lại backend là đếm lại.
 */
@Component
@RequiredArgsConstructor
public class AssistantRateLimiter {
    private final AssistantProperties properties;
    private final Clock clock;
    private final ConcurrentHashMap<String, Window> minutes = new ConcurrentHashMap<>();
    private final ConcurrentHashMap<String, Window> days = new ConcurrentHashMap<>();
    private Window global = new Window(0, 0);

    private record Window(long start, int count) {}

    /** Ghi nhận một câu hỏi của người hỏi và trả về số câu còn lại trong ngày. */
    public synchronized int acquire(String requester) {
        long minute = clock.instant().getEpochSecond() / 60;
        long day = LocalDate.now(clock).toEpochDay();
        Window perMinute = current(minutes, requester, minute);
        Window perDay = current(days, requester, day);
        if (global.start() != day) global = new Window(day, 0);
        if (perMinute.count() >= properties.getMaxPerMinute() || perDay.count() >= properties.getMaxPerDay()
                || global.count() >= properties.getGlobalMaxPerDay()) {
            throw new BusinessException(ErrorCode.ASSISTANT_RATE_LIMITED);
        }
        minutes.put(requester, new Window(minute, perMinute.count() + 1));
        days.put(requester, new Window(day, perDay.count() + 1));
        global = new Window(day, global.count() + 1);
        if (days.size() > 10_000) days.values().removeIf(window -> window.start() != day);
        if (minutes.size() > 10_000) minutes.values().removeIf(window -> window.start() != minute);
        return properties.getMaxPerDay() - perDay.count() - 1;
    }

    private static Window current(ConcurrentHashMap<String, Window> windows, String requester, long start) {
        Window window = windows.get(requester);
        return window == null || window.start() != start ? new Window(start, 0) : window;
    }
}
