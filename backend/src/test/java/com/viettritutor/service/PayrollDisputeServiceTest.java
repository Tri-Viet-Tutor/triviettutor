package com.viettritutor.service;

import com.viettritutor.common.api.PageResponse;
import com.viettritutor.common.exception.BusinessException;
import com.viettritutor.common.exception.ErrorCode;
import com.viettritutor.dto.payroll.PayrollLineResponse;
import com.viettritutor.dto.payroll.PayrollResponse;
import com.viettritutor.entity.PayrollDispute;
import com.viettritutor.entity.PayrollLine;
import com.viettritutor.entity.User;
import com.viettritutor.enums.PayrollStatus;
import com.viettritutor.repository.PayrollDisputeRepository;
import com.viettritutor.repository.PayrollLineRepository;
import com.viettritutor.repository.UserRepository;
import com.viettritutor.notification.event.PayrollDisputeEvent;
import org.springframework.context.ApplicationEventPublisher;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.PageImpl;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import java.math.BigDecimal;
import java.time.*;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class PayrollDisputeServiceTest {
    private static final Clock CLOCK = Clock.fixed(Instant.parse("2026-11-05T03:00:00Z"), ZoneId.of("Asia/Ho_Chi_Minh"));

    @Mock private PayrollDisputeRepository disputes;
    @Mock private PayrollLineRepository lines;
    @Mock private PayrollService payroll;
    @Mock private UserRepository users;
    @Mock private PayrollDisputeMailer mailer;
    @Mock private ApplicationEventPublisher eventPublisher;

    private PayrollDisputeService service;
    private User tutor;

    @BeforeEach
    void setUp() {
        service = new PayrollDisputeService(disputes, lines, payroll, users, mailer, CLOCK);
        org.springframework.test.util.ReflectionTestUtils.setField(service, "eventPublisher", eventPublisher);
        tutor = User.builder().id(10L).fullName("Tutor One").role("ROLE_TUTOR").build();
        TransactionSynchronizationManager.initSynchronization();
    }

    @AfterEach
    void tearDown() {
        TransactionSynchronizationManager.clearSynchronization();
    }

    private static PayrollLine line() {
        return PayrollLine.builder().id(77L).periodId(5L).tutorId(10L).tutorName("Tutor One")
                .totalPay(new BigDecimal("6500000")).build();
    }

    private static PayrollLineResponse slip(long tutorId, int year, int month) {
        return PayrollLineResponse.builder().tutorId(tutorId).tutorName("Tutor " + tutorId).year(year).month(month)
                .status(PayrollStatus.FINALIZED).totalPay(new BigDecimal("6500000")).build();
    }

    private static User admin(long id, String email, boolean enabled, boolean locked) {
        return User.builder().id(id).email(email).role("ROLE_ADMIN").enabled(enabled).locked(locked).build();
    }

    @Test
    @DisplayName("Only tutors can complain about a payslip")
    void dispute_nonTutor_isDenied() {
        User admin = admin(1L, "a@x.vn", true, false);
        assertThatThrownBy(() -> service.dispute(2026, 10, "Thiếu hai buổi dạy ngày 12", admin))
                .isInstanceOf(BusinessException.class)
                .extracting(ex -> ((BusinessException) ex).getErrorCode()).isEqualTo(ErrorCode.ACCESS_DENIED);
        verifyNoInteractions(disputes);
    }

    @Test
    @DisplayName("A month without a finalized payslip for the tutor returns 404")
    void dispute_withoutFinalizedPayslip_isNotFound() {
        when(lines.findForTutor(eq(10L), eq(2026), eq(10), any())).thenReturn(new PageImpl<>(List.of()));
        assertThatThrownBy(() -> service.dispute(2026, 10, "Thiếu hai buổi dạy ngày 12", tutor))
                .isInstanceOf(BusinessException.class)
                .extracting(ex -> ((BusinessException) ex).getErrorCode()).isEqualTo(ErrorCode.PAYROLL_LINE_NOT_FOUND);
    }

    @Test
    @DisplayName("Invalid month is rejected before any lookup")
    void dispute_invalidPeriod_isRejected() {
        assertThatThrownBy(() -> service.dispute(2026, 13, "Thiếu hai buổi dạy ngày 12", tutor))
                .isInstanceOf(BusinessException.class)
                .extracting(ex -> ((BusinessException) ex).getErrorCode()).isEqualTo(ErrorCode.INVALID_PAYROLL_PERIOD);
        verifyNoInteractions(lines);
    }

    @Test
    @DisplayName("A second complaint about the same payslip is rejected")
    void dispute_twice_isConflict() {
        when(lines.findForTutor(eq(10L), eq(2026), eq(10), any())).thenReturn(new PageImpl<>(List.of(line())));
        when(disputes.existsByPayrollLineId(77L)).thenReturn(true);
        assertThatThrownBy(() -> service.dispute(2026, 10, "Thiếu hai buổi dạy ngày 12", tutor))
                .isInstanceOf(BusinessException.class)
                .extracting(ex -> ((BusinessException) ex).getErrorCode()).isEqualTo(ErrorCode.PAYROLL_ALREADY_DISPUTED);
        verify(disputes, never()).saveAndFlush(any());
    }

    @Test
    @DisplayName("A concurrent complaint that wins the unique key is reported as a conflict")
    void dispute_race_isConflict() {
        when(lines.findForTutor(eq(10L), eq(2026), eq(10), any())).thenReturn(new PageImpl<>(List.of(line())));
        when(disputes.saveAndFlush(any())).thenThrow(new DataIntegrityViolationException("uq"));
        assertThatThrownBy(() -> service.dispute(2026, 10, "Thiếu hai buổi dạy ngày 12", tutor))
                .isInstanceOf(BusinessException.class)
                .extracting(ex -> ((BusinessException) ex).getErrorCode()).isEqualTo(ErrorCode.PAYROLL_ALREADY_DISPUTED);
    }

    @Test
    @DisplayName("Complaint is stored, the payslip reads DISPUTED and active admins are emailed only after commit")
    void dispute_success_marksDisputedAndEmailsAfterCommit() {
        when(lines.findForTutor(eq(10L), eq(2026), eq(10), any())).thenReturn(new PageImpl<>(List.of(line())));
        when(disputes.saveAndFlush(any())).thenAnswer(inv -> inv.getArgument(0));
        when(users.findByRoleOrderByIdAsc("ROLE_ADMIN")).thenReturn(List.of(
                admin(1L, "active@x.vn", true, false), admin(2L, "disabled@x.vn", false, false), admin(3L, "locked@x.vn", true, true)));
        when(payroll.mine(2026, 10, 0, 1, tutor)).thenReturn(PageResponse.<PayrollLineResponse>builder()
                .content(List.of(slip(10L, 2026, 10))).page(0).size(1).totalElements(1).totalPages(1).build());

        PayrollLineResponse result = service.dispute(2026, 10, "  Thiếu hai buổi dạy ngày 12  ", tutor);

        ArgumentCaptor<PayrollDispute> saved = ArgumentCaptor.forClass(PayrollDispute.class);
        verify(disputes).saveAndFlush(saved.capture());
        assertThat(saved.getValue().getReason()).isEqualTo("Thiếu hai buổi dạy ngày 12");
        assertThat(saved.getValue().getPayrollLineId()).isEqualTo(77L);
        assertThat(result.getStatus()).isEqualTo(PayrollStatus.DISPUTED);
        assertThat(result.getDisputeReason()).isEqualTo("Thiếu hai buổi dạy ngày 12");
        assertThat(result.getDisputedAt()).isNotNull();

        ArgumentCaptor<PayrollDisputeEvent> eventCaptor = ArgumentCaptor.forClass(PayrollDisputeEvent.class);
        verify(eventPublisher).publishEvent(eventCaptor.capture());
        PayrollDisputeEvent publishedEvent = eventCaptor.getValue();
        assertThat(publishedEvent.tutorId()).isEqualTo(10L);
        assertThat(publishedEvent.year()).isEqualTo(2026);
        assertThat(publishedEvent.month()).isEqualTo(10);
        assertThat(publishedEvent.reason()).isEqualTo("Thiếu hai buổi dạy ngày 12");
        assertThat(publishedEvent.adminEmails()).containsExactly("active@x.vn");
    }

    @Test
    @DisplayName("Admin month view marks only the disputed tutor; drafts are untouched")
    void decorate_period_marksOnlyDisputedLines() {
        PayrollDispute d = PayrollDispute.builder().reason("Sai số buổi").createdAt(OffsetDateTime.now(CLOCK)).build();
        when(disputes.findForPeriod(2026, 10)).thenReturn(List.<Object[]>of(new Object[]{d, 20L}));
        PayrollResponse month = PayrollResponse.builder().year(2026).month(10).status(PayrollStatus.FINALIZED)
                .lines(List.of(slip(10L, 2026, 10), slip(20L, 2026, 10))).build();

        PayrollResponse result = service.decorate(month);

        assertThat(result.getLines()).extracting(PayrollLineResponse::getStatus)
                .containsExactly(PayrollStatus.FINALIZED, PayrollStatus.DISPUTED);
        assertThat(result.getLines().get(1).getDisputeReason()).isEqualTo("Sai số buổi");

        PayrollResponse draft = PayrollResponse.builder().year(2026).month(11).status(PayrollStatus.DRAFT).lines(List.of()).build();
        assertThat(service.decorate(draft)).isSameAs(draft);
    }

    @Test
    @DisplayName("Tutor history marks only the disputed month and keeps paging")
    void decorate_tutorHistory_marksDisputedMonth() {
        PayrollDispute d = PayrollDispute.builder().reason("Sai số buổi").createdAt(OffsetDateTime.now(CLOCK)).build();
        when(disputes.findForTutor(10L)).thenReturn(List.<Object[]>of(new Object[]{d, 2026, 9}));
        PageResponse<PayrollLineResponse> page = PageResponse.<PayrollLineResponse>builder()
                .content(List.of(slip(10L, 2026, 10), slip(10L, 2026, 9))).page(0).size(20).totalElements(2).totalPages(1).build();

        PageResponse<PayrollLineResponse> result = service.decorate(page, tutor);

        assertThat(result.getContent()).extracting(PayrollLineResponse::getStatus)
                .containsExactly(PayrollStatus.FINALIZED, PayrollStatus.DISPUTED);
        assertThat(result.getTotalElements()).isEqualTo(2);
        assertThat(result.getSize()).isEqualTo(20);
    }
}
