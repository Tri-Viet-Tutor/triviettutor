package com.viettritutor.repository;

import com.viettritutor.entity.TutorRating;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface TutorRatingRepository
        extends JpaRepository<TutorRating, Long> {

    boolean existsByStudent_IdAndTutor_Id(
            Long studentId,
            Long tutorId
    );

    Optional<TutorRating> findByStudent_IdAndTutor_Id(
            Long studentId,
            Long tutorId
    );

    List<TutorRating> findAllByTutor_IdOrderByCreatedAtDesc(
            Long tutorId
    );

    @Query("""
        SELECT AVG(r.rating)
        FROM TutorRating r
        WHERE r.tutor.id = :tutorId
        """)
    Double findAverageRatingByTutorId(
            @Param("tutorId") Long tutorId
    );

    long countByTutor_Id(Long tutorId);
}
