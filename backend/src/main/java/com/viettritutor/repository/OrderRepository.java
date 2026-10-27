package com.viettritutor.repository;
import com.viettritutor.entity.PurchaseOrder;
import org.springframework.data.jpa.repository.*;
import jakarta.persistence.LockModeType;
import java.util.Optional;
public interface OrderRepository extends JpaRepository<PurchaseOrder,Long>,JpaSpecificationExecutor<PurchaseOrder> {
 @Lock(LockModeType.PESSIMISTIC_WRITE) @Query("select o from PurchaseOrder o where o.id=:id")
 Optional<PurchaseOrder> findForUpdate(Long id);
}
