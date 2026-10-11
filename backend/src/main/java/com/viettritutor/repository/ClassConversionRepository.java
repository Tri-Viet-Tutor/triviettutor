package com.viettritutor.repository;
import com.viettritutor.entity.ClassConversion;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;
public interface ClassConversionRepository extends JpaRepository<ClassConversion, Long> {
    Optional<ClassConversion> findByClassGroupId(Long classGroupId);
}