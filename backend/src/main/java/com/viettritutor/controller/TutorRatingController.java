package com.viettritutor.controller;

import com.viettritutor.dto.rating.TutorRatingRequest;
import com.viettritutor.dto.rating.TutorRatingResponse;
import com.viettritutor.dto.rating.TutorRatingSummaryResponse;
import com.viettritutor.service.TutorRatingService;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1")
@RequiredArgsConstructor
public class TutorRatingController {

    private final TutorRatingService tutorRatingService;

    @PostMapping("/tutors/{tutorId}/ratings")
    @ResponseStatus(HttpStatus.CREATED)
    public TutorRatingResponse createRating(
            @PathVariable Long tutorId,
            @Valid @RequestBody TutorRatingRequest request,
            Authentication authentication
    ) {
        return tutorRatingService.createRating(
                tutorId,
                authentication.getName(),
                request
        );
    }

    @GetMapping("/tutors/{tutorId}/ratings")
    public List<TutorRatingResponse> getRatings(
            @PathVariable Long tutorId
    ) {
        return tutorRatingService.getRatingsByTutor(tutorId);
    }

    @GetMapping("/tutors/{tutorId}/ratings/summary")
    public TutorRatingSummaryResponse getRatingSummary(
            @PathVariable Long tutorId
    ) {
        return tutorRatingService.getTutorRatingSummary(tutorId);
    }

    @GetMapping("/tutors/{tutorId}/my-rating")
    public TutorRatingResponse getMyRating(
            @PathVariable Long tutorId,
            Authentication authentication
    ) {
        return tutorRatingService.getMyRating(
                tutorId,
                authentication.getName()
        );
    }

    @PutMapping("/ratings/{ratingId}")
    public TutorRatingResponse updateRating(
            @PathVariable Long ratingId,
            @Valid @RequestBody TutorRatingRequest request,
            Authentication authentication
    ) {
        return tutorRatingService.updateMyRating(
                ratingId,
                authentication.getName(),
                request
        );
    }

    @DeleteMapping("/ratings/{ratingId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteRating(
            @PathVariable Long ratingId,
            Authentication authentication
    ) {
        tutorRatingService.deleteMyRating(
                ratingId,
                authentication.getName()
        );
    }
}