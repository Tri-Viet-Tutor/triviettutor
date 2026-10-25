package com.viettritutor.repository;

import com.viettritutor.entity.ClassGroup;
import com.viettritutor.enums.ClassStatus;
import com.viettritutor.enums.ClassType;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface ClassGroupRepository extends JpaRepository<ClassGroup, Long>, JpaSpecificationExecutor<ClassGroup> {
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select c from ClassGroup c where c.id = :id")
    Optional<ClassGroup> findForUpdate(@Param("id") Long id);

    List<ClassGroup> findByStatusAndClassType(ClassStatus status, ClassType classType);
}
