package com.viettritutor.repository;

import com.viettritutor.entity.LearningFile;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface LearningFileRepository extends JpaRepository<LearningFile, Long> {
    Optional<LearningFile> findByFileKey(UUID fileKey);
}
