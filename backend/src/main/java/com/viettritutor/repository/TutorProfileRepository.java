package com.viettritutor.repository;

import com.viettritutor.entity.TutorProfile;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;
import jakarta.persistence.LockModeType;
import java.time.LocalDateTime;
import java.util.List;

public interface TutorProfileRepository extends JpaRepository<TutorProfile, Long> {
    @Query("""
        select p from TutorProfile p where p.id in
        (select u.id from User u where u.role='ROLE_TUTOR' and u.createdAt < :end)
        order by p.id
        """)
    List<TutorProfile> findPayrollEligible(@Param("end") LocalDateTime end);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("""
        select p from TutorProfile p where p.id in
        (select u.id from User u where u.role='ROLE_TUTOR' and u.createdAt < :end)
        order by p.id
        """)
    List<TutorProfile> findPayrollEligibleForUpdate(@Param("end") LocalDateTime end);
}
