package com.viettritutor.repository;
import com.viettritutor.entity.Subject;
import org.springframework.data.jpa.repository.*;
import java.util.Optional;
public interface SubjectRepository extends JpaRepository<Subject,Long> {
 Optional<Subject> findByName(String name);
 @Modifying @Query(value="insert into subjects(name) values (:name) on conflict do nothing",nativeQuery=true)
 void insertIfAbsent(String name);
}
