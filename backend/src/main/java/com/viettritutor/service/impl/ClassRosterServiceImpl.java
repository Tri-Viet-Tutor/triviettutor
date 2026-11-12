package com.viettritutor.service.impl;
import com.viettritutor.service.*;
import com.viettritutor.service.ClassRosterService;

import com.viettritutor.common.exception.BusinessException;
import com.viettritutor.common.exception.ErrorCode;
import com.viettritutor.dto.roster.*;
import com.viettritutor.entity.*;
import com.viettritutor.enums.AssignmentStatus;
import com.viettritutor.enums.AttendanceStatus;
import com.viettritutor.enums.EnrollmentStatus;
import com.viettritutor.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ClassRosterServiceImpl implements ClassRosterService {

    private final ClassGroupRepository classGroupRepository;
    private final SessionRepository sessionRepository;
    private final EnrollmentRepository enrollmentRepository;
    private final UserRepository userRepository;
    private final TutorAssignmentRepository tutorAssignmentRepository;
    private final AttendanceRecordRepository attendanceRecordRepository;

    @Override
    public ClassRosterResponse getClassRoster(Long classGroupId, User actor) {
        ClassGroup classGroup = classGroupRepository.findById(classGroupId)
                .orElseThrow(() -> new BusinessException(ErrorCode.CLASS_NOT_FOUND));

        boolean isAdmin = "ROLE_ADMIN".equals(actor.getRole());
        boolean isTutor = "ROLE_TUTOR".equals(actor.getRole());

        if (isTutor) {
            boolean assigned = tutorAssignmentRepository.findByClassGroupIdAndStatus(classGroupId, AssignmentStatus.ACTIVE)
                    .map(a -> a.getTutorId().equals(actor.getId()))
                    .orElse(false);

            if (!assigned) {
                // Kiểm tra xem gia sư có dạy bất kỳ buổi nào trong lớp này không
                List<Session> classSessions = sessionRepository.findByClassGroupIdOrderBySessionNumberAsc(classGroupId);
                boolean teachesAny = classSessions.stream().anyMatch(s ->
                        actor.getId().equals(s.getScheduledTutorId()) || actor.getId().equals(s.getActualTutorId()));
                if (!teachesAny) {
                    throw new BusinessException(ErrorCode.ACCESS_DENIED);
                }
            }
        } else if (!isAdmin) {
            throw new BusinessException(ErrorCode.ACCESS_DENIED);
        }

        List<Enrollment> enrollments = enrollmentRepository.findByClassGroupIdAndStatusOrderByStudentId(
                classGroupId, EnrollmentStatus.ACTIVE);

        List<Long> studentIds = enrollments.stream().map(Enrollment::getStudentId).toList();
        Map<Long, User> userMap = userRepository.findAllById(studentIds).stream()
                .collect(Collectors.toMap(User::getId, u -> u));

        List<Session> sessions = sessionRepository.findByClassGroupIdOrderBySessionNumberAsc(classGroupId);
        int totalSessions = sessions.size();
        List<Long> sessionIds = sessions.stream().map(Session::getId).toList();

        Map<Long, Integer> attendanceCountMap = new HashMap<>();
        if (!sessionIds.isEmpty()) {
            List<AttendanceRecord> records = attendanceRecordRepository.findBySessionIdIn(sessionIds);
            for (AttendanceRecord rec : records) {
                if (rec.getStatus() == AttendanceStatus.PRESENT || rec.getStatus() == AttendanceStatus.LATE) {
                    attendanceCountMap.merge(rec.getStudentId(), 1, Integer::sum);
                }
            }
        }

        List<ClassStudentItem> studentItems = enrollments.stream().map(e -> {
            User u = userMap.get(e.getStudentId());
            String fullName = u != null ? u.getFullName() : ("Học viên #" + e.getStudentId());
            String avatarUrl = (u != null && u.getAvatar() != null) ? ("/api/v1/users/" + u.getId() + "/avatar") : null;
            int attended = attendanceCountMap.getOrDefault(e.getStudentId(), 0);

            return new ClassStudentItem(
                    e.getStudentId(),
                    fullName,
                    avatarUrl,
                    e.getStatus(),
                    e.getEnrolledAt(),
                    attended,
                    totalSessions,
                    isAdmin ? e.getFeeCharged() : null // Chỉ admin thấy học phí, gia sư bị ẩn
            );
        }).toList();

        String courseName = classGroup.getCourse() != null ? classGroup.getCourse().getName() : ("Lớp " + classGroup.getClassCode());

        return new ClassRosterResponse(
                classGroup.getId(),
                classGroup.getClassCode(),
                courseName,
                studentItems.size(),
                studentItems
        );
    }

    @Override
    public SessionRosterResponse getSessionRoster(Long sessionId, User actor) {
        Session session = sessionRepository.findById(sessionId)
                .orElseThrow(() -> new BusinessException(ErrorCode.SESSION_NOT_FOUND));

        Long classGroupId = session.getClassGroupId();
        ClassGroup classGroup = classGroupRepository.findById(classGroupId)
                .orElseThrow(() -> new BusinessException(ErrorCode.CLASS_NOT_FOUND));

        boolean isAdmin = "ROLE_ADMIN".equals(actor.getRole());
        boolean isTutor = "ROLE_TUTOR".equals(actor.getRole());
        boolean isStudent = "ROLE_STUDENT".equals(actor.getRole());

        if (isTutor) {
            boolean isTeacher = actor.getId().equals(session.getActualTutorId()) ||
                    actor.getId().equals(session.getScheduledTutorId());
            if (!isTeacher) {
                boolean isClassTutor = tutorAssignmentRepository.findByClassGroupIdAndStatus(classGroupId, AssignmentStatus.ACTIVE)
                        .map(a -> a.getTutorId().equals(actor.getId()))
                        .orElse(false);
                if (!isClassTutor) {
                    throw new BusinessException(ErrorCode.ACCESS_DENIED);
                }
            }
        } else if (isStudent) {
            boolean enrolled = enrollmentRepository.existsByStudentIdAndClassGroupIdAndStatus(
                    actor.getId(), classGroupId, EnrollmentStatus.ACTIVE);
            if (!enrolled) {
                throw new BusinessException(ErrorCode.ACCESS_DENIED);
            }
        } else if (!isAdmin) {
            throw new BusinessException(ErrorCode.ACCESS_DENIED);
        }

        List<Enrollment> enrollments = enrollmentRepository.findByClassGroupIdAndStatusOrderByStudentId(
                classGroupId, EnrollmentStatus.ACTIVE);

        List<Long> studentIds = enrollments.stream().map(Enrollment::getStudentId).toList();
        Map<Long, User> userMap = userRepository.findAllById(studentIds).stream()
                .collect(Collectors.toMap(User::getId, u -> u));

        List<SessionRosterStudent> rosterStudents = studentIds.stream().map(sId -> {
            User u = userMap.get(sId);
            String fullName = u != null ? u.getFullName() : ("Học viên #" + sId);
            String avatarUrl = (u != null && u.getAvatar() != null) ? ("/api/v1/users/" + u.getId() + "/avatar") : null;
            return new SessionRosterStudent(sId, fullName, avatarUrl);
        }).toList();

        Long tutorId = session.getActualTutorId() != null ? session.getActualTutorId() : session.getScheduledTutorId();
        String tutorName = "Gia sư phụ trách";
        if (tutorId != null) {
            User tutorUser = userRepository.findById(tutorId).orElse(null);
            if (tutorUser != null) {
                tutorName = tutorUser.getFullName();
            }
        }

        String courseTitle = classGroup.getCourse() != null ? classGroup.getCourse().getName() : ("Lớp " + classGroup.getClassCode());

        SessionRosterTutor tutorObj = tutorId != null ? new SessionRosterTutor(tutorId, tutorName) : null;

        return new SessionRosterResponse(
                session.getId(),
                classGroupId,
                courseTitle,
                session.getSessionNumber(),
                tutorId,
                tutorName,
                tutorObj,
                rosterStudents
        );
    }
}
