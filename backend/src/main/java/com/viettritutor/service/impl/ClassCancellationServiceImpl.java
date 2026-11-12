package com.viettritutor.service.impl;

import com.viettritutor.entity.ClassGroup;
import com.viettritutor.entity.Enrollment;
import com.viettritutor.enums.ClassStatus;
import com.viettritutor.enums.EnrollmentStatus;
import com.viettritutor.repository.ClassGroupRepository;
import com.viettritutor.repository.EnrollmentRepository;
import com.viettritutor.service.ClassCancellationService;
import com.viettritutor.service.ClassScheduleService;
import com.viettritutor.service.EnrollmentPaymentSupport;
import com.viettritutor.service.EnrollmentRefundService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.LocalDate;
import java.util.List;

@Service
@RequiredArgsConstructor
public class ClassCancellationServiceImpl implements ClassCancellationService {
    private final ClassGroupRepository classes;
    private final EnrollmentRepository enrollments;
    private final EnrollmentPaymentSupport support;
    private final EnrollmentRefundService refundService;
    private final ClassScheduleService scheduleService;
    private final Clock clock;

    private static final String EMPTY_CLASS_REASON =
            "Automatic cancellation: no enrollment after deadline";

    private static final String FAILED_TO_OPEN_REASON =
            "Automatic cancellation: minimum enrollment not reached";

    @Override
    @Transactional
    public boolean cancelIfNotEnoughStudents(Long classId) {

        // 1. Lock ClassGroup trước tiên.
        ClassGroup classGroup = support.lockClass(classId);

        if (classGroup.getStatus() != ClassStatus.ENROLLING) {
            return false;
        }

        // 2. Deadline phải thực sự đã qua.
        LocalDate today = LocalDate.now(clock);

        if (classGroup.getEnrollmentDeadline() == null
                || !classGroup.getEnrollmentDeadline().isBefore(today)) {
            return false;
        }

        // 3. Lấy danh sách Enrollment ACTIVE ban đầu.
        List<Enrollment> preliminary =
                enrollments.findByClassGroupIdAndStatusOrderByStudentId(
                        classId,
                        EnrollmentStatus.ACTIVE
                );

        // 4. Lock tất cả học viên theo thứ tự ID tăng dần.
        Long[] studentIds = preliminary.stream()
                .map(Enrollment::getStudentId)
                .distinct()
                .sorted()
                .toArray(Long[]::new);

        if (studentIds.length > 0) {
            support.lockPeople(studentIds);
        }

        // 5. Lock và lấy lại Enrollment mới nhất.
        List<Enrollment> activeEnrollments =
                enrollments.findActiveForUpdate(
                        classId,
                        EnrollmentStatus.ACTIVE
                );

        // 6. Xác định sĩ số tối thiểu.
        int minimumStudents = switch (classGroup.getClassType()) {
            case ONE_ON_ONE -> 1;
            case GROUP -> 2;
        };

        if (activeEnrollments.size() >= minimumStudents) {
            return false;
        }

        // 7. Xác định trạng thái đích.
        boolean hasStudents = !activeEnrollments.isEmpty();

        ClassStatus targetStatus = hasStudents
                ? ClassStatus.FAILED_TO_OPEN
                : ClassStatus.CANCELLED;

        String reason = hasStudents
                ? FAILED_TO_OPEN_REASON
                : EMPTY_CLASS_REASON;

        // 8. Giải phóng tutor nếu lớp FAILED_TO_OPEN.
        // Phần này sẽ bổ sung xử lý clear tutor khỏi session
        // sau khi kiểm tra ClassScheduleServiceImpl.

        // 9. Cập nhật trạng thái lớp.
        classGroup.setStatus(targetStatus);

        // 10. Hủy session và assignment liên quan.
        if (targetStatus == ClassStatus.FAILED_TO_OPEN) {
            scheduleService.failToOpenClass(classGroup, reason);
        } else {
            scheduleService.cancelClass(classGroup, null, reason);
        }

        // 11. Hoàn tiền 100% cho toàn bộ Enrollment ACTIVE.
        for (Enrollment enrollment : activeEnrollments) {
            refundService.refundForClassCancellation(
                    enrollment.getId(),
                    reason
            );
        }

        return true;
    }
}
