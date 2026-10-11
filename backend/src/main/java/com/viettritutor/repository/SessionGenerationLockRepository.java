package com.viettritutor.repository;

import com.viettritutor.entity.SessionGenerationLock;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

public interface SessionGenerationLockRepository extends JpaRepository<SessionGenerationLock, Long> {

    @Modifying
    @Query(value = """
            INSERT INTO session_generation_locks (class_group_id)
            VALUES (:classGroupId)
            ON CONFLICT DO NOTHING
            """, nativeQuery = true)
    int insertIfAbsent(@Param("classGroupId") Long classGroupId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select lock from SessionGenerationLock lock where lock.classGroupId = :classGroupId")
    Optional<SessionGenerationLock> findForUpdate(@Param("classGroupId") Long classGroupId);
}
