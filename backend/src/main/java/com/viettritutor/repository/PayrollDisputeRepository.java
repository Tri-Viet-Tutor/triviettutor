package com.viettritutor.repository;

import com.viettritutor.entity.PayrollDispute;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface PayrollDisputeRepository extends JpaRepository<PayrollDispute,Long> {
    boolean existsByPayrollLineId(Long payrollLineId);

    /** Disputes of one finalized month, as [dispute, payslip tutor id]. */
    @Query("""
        select d,l.tutorId from PayrollDispute d join PayrollLine l on l.id=d.payrollLineId
        join PayrollPeriod p on p.id=l.periodId where p.year=:year and p.month=:month
        """)
    List<Object[]> findForPeriod(@Param("year") int year,@Param("month") int month);

    /** A tutor's disputes, as [dispute, year, month]. */
    @Query("""
        select d,p.year,p.month from PayrollDispute d join PayrollLine l on l.id=d.payrollLineId
        join PayrollPeriod p on p.id=l.periodId where d.tutorId=:tutorId
        """)
    List<Object[]> findForTutor(@Param("tutorId") Long tutorId);
}
