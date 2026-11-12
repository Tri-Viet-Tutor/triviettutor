package com.viettritutor.service.impl;
import com.viettritutor.service.*;
import com.viettritutor.service.TutorBoardService;

import com.viettritutor.common.exception.BusinessException;
import com.viettritutor.common.exception.ErrorCode;
import com.viettritutor.dto.assignment.AvailabilityResponse;
import com.viettritutor.dto.assignment.TutorBoardResponse;
import com.viettritutor.entity.Session;
import com.viettritutor.entity.TutorAvailability;
import com.viettritutor.entity.User;
import com.viettritutor.enums.SessionStatus;
import com.viettritutor.repository.SessionRepository;
import com.viettritutor.repository.TutorAvailabilityRepository;
import com.viettritutor.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/** Declared availability and teaching sessions of every tutor within a date range (max 31 days). */
@Service
@RequiredArgsConstructor
public class TutorBoardServiceImpl implements TutorBoardService {
    private static final long MAX_DAYS = 31;

    private final UserRepository users;
    private final TutorAvailabilityRepository availabilityRepository;
    private final SessionRepository sessions;

    @Override
    @Transactional(readOnly = true)
    public List<TutorBoardResponse> board(LocalDate from, LocalDate to) {
        if (from.isAfter(to) || ChronoUnit.DAYS.between(from, to) >= MAX_DAYS) {
            throw new BusinessException(ErrorCode.INVALID_DATE_RANGE);
        }
        List<User> tutors = users.findByRoleOrderByIdAsc("ROLE_TUTOR");
        if (tutors.isEmpty()) return List.of();
        Map<Long, List<TutorAvailability>> availability = availabilityRepository
                .findByTutorIdIn(tutors.stream().map(User::getId).toList()).stream()
                .filter(slot -> !slot.getAvailableDate().isBefore(from) && !slot.getAvailableDate().isAfter(to))
                .collect(Collectors.groupingBy(TutorAvailability::getTutorId));
        Map<Long, List<Session>> teaching = sessions.findBySessionDateBetweenOrderBySessionDateAscStartTimeAscIdAsc(from, to).stream()
                .filter(session -> session.getStatus() != SessionStatus.CANCELLED)
                .filter(session -> teacher(session) != null)
                .collect(Collectors.groupingBy(TutorBoardServiceImpl::teacher));
        return tutors.stream().map(tutor -> new TutorBoardResponse(tutor.getId(), tutor.getFullName(),
                availability.getOrDefault(tutor.getId(), List.of()).stream()
                        .sorted(Comparator.comparing(TutorAvailability::getAvailableDate).thenComparing(TutorAvailability::getStartTime))
                        .map(AvailabilityResponse::from).toList(),
                teaching.getOrDefault(tutor.getId(), List.of()).stream()
                        .map(s -> new TutorBoardResponse.TeachingSlot(s.getId(), s.getClassGroupId(), s.getSessionDate(),
                                s.getStartTime(), s.getEndTime()))
                        .toList())).toList();
    }

    private static Long teacher(Session session) {
        return session.getActualTutorId() != null ? session.getActualTutorId() : session.getScheduledTutorId();
    }
}
