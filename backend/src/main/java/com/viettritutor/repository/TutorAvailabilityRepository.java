package com.viettritutor.repository;

import com.viettritutor.entity.TutorAvailability;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Collection;
import java.util.List;

public interface TutorAvailabilityRepository extends JpaRepository<TutorAvailability, Long> {
    List<TutorAvailability> findByTutorIdOrderByAvailableDateAscStartTimeAsc(Long tutorId);

    List<TutorAvailability> findByTutorIdIn(Collection<Long> tutorIds);

    void deleteByTutorId(Long tutorId);
}
