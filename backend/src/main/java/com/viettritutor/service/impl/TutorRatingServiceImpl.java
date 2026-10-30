package com.viettritutor.service.impl;

import com.viettritutor.common.exception.BusinessException;
import com.viettritutor.common.exception.ErrorCode;
import com.viettritutor.dto.rating.TutorRatingRequest;
import com.viettritutor.dto.rating.TutorRatingResponse;
import com.viettritutor.dto.rating.TutorRatingSummaryResponse;
import com.viettritutor.entity.TutorRating;
import com.viettritutor.entity.User;
import com.viettritutor.enums.EnrollmentStatus;
import com.viettritutor.repository.EnrollmentRepository;
import com.viettritutor.repository.TutorRatingRepository;
import com.viettritutor.repository.UserRepository;
import com.viettritutor.service.TutorRatingService;

import lombok.RequiredArgsConstructor;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional
public class TutorRatingServiceImpl implements TutorRatingService {

    private static final String ROLE_TUTOR = "ROLE_TUTOR";

    private final TutorRatingRepository tutorRatingRepository;
    private final UserRepository userRepository;
    private final EnrollmentRepository enrollmentRepository;

    @Override
    public TutorRatingResponse createRating(
            Long tutorId,
            String studentEmail,
            TutorRatingRequest request
    ) {
        User student = findUserByEmail(studentEmail);
        User tutor = findTutorById(tutorId);

        if (tutorRatingRepository.existsByStudent_IdAndTutor_Id(student.getId(), tutorId)) {
            throw new BusinessException(ErrorCode.RATING_ALREADY_EXISTS);
        }

        // Only students actually taught by this tutor may rate: an ACTIVE enrollment in a
        // class the tutor is or was assigned to (a replaced tutor still taught the class).
        // Enrollments stay ACTIVE after the class completes, so finished classes count too.
        boolean taught = enrollmentRepository.existsStudentTaughtByTutor(
                student.getId(), tutorId, EnrollmentStatus.ACTIVE);
        if (!taught) {
            throw new BusinessException(ErrorCode.RATING_NOT_ELIGIBLE);
        }

        LocalDateTime now = LocalDateTime.now();

        TutorRating rating = TutorRating.builder()
                .student(student)
                .tutor(tutor)
                .rating(request.rating())
                .comment(request.comment())
                .createdAt(now)
                .updatedAt(now)
                .build();

        try {
            return toResponse(tutorRatingRepository.saveAndFlush(rating));
        } catch (DataIntegrityViolationException ex) {
            // Concurrent duplicate hit uk_tutor_review_student_tutor
            throw new BusinessException(ErrorCode.RATING_ALREADY_EXISTS);
        }
    }

    @Override
    public TutorRatingResponse updateMyRating(
            Long ratingId,
            String studentEmail,
            TutorRatingRequest request
    ) {
        User student = findUserByEmail(studentEmail);
        TutorRating rating = findOwnedRating(ratingId, student);

        rating.setRating(request.rating());
        rating.setComment(request.comment());
        rating.setUpdatedAt(LocalDateTime.now());

        return toResponse(tutorRatingRepository.save(rating));
    }

    @Override
    public void deleteMyRating(Long ratingId, String studentEmail) {
        User student = findUserByEmail(studentEmail);
        tutorRatingRepository.delete(findOwnedRating(ratingId, student));
    }

    @Override
    @Transactional(readOnly = true)
    public List<TutorRatingResponse> getRatingsByTutor(Long tutorId) {
        findTutorById(tutorId);

        return tutorRatingRepository
                .findAllByTutor_IdOrderByCreatedAtDesc(tutorId)
                .stream()
                .map(this::toResponse)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public TutorRatingSummaryResponse getTutorRatingSummary(Long tutorId) {
        findTutorById(tutorId);

        Double average = tutorRatingRepository.findAverageRatingByTutorId(tutorId);
        long total = tutorRatingRepository.countByTutor_Id(tutorId);

        BigDecimal averageRating = average == null
                ? BigDecimal.ZERO
                : BigDecimal.valueOf(average).setScale(2, RoundingMode.HALF_UP);

        return new TutorRatingSummaryResponse(tutorId, averageRating, total);
    }

    @Override
    @Transactional(readOnly = true)
    public TutorRatingResponse getMyRating(Long tutorId, String studentEmail) {
        User student = findUserByEmail(studentEmail);

        TutorRating rating = tutorRatingRepository
                .findByStudent_IdAndTutor_Id(student.getId(), tutorId)
                .orElseThrow(() -> new BusinessException(ErrorCode.RATING_NOT_FOUND));

        return toResponse(rating);
    }

    private User findUserByEmail(String email) {
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new BusinessException(ErrorCode.USER_NOT_FOUND));
    }

    private User findTutorById(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new BusinessException(ErrorCode.USER_NOT_FOUND));
        if (!ROLE_TUTOR.equals(user.getRole())) {
            throw new BusinessException(ErrorCode.USER_NOT_TUTOR);
        }
        return user;
    }

    private TutorRating findOwnedRating(Long ratingId, User student) {
        TutorRating rating = tutorRatingRepository.findById(ratingId)
                .orElseThrow(() -> new BusinessException(ErrorCode.RATING_NOT_FOUND));
        if (!rating.getStudent().getId().equals(student.getId())) {
            throw new BusinessException(ErrorCode.ACCESS_DENIED);
        }
        return rating;
    }

    private TutorRatingResponse toResponse(TutorRating rating) {
        return new TutorRatingResponse(
                rating.getId(),
                rating.getStudent().getId(),
                rating.getTutor().getId(),
                rating.getRating(),
                rating.getComment(),
                rating.getCreatedAt(),
                rating.getUpdatedAt()
        );
    }
}
