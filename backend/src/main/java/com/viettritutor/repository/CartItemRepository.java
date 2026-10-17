package com.viettritutor.repository;
import com.viettritutor.entity.CartItem;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
public interface CartItemRepository extends JpaRepository<CartItem,Long> { List<CartItem> findByCartIdOrderById(Long cartId); }
