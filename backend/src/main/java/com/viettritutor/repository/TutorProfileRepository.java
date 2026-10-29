package com.viettritutor.repository;

import com.viettritutor.entity.TutorProfile;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;
import jakarta.persistence.LockModeType;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

public interface TutorProfileRepository extends JpaRepository<TutorProfile, Long> {
    /*
     * Payroll draws base salary only for enabled tutors. A disabled tutor is still listed when they
     * actually taught a non-cancelled lesson in the period, so their lessons are paid and do not block finalization.
     */
    String PAYROLL_ELIGIBLE = """
        select p from TutorProfile p where p.id in
        (select u.id from User u where u.role='ROLE_TUTOR' and u.createdAt < :end
            and (u.enabled = true or exists (select s.id from Session s
                where s.sessionDate between :from and :to
                and s.status <> com.viettritutor.enums.SessionStatus.CANCELLED
                and coalesce(s.actualTutorId, s.scheduledTutorId) = u.id)))
        order by p.id
        """;

    @Query(PAYROLL_ELIGIBLE)
    List<TutorProfile> findPayrollEligible(@Param("end") LocalDateTime end,
                                           @Param("from") LocalDate from, @Param("to") LocalDate to);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query(PAYROLL_ELIGIBLE)
    List<TutorProfile> findPayrollEligibleForUpdate(@Param("end") LocalDateTime end,
                                                    @Param("from") LocalDate from, @Param("to") LocalDate to);
}
