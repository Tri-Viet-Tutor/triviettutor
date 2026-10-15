package com.viettritutor.repository;
import com.viettritutor.entity.PayrollPeriod;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;
public interface PayrollPeriodRepository extends JpaRepository<PayrollPeriod,Long> {
    Optional<PayrollPeriod> findByYearAndMonth(int year,int month);
    Optional<PayrollPeriod> findByIdempotencyKey(String key);
    boolean existsByYearAndMonth(int year,int month);
}
