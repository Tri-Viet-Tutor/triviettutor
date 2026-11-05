package com.viettritutor.service;

import com.viettritutor.common.exception.BusinessException;
import com.viettritutor.common.exception.ErrorCode;
import com.viettritutor.dto.assignment.AvailabilityRequest;
import com.viettritutor.dto.assignment.AvailabilityResponse;
import com.viettritutor.entity.TutorAvailability;
import com.viettritutor.entity.User;
import com.viettritutor.repository.TutorAvailabilityRepository;
import com.viettritutor.repository.UserRepository;
import com.viettritutor.service.impl.TutorAvailabilityServiceImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.*;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.assertj.core.api.Assertions.tuple;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class TutorAvailabilityServiceTest {

    private static final Clock FIXED_CLOCK = Clock.fixed(
            Instant.parse("2026-10-25T10:00:00Z"), ZoneId.of("Asia/Ho_Chi_Minh"));

    @Mock
    private TutorAvailabilityRepository availabilityRepository;

    @Mock
    private UserRepository userRepository;

    private TutorAvailabilityService availabilityService;

    private User tutor;
    private User student;

    @BeforeEach
    void setUp() {
        availabilityService = new TutorAvailabilityServiceImpl(availabilityRepository, userRepository, FIXED_CLOCK);
        tutor = User.builder().id(10L).fullName("Tutor One").role("ROLE_TUTOR").build();
        student = User.builder().id(30L).fullName("Student One").role("ROLE_STUDENT").build();
    }

    private static AvailabilityRequest.Slot slot(String date, String start, String end) {
        return new AvailabilityRequest.Slot(LocalDate.parse(date), LocalTime.parse(start), LocalTime.parse(end));
    }

    private static TutorAvailability saved(String date, String start, String end) {
        return TutorAvailability.builder().tutorId(10L).availableDate(LocalDate.parse(date))
                .startTime(LocalTime.parse(start)).endTime(LocalTime.parse(end)).build();
    }

    private void givenSaved(TutorAvailability... slots) {
        when(userRepository.findForUpdate(10L)).thenReturn(Optional.of(tutor));
        when(availabilityRepository.findByTutorIdOrderByAvailableDateAscStartTimeAsc(10L)).thenReturn(List.of(slots));
    }

    @Test
    @DisplayName("Replace saves slots sorted by date and start time")
    void replace_whenValid_savesSortedSlots() {
        givenSaved();
        when(availabilityRepository.saveAll(anyList())).thenAnswer(invocation -> invocation.getArgument(0));

        List<AvailabilityResponse> result = availabilityService.replaceAvailability(tutor, new AvailabilityRequest(List.of(
                slot("2026-11-04", "17:00", "21:00"),
                slot("2026-11-02", "18:30", "21:00"),
                slot("2026-11-02", "17:00", "18:30"))));

        assertThat(result).extracting(AvailabilityResponse::availableDate, AvailabilityResponse::startTime).containsExactly(
                tuple(LocalDate.of(2026, 11, 2), LocalTime.of(17, 0)),
                tuple(LocalDate.of(2026, 11, 2), LocalTime.of(18, 30)),
                tuple(LocalDate.of(2026, 11, 4), LocalTime.of(17, 0)));
        verify(availabilityRepository).deleteByTutorId(10L);
    }

    @Test
    @DisplayName("Overlapping slots on the same date are rejected and nothing is deleted")
    void replace_whenSlotsOverlap_rejects() {
        givenSaved();

        assertThatThrownBy(() -> availabilityService.replaceAvailability(tutor, new AvailabilityRequest(List.of(
                slot("2026-11-02", "17:00", "19:00"),
                slot("2026-11-02", "18:00", "20:00")))))
                .isInstanceOf(BusinessException.class)
                .extracting(ex -> ((BusinessException) ex).getErrorCode()).isEqualTo(ErrorCode.INVALID_AVAILABILITY);

        verify(availabilityRepository, never()).deleteByTutorId(any());
    }

    @Test
    @DisplayName("A slot whose start time is not before its end time is rejected")
    void replace_whenStartNotBeforeEnd_rejects() {
        givenSaved();

        assertThatThrownBy(() -> availabilityService.replaceAvailability(tutor, new AvailabilityRequest(List.of(
                slot("2026-11-02", "19:00", "19:00")))))
                .isInstanceOf(BusinessException.class)
                .extracting(ex -> ((BusinessException) ex).getErrorCode()).isEqualTo(ErrorCode.INVALID_AVAILABILITY);
    }

    @Test
    @DisplayName("A past slot that was not saved before is dropped silently; the rest of the save goes through")
    void replace_whenNewSlotInPast_dropsIt() {
        givenSaved();
        when(availabilityRepository.saveAll(anyList())).thenAnswer(invocation -> invocation.getArgument(0));

        // 24/10 is yesterday in Vietnam (e.g. added for "today" and saved after midnight)
        List<AvailabilityResponse> result = availabilityService.replaceAvailability(tutor, new AvailabilityRequest(List.of(
                slot("2026-10-24", "08:00", "10:00"),
                slot("2026-11-02", "18:00", "20:00"))));

        assertThat(result).extracting(AvailabilityResponse::availableDate).containsExactly(LocalDate.of(2026, 11, 2));
        verify(availabilityRepository).deleteByTutorId(10L);
    }

    @Test
    @DisplayName("A dropped past slot is not checked for overlap or bad hours, so it cannot block the save")
    void replace_whenDroppedPastSlotIsInvalid_stillSaves() {
        givenSaved();
        when(availabilityRepository.saveAll(anyList())).thenAnswer(invocation -> invocation.getArgument(0));

        List<AvailabilityResponse> result = availabilityService.replaceAvailability(tutor, new AvailabilityRequest(List.of(
                slot("2026-10-24", "08:00", "10:00"),
                slot("2026-10-24", "09:00", "11:00"),
                slot("2026-10-23", "12:00", "12:00"))));

        assertThat(result).isEmpty();
    }

    @Test
    @DisplayName("Past slots that were already saved can be re-sent unchanged; today is allowed")
    void replace_whenPastSlotAlreadySaved_keepsIt() {
        givenSaved(saved("2026-10-20", "18:00", "20:00"));
        when(availabilityRepository.saveAll(anyList())).thenAnswer(invocation -> invocation.getArgument(0));

        List<AvailabilityResponse> result = availabilityService.replaceAvailability(tutor, new AvailabilityRequest(List.of(
                slot("2026-10-20", "18:00", "20:00"),
                slot("2026-10-25", "18:00", "20:00"))));

        assertThat(result).hasSize(2);
    }

    @Test
    @DisplayName("Changing the hours of a past slot counts as a new past slot and is dropped, never added")
    void replace_whenPastSlotChanged_dropsIt() {
        givenSaved(saved("2026-10-20", "18:00", "20:00"));
        when(availabilityRepository.saveAll(anyList())).thenAnswer(invocation -> invocation.getArgument(0));

        List<AvailabilityResponse> result = availabilityService.replaceAvailability(tutor, new AvailabilityRequest(List.of(
                slot("2026-10-20", "18:00", "21:00"),
                slot("2026-10-25", "18:00", "20:00"))));

        assertThat(result).extracting(AvailabilityResponse::availableDate).containsExactly(LocalDate.of(2026, 10, 25));
    }

    @Test
    @DisplayName("Only tutors can read or replace availability")
    void nonTutor_isDenied() {
        when(userRepository.findForUpdate(30L)).thenReturn(Optional.of(student));

        assertThatThrownBy(() -> availabilityService.getAvailability(student))
                .isInstanceOf(BusinessException.class)
                .extracting(ex -> ((BusinessException) ex).getErrorCode()).isEqualTo(ErrorCode.ACCESS_DENIED);
        assertThatThrownBy(() -> availabilityService.replaceAvailability(student, new AvailabilityRequest(List.of())))
                .isInstanceOf(BusinessException.class)
                .extracting(ex -> ((BusinessException) ex).getErrorCode()).isEqualTo(ErrorCode.ACCESS_DENIED);
    }

    @Test
    @DisplayName("Overlap is found whatever order the slots are sent in, including a slot inside another")
    void replace_whenOverlapSentOutOfOrder_rejects() {
        givenSaved();

        assertThatThrownBy(() -> availabilityService.replaceAvailability(tutor, new AvailabilityRequest(List.of(
                slot("2026-11-02", "13:00", "14:00"),
                slot("2026-11-03", "08:00", "12:00"),
                slot("2026-11-02", "11:30", "12:30"),
                slot("2026-11-02", "08:00", "10:00"),
                slot("2026-11-02", "12:00", "12:15")))))
                .isInstanceOf(BusinessException.class)
                .extracting(ex -> ((BusinessException) ex).getErrorCode()).isEqualTo(ErrorCode.INVALID_AVAILABILITY);

        verify(availabilityRepository, never()).deleteByTutorId(any());
        verify(availabilityRepository, never()).saveAll(anyList());
    }

    @Test
    @DisplayName("The two evening slots 18:00-20:00 and 19:30-21:30 overlap by 30 minutes and are rejected")
    void replace_whenEveningSlotsOverlap_rejects() {
        givenSaved();

        assertThatThrownBy(() -> availabilityService.replaceAvailability(tutor, new AvailabilityRequest(List.of(
                slot("2026-11-02", "19:30", "21:30"),
                slot("2026-11-02", "18:00", "20:00")))))
                .isInstanceOf(BusinessException.class)
                .extracting(ex -> ((BusinessException) ex).getErrorCode()).isEqualTo(ErrorCode.INVALID_AVAILABILITY);
    }

    @Test
    @DisplayName("An exact duplicate slot is rejected as an overlap")
    void replace_whenDuplicateSlot_rejects() {
        givenSaved();

        assertThatThrownBy(() -> availabilityService.replaceAvailability(tutor, new AvailabilityRequest(List.of(
                slot("2026-11-02", "18:00", "20:00"),
                slot("2026-11-02", "18:00", "20:00")))))
                .isInstanceOf(BusinessException.class)
                .extracting(ex -> ((BusinessException) ex).getErrorCode()).isEqualTo(ErrorCode.INVALID_AVAILABILITY);
    }

    @Test
    @DisplayName("Back-to-back slots and the same hours on different dates are not overlaps")
    void replace_whenSlotsTouchOrDifferentDates_saves() {
        givenSaved();
        when(availabilityRepository.saveAll(anyList())).thenAnswer(invocation -> invocation.getArgument(0));

        List<AvailabilityResponse> result = availabilityService.replaceAvailability(tutor, new AvailabilityRequest(List.of(
                slot("2026-11-02", "08:00", "10:00"),
                slot("2026-11-02", "10:00", "12:00"),
                slot("2026-11-03", "08:00", "10:00"))));

        assertThat(result).hasSize(3);
        verify(availabilityRepository).deleteByTutorId(10L);
    }

    @Test
    @DisplayName("An empty list clears the tutor's availability")
    void replace_whenEmpty_clearsAll() {
        givenSaved(saved("2026-11-02", "18:00", "20:00"));
        when(availabilityRepository.saveAll(anyList())).thenAnswer(invocation -> invocation.getArgument(0));

        assertThat(availabilityService.replaceAvailability(tutor, new AvailabilityRequest(List.of()))).isEmpty();
        verify(availabilityRepository).deleteByTutorId(10L);
    }
}
