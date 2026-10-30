package com.viettritutor.service.impl;

import com.viettritutor.dto.rating.TutorRatingRequest;
import com.viettritutor.dto.rating.TutorRatingResponse;
import com.viettritutor.dto.rating.TutorRatingSummaryResponse;
import com.viettritutor.entity.TutorRating;
import com.viettritutor.entity.User;
import com.viettritutor.repository.TutorRatingRepository;
import com.viettritutor.repository.UserRepository;
import com.viettritutor.service.TutorRatingService;

import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional
public class TutorRatingServiceImpl implements TutorRatingService {

    private final TutorRatingRepository tutorRatingRepository;
    private final UserRepository userRepository;

    @Override
    public TutorRatingResponse createRating(
            Long tutorId,
            String studentEmail,
            TutorRatingRequest request
    ) {
        User student = findUserByEmail(studentEmail);
        User tutor = findUserById(tutorId);

        if (student.getId().equals(tutor.getId())) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "You cannot rate yourself"
            );
        }

        if (tutorRatingRepository
                .existsByStudent_IdAndTutor_Id(student.getId(), tutorId)) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "You have already rated this tutor"
            );
        }

        // TODO: Verify that the student has completed
        // at least one session with this tutor.

        LocalDateTime now = LocalDateTime.now();

        TutorRating rating = TutorRating.builder()
                .student(student)
                .tutor(tutor)
                .rating(request.rating())
                .comment(request.comment())
                .createdAt(now)
                .updatedAt(now)
                .build();

        return toResponse(tutorRatingRepository.save(rating));
    }

    @Override
    public TutorRatingResponse updateMyRating(
            Long ratingId,
            String studentEmail,
            TutorRatingRequest request
    ) {
        User student = findUserByEmail(studentEmail);
        TutorRating rating = findRatingById(ratingId);

        if (!rating.getStudent().getId().equals(student.getId())) {
            throw new ResponseStatusException(
                    HttpStatus.FORBIDDEN,
                    "You can only update your own rating"
            );
        }

        rating.setRating(request.rating());
        rating.setComment(request.comment());
        rating.setUpdatedAt(LocalDateTime.now());

        return toResponse(tutorRatingRepository.save(rating));
    }

    @Override
    public void deleteMyRating(Long ratingId, String studentEmail) {
        User student = findUserByEmail(studentEmail);
        TutorRating rating = findRatingById(ratingId);

        if (!rating.getStudent().getId().equals(student.getId())) {
            throw new ResponseStatusException(
                    HttpStatus.FORBIDDEN,
                    "You can only delete your own rating"
            );
        }

        tutorRatingRepository.delete(rating);
    }

    @Override
    @Transactional(readOnly = true)
    public List<TutorRatingResponse> getRatingsByTutor(Long tutorId) {
        findUserById(tutorId);

        return tutorRatingRepository
                .findAllByTutor_IdOrderByCreatedAtDesc(tutorId)
                .stream()
                .map(this::toResponse)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public TutorRatingSummaryResponse getTutorRatingSummary(Long tutorId) {
        findUserById(tutorId);

        Double average = tutorRatingRepository
                .findAverageRatingByTutorId(tutorId);

        long total = tutorRatingRepository.countByTutor_Id(tutorId);

        BigDecimal averageRating = average == null
                ? BigDecimal.ZERO
                : BigDecimal.valueOf(average).setScale(2, java.math.RoundingMode.HALF_UP);

        return new TutorRatingSummaryResponse(
                tutorId,
                averageRating,
                total
        );
    }

    @Override
    @Transactional(readOnly = true)
    public TutorRatingResponse getMyRating(
            Long tutorId,
            String studentEmail
    ) {
        User student = findUserByEmail(studentEmail);

        TutorRating rating = tutorRatingRepository
                .findByStudent_IdAndTutor_Id(student.getId(), tutorId)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "Rating not found"
                ));

        return toResponse(rating);
    }

    private User findUserByEmail(String email) {
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "User not found"
                ));
    }

    private User findUserById(Long userId) {
        return userRepository.findById(userId)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "User not found"
                ));
    }

    private TutorRating findRatingById(Long ratingId) {
        return tutorRatingRepository.findById(ratingId)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "Rating not found"
                ));
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