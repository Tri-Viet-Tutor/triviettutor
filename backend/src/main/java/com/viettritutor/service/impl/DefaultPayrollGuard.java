package com.viettritutor.service.impl;
import com.viettritutor.common.exception.*;
import com.viettritutor.repository.*;
import com.viettritutor.service.PayrollGuard;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.*;
import java.time.*;
import java.util.List;

@Service @RequiredArgsConstructor
public class DefaultPayrollGuard implements PayrollGuard {
    private final PayrollPeriodRepository periods;
    private final PayrollMutexRepository mutex;
    private final SessionRepository sessions;
    private final Clock clock;

    @Transactional(propagation=Propagation.MANDATORY)
    public void lockFinalization() {
        mutex.insertIfAbsent();
        mutex.lock().orElseThrow();
    }

    @Override
    @Transactional(propagation=Propagation.MANDATORY)
    public void prepareSessionGeneration(List<LocalDate> dates) {
        // Future generation cannot enter a period eligible for finalization.
        if (dates.stream().anyMatch(d -> YearMonth.from(d).isBefore(YearMonth.now(clock)))) lockFinalization();
    }

    @Override
    public void assertDateEditable(LocalDate date) {
        if (isDateFinalized(date)) throw new BusinessException(ErrorCode.PAYROLL_FINALIZED);
    }

    @Override
    public boolean isDateFinalized(LocalDate date) {
        return periods.existsByYearAndMonth(date.getYear(),date.getMonthValue());
    }

    @Override
    public void assertSessionEditable(Long sessionId) {
        assertDateEditable(sessions.findById(sessionId)
                .orElseThrow(() -> new BusinessException(ErrorCode.SESSION_NOT_FOUND)).getSessionDate());
    }
}
