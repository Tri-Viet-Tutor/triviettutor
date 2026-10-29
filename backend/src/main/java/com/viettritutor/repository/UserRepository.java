package com.viettritutor.repository;

import com.viettritutor.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.Optional;
import java.util.List;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.Lock;

/**
 * User repository.
 * findByEmail is used by UserDetailsService for authentication.
 */
public interface UserRepository extends JpaRepository<User, Long> {

    Optional<User> findByEmail(String email);

    Optional<User> findByGoogleId(String googleId);

    boolean existsByEmail(String email);

    boolean existsByEmailIgnoreCase(String email);

    /**
     * Blank role or search means "no filter". Callers must pass "" rather than null:
     * PostgreSQL cannot infer a type for a null parameter in {@code IS NULL} / {@code LIKE},
     * and the list request then fails with {@code text ~~ bytea}.
     */
    @Query("""
            select u from User u
            where (:role = '' or u.role = :role)
              and (
                    :search = ''
                 or lower(u.email) like concat('%', :search, '%')
                 or lower(u.fullName) like concat('%', :search, '%')
              )
            """)
    Page<User> findAdminUsers(@Param("role") String role,
                              @Param("search") String search,
                              Pageable pageable);

    List<User> findByRoleOrderByIdAsc(String role);

    Optional<User> findFirstByRoleOrderByIdAsc(String role);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select u from User u where u.id = :id")
    Optional<User> findForUpdate(@Param("id") Long id);
}
