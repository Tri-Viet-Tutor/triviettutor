package com.viettritutor.service.impl;

import com.viettritutor.common.exception.BusinessException;
import com.viettritutor.common.exception.ErrorCode;
import com.viettritutor.dto.assignment.AvailabilityRequest;
import com.viettritutor.dto.assignment.AvailabilityResponse;
import com.viettritutor.entity.TutorAvailability;
import com.viettritutor.entity.User;
import com.viettritutor.repository.TutorAvailabilityRepository;
import com.viettritutor.repository.UserRepository;
import com.viettritutor.service.TimeOverlap;
import com.viettritutor.service.TutorAvailabilityService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.LocalDate;
import java.util.Comparator;
import java.util.List;

@Service
@RequiredArgsConstructor
public class TutorAvailabilityServiceImpl implements TutorAvailabilityService {
    private final TutorAvailabilityRepository availabilityRepository;
    private final UserRepository userRepository;
    private final Clock clock;

    @Override
    @Transactional(readOnly = true)
    public List<AvailabilityResponse> getAvailability(User tutor) {
        requireTutor(tutor);
        return availabilityRepository.findByTutorIdOrderByAvailableDateAscStartTimeAsc(tutor.getId())
                .stream().map(AvailabilityResponse::from).toList();
    }

    @Override
    @Transactional
    public List<AvailabilityResponse> replaceAvailability(User currentUser, AvailabilityRequest request) {
        User tutor = userRepository.findForUpdate(currentUser.getId())
                .orElseThrow(() -> new BusinessException(ErrorCode.USER_NOT_FOUND));
        requireTutor(tutor);
        List<AvailabilityRequest.Slot> slots = request.slots().stream()
                .sorted(Comparator.comparing(AvailabilityRequest.Slot::availableDate)
                        .thenComparing(AvailabilityRequest.Slot::startTime)).toList();
        LocalDate today = LocalDate.now(clock);
        // Past slots may be re-sent as already saved, but never added.
        List<TutorAvailability> saved = availabilityRepository.findByTutorIdOrderByAvailableDateAscStartTimeAsc(tutor.getId());
        for (int index = 0; index < slots.size(); index++) {
            var slot = slots.get(index);
            if (!slot.startTime().isBefore(slot.endTime())) {
                throw new BusinessException(ErrorCode.INVALID_AVAILABILITY, "Availability startTime must precede endTime");
            }
            if (slot.availableDate().isBefore(today) && saved.stream().noneMatch(existing ->
                    existing.getAvailableDate().equals(slot.availableDate())
                            && existing.getStartTime().equals(slot.startTime())
                            && existing.getEndTime().equals(slot.endTime()))) {
                throw new BusinessException(ErrorCode.INVALID_AVAILABILITY, "Availability date must not be in the past");
            }
            if (index > 0) {
                var previous = slots.get(index - 1);
                if (previous.availableDate().equals(slot.availableDate())
                        && TimeOverlap.isOverlapping(previous.startTime(), previous.endTime(),
                        slot.startTime(), slot.endTime())) {
                    throw new BusinessException(ErrorCode.INVALID_AVAILABILITY, "Availability slots must not overlap");
                }
            }
        }
        availabilityRepository.deleteByTutorId(tutor.getId());
        availabilityRepository.flush();
        return availabilityRepository.saveAll(slots.stream().map(slot -> TutorAvailability.builder()
                        .tutorId(tutor.getId()).availableDate(slot.availableDate())
                        .startTime(slot.startTime()).endTime(slot.endTime()).build()).toList())
                .stream().map(AvailabilityResponse::from).toList();
    }

    private void requireTutor(User user) {
        if (!"ROLE_TUTOR".equals(user.getRole())) {
            throw new BusinessException(ErrorCode.ACCESS_DENIED);
        }
    }
}
