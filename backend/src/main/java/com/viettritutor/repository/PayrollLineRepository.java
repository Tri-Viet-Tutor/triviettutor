package com.viettritutor.repository;
import com.viettritutor.entity.PayrollLine;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;
import org.springframework.data.domain.*;
import java.util.List;
public interface PayrollLineRepository extends JpaRepository<PayrollLine,Long> {
    List<PayrollLine> findByPeriodIdOrderByTutorId(Long periodId);
    @Query("""
        select l from PayrollLine l join PayrollPeriod p on p.id=l.periodId
        where l.tutorId=:tutorId and p.status=com.viettritutor.enums.PayrollStatus.FINALIZED
        and (:year is null or p.year=:year) and (:month is null or p.month=:month)
        order by p.year desc,p.month desc,l.id desc
        """)
    Page<PayrollLine> findForTutor(@Param("tutorId") Long tutorId,@Param("year") Integer year,
            @Param("month") Integer month,Pageable pageable);
}
