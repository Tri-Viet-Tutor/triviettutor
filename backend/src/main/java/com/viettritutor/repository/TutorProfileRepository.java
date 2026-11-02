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
     * Disabled tutors: the users table has no disabled-at timestamp (and no migration was added for one), so the
     * month an account was disabled is unknown. To avoid dropping pay a tutor earned before being disabled, callers
     * pass includeDisabled=true for past and current periods; disabled tutors are excluded (no base salary) only
     * for periods that start after the current month. A disabled tutor who actually taught a non-cancelled lesson
     * in the period is always listed so the lesson is paid and does not block finalization.
     * Finalized periods are served from their snapshot and never re-run this query.
     */
    String PAYROLL_ELIGIBLE = """
        select p from TutorProfile p where p.id in
        (select u.id from User u where u.role='ROLE_TUTOR' and u.createdAt < :end
            and (u.enabled = true or :includeDisabled = true or exists (select s.id from Session s
                where s.sessionDate between :from and :to
                and s.status <> com.viettritutor.enums.SessionStatus.CANCELLED
                and coalesce(s.actualTutorId, s.scheduledTutorId) = u.id)))
        order by p.id
        """;

    @Query(PAYROLL_ELIGIBLE)
    List<TutorProfile> findPayrollEligible(@Param("end") LocalDateTime end,
                                           @Param("from") LocalDate from, @Param("to") LocalDate to,
                                           @Param("includeDisabled") boolean includeDisabled);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query(PAYROLL_ELIGIBLE)
    List<TutorProfile> findPayrollEligibleForUpdate(@Param("end") LocalDateTime end,
                                                    @Param("from") LocalDate from, @Param("to") LocalDate to,
                                                    @Param("includeDisabled") boolean includeDisabled);
}
