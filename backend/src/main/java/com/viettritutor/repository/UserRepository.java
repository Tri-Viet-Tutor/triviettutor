package com.viettritutor.repository;

import com.viettritutor.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.Optional;

/**
 * User repository.
 * findByEmail is used by UserDetailsService for authentication.
 */
public interface UserRepository extends JpaRepository<User, Long> {

    Optional<User> findByEmail(String email);

    boolean existsByEmail(String email);

    boolean existsByEmailIgnoreCase(String email);

    @Query("""
            select u from User u
            where (:role is null or u.role = :role)
              and (:search is null or lower(u.email) like concat('%', :search, '%')
                   or lower(u.fullName) like concat('%', :search, '%'))
            """)
    Page<User> findAdminUsers(@Param("role") String role,
                              @Param("search") String search,
                              Pageable pageable);
}
