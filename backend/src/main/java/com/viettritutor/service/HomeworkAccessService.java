package com.viettritutor.service;

import com.viettritutor.common.exception.*;
import com.viettritutor.entity.*;
import com.viettritutor.enums.*;
import com.viettritutor.repository.*;
import jakarta.persistence.*;
import org.springframework.data.domain.*;
import java.net.*;
import java.time.*;

public interface HomeworkAccessService {

public record Context(Session session, Homework homework) {}
    Session session(Long id);
    Session lockSession(Long id);
    Context lock(Long homeworkId);
    Context find(Long homeworkId);
    boolean isAdmin(User user);
    boolean isStudent(User user);
/** The tutor who currently teaches the session (a substitute takes precedence). */
    Long tutorOf(Session s);
    void requireWriter(Session s, User actor);
    void requireStudent(Session s, User actor);
    void requireReader(Session s, User actor);
    void requireVisible(Context context, User actor);
    void requireSessionOpen(Session s);
    void requireBeforeDeadline(Homework h);
/** Student work is accepted from openAt while PUBLISHED; after dueAt only when late work is allowed. */
    void requireAccepting(Context context);
/** Seconds past dueAt (at least 1 once the deadline is reached), or null when on time. */
    Long lateSeconds(Homework h);
    void requireVersion(long current, Long provided);
    OffsetDateTime now();
    void requireFuture(OffsetDateTime date);
    Pageable pageable(int page, int size);
    String text(String value);
    String resourceUrl(String value);
}
