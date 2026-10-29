package com.viettritutor.repository;
import com.viettritutor.entity.OrderRequestKey;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;
public interface OrderRequestKeyRepository extends JpaRepository<OrderRequestKey,Long> {
 Optional<OrderRequestKey> findByActorIdAndOperationAndRequestKey(Long actorId,String operation,String requestKey);
}
