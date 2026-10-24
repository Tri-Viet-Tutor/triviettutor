package com.viettritutor.repository;
import com.viettritutor.entity.PayrollMutex;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.*;
import java.util.Optional;
public interface PayrollMutexRepository extends JpaRepository<PayrollMutex,Long> {
    @Modifying @Query(value="insert into payroll_mutex (id) values (1) on conflict do nothing",nativeQuery=true)
    int insertIfAbsent();
    @Lock(LockModeType.PESSIMISTIC_WRITE) @Query("select m from PayrollMutex m where m.id=1")
    Optional<PayrollMutex> lock();
}
