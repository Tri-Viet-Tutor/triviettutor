package com.viettritutor.service;

import com.viettritutor.dto.rating.TutorRatingRequest;
import com.viettritutor.dto.rating.TutorRatingResponse;
import com.viettritutor.dto.rating.TutorRatingSummaryResponse;

import java.util.List;

public interface TutorRatingService {

    TutorRatingResponse createRating(
            Long tutorId,
            String studentEmail,
            TutorRatingRequest request
    );

    TutorRatingResponse updateMyRating(
            Long ratingId,
            String studentEmail,
            TutorRatingRequest request
    );

    void deleteMyRating(
            Long ratingId,
            String studentEmail
    );

    List<TutorRatingResponse> getRatingsByTutor(
            Long tutorId
    );

    TutorRatingSummaryResponse getTutorRatingSummary(
            Long tutorId
    );

    TutorRatingResponse getMyRating(
            Long tutorId,
            String studentEmail
    );

    TutorRatingResponse getMyRating(
            Long tutorId,
            Long classGroupId,
            String studentEmail
    );
}