package com.viettritutor.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import com.viettritutor.common.api.PageResponse;
import com.viettritutor.common.exception.BusinessException;
import com.viettritutor.common.exception.ErrorCode;
import com.viettritutor.dto.attendance.TeachingPeriodSummary;
import com.viettritutor.dto.attendance.TeachingSessionResponse;
import com.viettritutor.dto.payroll.PayrollLineResponse;
import com.viettritutor.dto.payroll.PayrollResponse;
import com.viettritutor.entity.*;
import com.viettritutor.enums.PayrollStatus;
import com.viettritutor.enums.SessionStatus;
import com.viettritutor.repository.*;
import com.viettritutor.service.impl.DefaultPayrollGuard;
import jakarta.persistence.EntityManager;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;

import java.math.BigDecimal;
import java.time.*;
import java.util.*;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("Payroll Mutex Guard & Calculation Precision Unit Tests")
class PayrollMutexTest {

    private static final Instant NOW = Instant.parse("2026-10-25T10:00:00Z");
    private static final Clock CLOCK = Clock.fixed(NOW, ZoneOffset.UTC);

    @Nested
    @DisplayName("DefaultPayrollGuard Mutex & Boundary Tests")
    class GuardTests {

        @Mock
        private PayrollPeriodRepository periodRepository;
        @Mock
        private PayrollMutexRepository mutexRepository;
        @Mock
        private SessionRepository sessionRepository;

        private DefaultPayrollGuard guard;

        @BeforeEach
        void setUp() {
            guard = new DefaultPayrollGuard(periodRepository, mutexRepository, sessionRepository, CLOCK);
        }

        @Test
        @DisplayName("lockFinalization invokes insertIfAbsent and locks mutex row id=1")
        void lockFinalization_acquiresLockSuccessfully() {
            PayrollMutex mockMutex = new PayrollMutex(1L);
            when(mutexRepository.lock()).thenReturn(Optional.of(mockMutex));

            guard.lockFinalization();

            verify(mutexRepository).insertIfAbsent();
            verify(mutexRepository).lock();
        }

        @Test
        @DisplayName("prepareSessionGeneration acquires lock when any date is in a past period")
        void prepareSessionGeneration_pastDates_acquiresLock() {
            LocalDate pastDate = LocalDate.of(2026, 9, 15);
            when(mutexRepository.lock()).thenReturn(Optional.of(new PayrollMutex(1L)));

            guard.prepareSessionGeneration(List.of(pastDate));

            verify(mutexRepository).insertIfAbsent();
            verify(mutexRepository).lock();
        }

        @Test
        @DisplayName("prepareSessionGeneration does not acquire lock when all dates are current or future")
        void prepareSessionGeneration_futureDates_doesNotLock() {
            LocalDate futureDate = LocalDate.of(2026, 11, 1);

            guard.prepareSessionGeneration(List.of(futureDate));

            verify(mutexRepository, never()).insertIfAbsent();
            verify(mutexRepository, never()).lock();
        }

        @Test
        @DisplayName("assertDateEditable throws PAYROLL_FINALIZED if period already exists")
        void assertDateEditable_finalizedPeriod_throwsBusinessException() {
            LocalDate date = LocalDate.of(2026, 8, 10);
            when(periodRepository.existsByYearAndMonth(2026, 8)).thenReturn(true);

            assertThatThrownBy(() -> guard.assertDateEditable(date))
                    .isInstanceOf(BusinessException.class)
                    .extracting("errorCode")
                    .isEqualTo(ErrorCode.PAYROLL_FINALIZED);
        }

        @Test
        @DisplayName("assertDateEditable succeeds if period is not finalized")
        void assertDateEditable_unfinalizedPeriod_succeeds() {
            LocalDate date = LocalDate.of(2026, 8, 10);
            when(periodRepository.existsByYearAndMonth(2026, 8)).thenReturn(false);

            guard.assertDateEditable(date);
        }

        @Test
        @DisplayName("assertSessionEditable throws SESSION_NOT_FOUND when session missing")
        void assertSessionEditable_notFound_throwsBusinessException() {
            when(sessionRepository.findById(999L)).thenReturn(Optional.empty());

            assertThatThrownBy(() -> guard.assertSessionEditable(999L))
                    .isInstanceOf(BusinessException.class)
                    .extracting("errorCode")
                    .isEqualTo(ErrorCode.SESSION_NOT_FOUND);
        }

        @Test
        @DisplayName("assertSessionEditable throws PAYROLL_FINALIZED when session is in finalized month")
        void assertSessionEditable_finalized_throwsBusinessException() {
            Session s = Session.builder().id(100L).sessionDate(LocalDate.of(2026, 7, 20)).build();
            when(sessionRepository.findById(100L)).thenReturn(Optional.of(s));
            when(periodRepository.existsByYearAndMonth(2026, 7)).thenReturn(true);

            assertThatThrownBy(() -> guard.assertSessionEditable(100L))
                    .isInstanceOf(BusinessException.class)
                    .extracting("errorCode")
                    .isEqualTo(ErrorCode.PAYROLL_FINALIZED);
        }
    }

    @Nested
    @DisplayName("PayrollService Calculation Precision & Mutex Execution Tests")
    class ServiceTests {

        @Mock
        private PayrollPeriodRepository periodRepository;
        @Mock
        private PayrollLineRepository lineRepository;
        @Mock
        private PayrollFinalizeKeyRepository keyRepository;
        @Mock
        private TutorProfileRepository profileRepository;
        @Mock
        private SessionRepository sessionRepository;
        @Mock
        private TeachingQuery teachingQuery;
        @Mock
        private DefaultPayrollGuard guard;
        @Mock
        private EntityManager entityManager;

        private final ObjectMapper objectMapper = new ObjectMapper().registerModule(new JavaTimeModule());
        private PayrollService payrollService;

        private User adminUser;
        private User tutorUser;
        private TutorProfile tutorProfile;

        @BeforeEach
        void setUp() {
            payrollService = new PayrollService(
                    periodRepository,
                    lineRepository,
                    keyRepository,
                    profileRepository,
                    sessionRepository,
                    teachingQuery,
                    guard,
                    objectMapper,
                    entityManager,
                    CLOCK
            );

            adminUser = User.builder().id(1L).email("admin@vtt.vn").role("ROLE_ADMIN").fullName("Admin").build();
            tutorUser = User.builder().id(10L).email("tutor@vtt.vn").role("ROLE_TUTOR").fullName("Thầy Hoàng").build();
            tutorProfile = new TutorProfile();
            tutorProfile.setId(10L);
            tutorProfile.setUser(tutorUser);
            tutorProfile.setBaseSalary(new BigDecimal("5000000"));
            tutorProfile.setSessionRate(new BigDecimal("200000"));
        }

        @Test
        @DisplayName("Payroll calculation strictly enforces Total = BaseSalary + (ValidSessions * SessionRate)")
        void get_preview_calculatesTotalSalaryAccurately() {
            YearMonth period = YearMonth.of(2026, 9);
            when(periodRepository.findByYearAndMonth(2026, 9)).thenReturn(Optional.empty());
            when(profileRepository.findPayrollEligible(any(LocalDateTime.class), any(LocalDate.class), any(LocalDate.class))).thenReturn(List.of(tutorProfile));

            // 8 completed sessions
            List<TeachingSessionResponse> completed = new ArrayList<>();
            for (long i = 1; i <= 8; i++) {
                completed.add(new TeachingSessionResponse(
                        i, 1L, null, period.atDay((int) i), LocalTime.of(18, 0), LocalTime.of(20, 0),
                        SessionStatus.COMPLETED, 10L, 10L, 10L, 1L, OffsetDateTime.now(), true, false, null, null, null
                ));
            }
            TeachingPeriodSummary summary = new TeachingPeriodSummary(10L, period, completed, List.of(), List.of(), List.of());
            when(teachingQuery.periodSummary(10L, period)).thenReturn(summary);
            when(sessionRepository.findBySessionDateBetweenOrderBySessionDateAscStartTimeAscIdAsc(period.atDay(1), period.atEndOfMonth()))
                    .thenReturn(List.of());

            PayrollResponse response = payrollService.get(2026, 9, adminUser);

            assertThat(response).isNotNull();
            assertThat(response.getStatus()).isEqualTo(PayrollStatus.DRAFT);
            assertThat(response.getLines()).hasSize(1);

            PayrollLineResponse line = response.getLines().getFirst();
            assertThat(line.getBaseSalary()).isEqualByComparingTo("5000000");
            assertThat(line.getSessionRate()).isEqualByComparingTo("200000");
            assertThat(line.getValidSessions()).isEqualTo(8);
            // 8 * 200,000 = 1,600,000
            assertThat(line.getSessionPay()).isEqualByComparingTo("1600000");
            // 5,000,000 + 1,600,000 = 6,600,000
            assertThat(line.getTotalPay()).isEqualByComparingTo("6600000");
            assertThat(response.getTotalPayroll()).isEqualByComparingTo("6600000");
        }

        @Test
        @DisplayName("Crediting substitute teaching: substitute tutor earns session rate while scheduled tutor receives substitutedOut")
        void get_preview_substituteTutorCreditedAndOriginalSubstitutedOut() {
            YearMonth period = YearMonth.of(2026, 9);
            User subUser = User.builder().id(20L).email("sub@vtt.vn").role("ROLE_TUTOR").fullName("Thầy Tuấn").build();
            TutorProfile subProfile = new TutorProfile();
            subProfile.setId(20L);
            subProfile.setUser(subUser);
            subProfile.setBaseSalary(new BigDecimal("3000000"));
            subProfile.setSessionRate(new BigDecimal("250000"));

            when(periodRepository.findByYearAndMonth(2026, 9)).thenReturn(Optional.empty());
            when(profileRepository.findPayrollEligible(any(LocalDateTime.class), any(LocalDate.class), any(LocalDate.class))).thenReturn(List.of(tutorProfile, subProfile));

            // Original tutor has 0 completed, 1 substitutedOut
            TeachingSessionResponse subbedOut = new TeachingSessionResponse(
                    101L, 1L, null, period.atDay(5), LocalTime.of(18, 0), LocalTime.of(20, 0),
                    SessionStatus.COMPLETED, 10L, 20L, 20L, 1L, OffsetDateTime.now(), true, false, null, null, null
            );
            TeachingPeriodSummary originalSummary = new TeachingPeriodSummary(10L, period, List.of(), List.of(), List.of(subbedOut), List.of());
            when(teachingQuery.periodSummary(10L, period)).thenReturn(originalSummary);

            // Sub tutor has 1 completed (actualTutorId == 20L)
            TeachingPeriodSummary subSummary = new TeachingPeriodSummary(20L, period, List.of(subbedOut), List.of(), List.of(), List.of());
            when(teachingQuery.periodSummary(20L, period)).thenReturn(subSummary);
            when(sessionRepository.findBySessionDateBetweenOrderBySessionDateAscStartTimeAscIdAsc(period.atDay(1), period.atEndOfMonth()))
                    .thenReturn(List.of());

            PayrollResponse response = payrollService.get(2026, 9, adminUser);

            // Original tutor: base 5,000,000 + 0 = 5,000,000
            PayrollLineResponse originalLine = response.getLines().stream().filter(l -> l.getTutorId() == 10L).findFirst().orElseThrow();
            assertThat(originalLine.getValidSessions()).isEqualTo(0);
            assertThat(originalLine.getSubstitutedOutSessions()).isEqualTo(1);
            assertThat(originalLine.getSessionPay()).isEqualByComparingTo("0");
            assertThat(originalLine.getTotalPay()).isEqualByComparingTo("5000000");

            // Sub tutor: base 3,000,000 + 1 * 250,000 = 3,250,000
            PayrollLineResponse subLine = response.getLines().stream().filter(l -> l.getTutorId() == 20L).findFirst().orElseThrow();
            assertThat(subLine.getValidSessions()).isEqualTo(1);
            assertThat(subLine.getSessionPay()).isEqualByComparingTo("250000");
            assertThat(subLine.getTotalPay()).isEqualByComparingTo("3250000");

            // Total payroll: 5,000,000 + 3,250,000 = 8,250,000
            assertThat(response.getTotalPayroll()).isEqualByComparingTo("8250000");
        }

        @Test
        @DisplayName("finalizePeriod enforces guard.lockFinalization and creates finalized snapshot")
        void finalizePeriod_acquiresMutexAndPersistsSnapshot() {
            YearMonth period = YearMonth.of(2026, 9);
            when(keyRepository.findById("idemp-key-101")).thenReturn(Optional.empty());
            when(periodRepository.findByYearAndMonth(2026, 9)).thenReturn(Optional.empty());
            when(sessionRepository.findPayrollSessionsForUpdate(period.atDay(1), period.atEndOfMonth())).thenReturn(List.of());
            when(profileRepository.findPayrollEligibleForUpdate(any(LocalDateTime.class), any(LocalDate.class), any(LocalDate.class))).thenReturn(List.of(tutorProfile));

            TeachingPeriodSummary summary = new TeachingPeriodSummary(10L, period, List.of(), List.of(), List.of(), List.of());
            when(teachingQuery.periodSummary(10L, period)).thenReturn(summary);

            PayrollPeriod mockPeriod = PayrollPeriod.builder()
                    .id(50L)
                    .year(2026)
                    .month(9)
                    .status(PayrollStatus.FINALIZED)
                    .totalPayroll(new BigDecimal("5000000"))
                    .idempotencyKey("idemp-key-101")
                    .finalizedBy(1L)
                    .finalizedAt(OffsetDateTime.now())
                    .build();
            when(periodRepository.saveAndFlush(any(PayrollPeriod.class))).thenReturn(mockPeriod);
            when(lineRepository.findByPeriodIdOrderByTutorId(50L)).thenReturn(List.of());

            PayrollResponse finalized = payrollService.finalizePeriod(2026, 9, "idemp-key-101", adminUser);

            // Verifies database-level PayrollMutex lock is acquired
            verify(guard).lockFinalization();
            verify(periodRepository).saveAndFlush(any(PayrollPeriod.class));
            verify(lineRepository).flush();
            assertThat(finalized.getStatus()).isEqualTo(PayrollStatus.FINALIZED);
        }

        @Test
        @DisplayName("finalizePeriod rejects invalid idempotency keys with INVALID_PAYROLL_KEY")
        void finalizePeriod_invalidKey_throwsBusinessException() {
            assertThatThrownBy(() -> payrollService.finalizePeriod(2026, 9, "bad key with spaces", adminUser))
                    .isInstanceOf(BusinessException.class)
                    .extracting("errorCode")
                    .isEqualTo(ErrorCode.INVALID_PAYROLL_KEY);

            assertThatThrownBy(() -> payrollService.finalizePeriod(2026, 9, null, adminUser))
                    .isInstanceOf(BusinessException.class)
                    .extracting("errorCode")
                    .isEqualTo(ErrorCode.INVALID_PAYROLL_KEY);
        }

        @Test
        @DisplayName("finalizePeriod rejects current or future months with PAYROLL_PERIOD_NOT_ENDED")
        void finalizePeriod_futureMonth_throwsBusinessException() {
            // CLOCK is in 2026-10, so 2026-10 or 2026-11 cannot be finalized
            assertThatThrownBy(() -> payrollService.finalizePeriod(2026, 10, "valid-key-1", adminUser))
                    .isInstanceOf(BusinessException.class)
                    .extracting("errorCode")
                    .isEqualTo(ErrorCode.PAYROLL_PERIOD_NOT_ENDED);

            assertThatThrownBy(() -> payrollService.finalizePeriod(2026, 11, "valid-key-2", adminUser))
                    .isInstanceOf(BusinessException.class)
                    .extracting("errorCode")
                    .isEqualTo(ErrorCode.PAYROLL_PERIOD_NOT_ENDED);
        }

        @Test
        @DisplayName("finalizePeriod rejects finalization if there are unresolved blocking sessions")
        void finalizePeriod_unresolvedSessions_throwsBusinessException() {
            YearMonth period = YearMonth.of(2026, 9);
            when(keyRepository.findById("key-unresolved")).thenReturn(Optional.empty());
            when(periodRepository.findByYearAndMonth(2026, 9)).thenReturn(Optional.empty());

            Session scheduledSession = Session.builder().id(501L).status(SessionStatus.SCHEDULED).build();
            when(sessionRepository.findPayrollSessionsForUpdate(period.atDay(1), period.atEndOfMonth()))
                    .thenReturn(List.of(scheduledSession));
            when(profileRepository.findPayrollEligibleForUpdate(any(LocalDateTime.class), any(LocalDate.class), any(LocalDate.class))).thenReturn(List.of(tutorProfile));

            TeachingPeriodSummary summary = new TeachingPeriodSummary(10L, period, List.of(), List.of(), List.of(), List.of());
            when(teachingQuery.periodSummary(10L, period)).thenReturn(summary);

            assertThatThrownBy(() -> payrollService.finalizePeriod(2026, 9, "key-unresolved", adminUser))
                    .isInstanceOf(BusinessException.class)
                    .extracting("errorCode")
                    .isEqualTo(ErrorCode.PAYROLL_UNRESOLVED_SESSIONS);
        }

        @Test
        @DisplayName("get returns immutable frozen snapshot if month has already been finalized")
        void get_alreadyFinalized_returnsFrozenSnapshot() throws Exception {
            TeachingPeriodSummary summary = new TeachingPeriodSummary(10L, YearMonth.of(2026, 8), List.of(), List.of(), List.of(), List.of());
            String encodedSummary = objectMapper.writeValueAsString(summary);

            PayrollPeriod finalizedPeriod = PayrollPeriod.builder()
                    .id(88L)
                    .year(2026)
                    .month(8)
                    .status(PayrollStatus.FINALIZED)
                    .totalPayroll(new BigDecimal("7000000"))
                    .finalizedBy(1L)
                    .finalizedAt(OffsetDateTime.now())
                    .idempotencyKey("frozen-key")
                    .build();

            PayrollLine line = PayrollLine.builder()
                    .periodId(88L)
                    .tutorId(10L)
                    .tutorName("Thầy Hoàng")
                    .baseSalary(new BigDecimal("5000000"))
                    .sessionRate(new BigDecimal("200000"))
                    .validSessions(10)
                    .sessionPay(new BigDecimal("2000000"))
                    .totalPay(new BigDecimal("7000000"))
                    .reconciliation(encodedSummary)
                    .build();

            when(periodRepository.findByYearAndMonth(2026, 8)).thenReturn(Optional.of(finalizedPeriod));
            when(lineRepository.findByPeriodIdOrderByTutorId(88L)).thenReturn(List.of(line));

            PayrollResponse response = payrollService.get(2026, 8, adminUser);

            assertThat(response.getStatus()).isEqualTo(PayrollStatus.FINALIZED);
            assertThat(response.getTotalPayroll()).isEqualByComparingTo("7000000");
            assertThat(response.getLines()).hasSize(1);
            assertThat(response.getLines().getFirst().getTotalPay()).isEqualByComparingTo("7000000");
            // Verify that active session/profile queries are never consulted for finalized snapshot
            verify(sessionRepository, never()).findBySessionDateBetweenOrderBySessionDateAscStartTimeAscIdAsc(any(), any());
        }

        @Test
        @DisplayName("mine allows tutors to view only their own payroll lines")
        void mine_tutorViewingOwnHistory_success() throws Exception {
            TeachingPeriodSummary summary = new TeachingPeriodSummary(10L, YearMonth.of(2026, 8), List.of(), List.of(), List.of(), List.of());
            String encodedSummary = objectMapper.writeValueAsString(summary);

            PayrollPeriod period = PayrollPeriod.builder()
                    .id(1L)
                    .year(2026)
                    .month(8)
                    .status(PayrollStatus.FINALIZED)
                    .totalPayroll(new BigDecimal("5000000"))
                    .finalizedBy(1L)
                    .finalizedAt(OffsetDateTime.now())
                    .idempotencyKey("k1")
                    .build();

            PayrollLine line = PayrollLine.builder()
                    .id(1L)
                    .periodId(1L)
                    .tutorId(10L)
                    .tutorName("Thầy Hoàng")
                    .baseSalary(new BigDecimal("5000000"))
                    .sessionRate(new BigDecimal("200000"))
                    .validSessions(0)
                    .sessionPay(BigDecimal.ZERO)
                    .totalPay(new BigDecimal("5000000"))
                    .reconciliation(encodedSummary)
                    .build();

            when(lineRepository.findForTutor(eq(10L), eq(2026), eq(8), any(PageRequest.class)))
                    .thenReturn(new PageImpl<>(List.of(line)));
            when(periodRepository.findAllById(List.of(1L))).thenReturn(List.of(period));

            PageResponse<PayrollLineResponse> page = payrollService.mine(2026, 8, 0, 20, tutorUser);

            assertThat(page.getContent()).hasSize(1);
            assertThat(page.getContent().getFirst().getTutorId()).isEqualTo(10L);
            assertThat(page.getContent().getFirst().getTotalPay()).isEqualByComparingTo("5000000");
        }

        @Test
        @DisplayName("mine rejects non-tutor callers with ACCESS_DENIED")
        void mine_nonTutorCaller_throwsAccessDenied() {
            assertThatThrownBy(() -> payrollService.mine(2026, 8, 0, 20, adminUser))
                    .isInstanceOf(BusinessException.class)
                    .extracting("errorCode")
                    .isEqualTo(ErrorCode.ACCESS_DENIED);
        }
    }
}
