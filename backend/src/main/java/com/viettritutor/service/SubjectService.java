package com.viettritutor.service;
import com.viettritutor.entity.Subject;
import com.viettritutor.repository.SubjectRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.Locale;
@Service @RequiredArgsConstructor
public class SubjectService {
 private final SubjectRepository subjects;
 @Transactional public Subject resolve(String name) {
  String normalized=name.trim().toUpperCase(Locale.ROOT);
  subjects.insertIfAbsent(normalized);
  return subjects.findByName(normalized).orElseThrow();
 }
}
