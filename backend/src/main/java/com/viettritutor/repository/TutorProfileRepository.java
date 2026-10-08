package com.viettritutor.repository;

import com.viettritutor.entity.TutorProfile;
import org.springframework.data.jpa.repository.JpaRepository;

public interface TutorProfileRepository extends JpaRepository<TutorProfile, Long> {
}
