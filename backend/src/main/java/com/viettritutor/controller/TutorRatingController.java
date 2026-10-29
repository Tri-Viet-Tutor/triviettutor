package com.viettritutor.controller;

import com.viettritutor.common.api.ApiResponse;
import com.viettritutor.dto.rating.TutorRatingRequest;
import com.viettritutor.dto.rating.TutorRatingResponse;
import com.viettritutor.dto.rating.TutorRatingSummaryResponse;
import com.viettritutor.service.TutorRatingService;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * Tutor ratings: students taught by a tutor rate them; any signed-in user can read
 * a tutor's ratings and summary.
 */
@RestController
@RequestMapping("/api/v1")
@RequiredArgsConstructor
@Tag(name = "Tutor ratings", description = "Student ratings of tutors")
public class TutorRatingController {

    private final TutorRatingService tutorRatingService;

    @PostMapping("/tutors/{tutorId}/ratings")
    @PreAuthorize("hasRole('STUDENT')")
    @Operation(summary = "Rate a tutor",
            description = "Student only. Requires an active enrollment in a class the tutor is assigned to; one rating per tutor.")
    public ResponseEntity<ApiResponse<TutorRatingResponse>> createRating(
            @PathVariable Long tutorId,
            @Valid @RequestBody TutorRatingRequest request,
            Authentication authentication
    ) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok(tutorRatingService.createRating(
                        tutorId, authentication.getName(), request)));
    }

    @GetMapping("/tutors/{tutorId}/ratings")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "List a tutor's ratings, newest first")
    public ApiResponse<List<TutorRatingResponse>> getRatings(@PathVariable Long tutorId) {
        return ApiResponse.ok(tutorRatingService.getRatingsByTutor(tutorId));
    }

    @GetMapping("/tutors/{tutorId}/ratings/summary")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Average rating and count for a tutor")
    public ApiResponse<TutorRatingSummaryResponse> getRatingSummary(@PathVariable Long tutorId) {
        return ApiResponse.ok(tutorRatingService.getTutorRatingSummary(tutorId));
    }

    @GetMapping("/tutors/{tutorId}/my-rating")
    @PreAuthorize("hasRole('STUDENT')")
    @Operation(summary = "My rating of a tutor")
    public ApiResponse<TutorRatingResponse> getMyRating(
            @PathVariable Long tutorId,
            Authentication authentication
    ) {
        return ApiResponse.ok(tutorRatingService.getMyRating(tutorId, authentication.getName()));
    }

    @PutMapping("/ratings/{ratingId}")
    @PreAuthorize("hasRole('STUDENT')")
    @Operation(summary = "Update my rating")
    public ApiResponse<TutorRatingResponse> updateRating(
            @PathVariable Long ratingId,
            @Valid @RequestBody TutorRatingRequest request,
            Authentication authentication
    ) {
        return ApiResponse.ok(tutorRatingService.updateMyRating(
                ratingId, authentication.getName(), request));
    }

    @DeleteMapping("/ratings/{ratingId}")
    @PreAuthorize("hasRole('STUDENT')")
    @Operation(summary = "Delete my rating")
    public ApiResponse<Void> deleteRating(
            @PathVariable Long ratingId,
            Authentication authentication
    ) {
        tutorRatingService.deleteMyRating(ratingId, authentication.getName());
        return ApiResponse.ok();
    }
}
