package com.viettritutor.service;

import com.viettritutor.dto.catalog.*;
import com.viettritutor.dto.schedule.SessionResponse;
import com.viettritutor.entity.*;
import com.viettritutor.repository.ClassGroupRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.*;
import java.util.*;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * Gom dữ liệu thật cho chatbot: khóa đang bán, lớp đang mở (học phí ước tính), quy định nghỉ/học bù/hoàn tiền
 * và lịch học của chính người đang đăng nhập. Không bao giờ lấy dữ liệu của người khác nên chatbot không thể lộ ra.
 */
@Component
@RequiredArgsConstructor
public class AssistantContextBuilder {
    private static final int SCHEDULE_DAYS = 30;
    private final AdminCourseService courses;
    private final ClassQueryService classes;
    private final SessionQueryService sessions;
    private final ClassGroupRepository classGroups;
    private final Clock clock;

    // Tóm tắt từ LeaveRequestServiceImpl, SessionReschedulingServiceImpl, EnrollmentPaymentSupport và CatalogController.
    private static final String POLICIES = """
            - Báo nghỉ: học viên/gia sư gửi đơn nghỉ cho từng buổi trên portal, trước khi buổi học bắt đầu; buổi đã hủy hoặc đã bắt đầu thì không báo nghỉ được. Mỗi buổi chỉ có một đơn đang chờ duyệt của mỗi người.
            - Báo trước dưới 24 giờ so với giờ bắt đầu bị tính là báo nghỉ trễ.
            - Lớp 1-1: học viên báo nghỉ trước ít nhất 24 giờ thì buổi chuyển sang chờ xếp lịch lại để học bù; báo trễ thì buổi vẫn giữ nguyên.
            - Lớp nhóm: một học viên nghỉ thì lớp vẫn học bình thường, không tự xếp buổi bù.
            - Gia sư báo nghỉ: buổi chuyển sang chờ xếp lịch lại; trung tâm sẽ xếp học bù, cử gia sư dạy thay hoặc hủy buổi.
            - Học bù do trung tâm (admin) xếp, thời gian học bù phải ở tương lai và không trùng lịch của học viên.
            - Học phí lớp nhóm theo số chỗ: giảm 20% cho chỗ 1-3, 35% cho chỗ 4-5, 40% cho chỗ 6-8; lớp 1-1 không giảm giá. Học phí thanh toán qua VNPay hoặc ví.
            - Hoàn tiền: hoàn 100% nếu lớp không mở được, hoặc lớp bị hủy trước buổi học đầu tiên; học viên tự hủy ghi danh được khi lớp còn đang tuyển sinh, trước hạn đăng ký và trước buổi đầu. Lớp đã bắt đầu thì liên hệ trung tâm.
            """;

    @Transactional(readOnly = true)
    public String build(User user) {
        StringBuilder context = new StringBuilder();
        // Mô hình nhỏ hay tính sai thứ và tuần, nên đưa sẵn thứ cùng khoảng ngày của tuần này/tuần sau.
        LocalDate today = LocalDate.now(clock);
        LocalDate monday = today.with(java.time.temporal.TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY));
        context.append("Hôm nay: ").append(day(today)).append(" (giờ Việt Nam)\n")
                .append("Tuần này: ").append(day(monday)).append(" đến ").append(day(monday.plusDays(6))).append('\n')
                .append("Tuần sau: ").append(day(monday.plusDays(7))).append(" đến ").append(day(monday.plusDays(13)))
                .append("\n\n");
        context.append("## Khóa học đang bán\n");
        for (CourseResponse course : courses.list(null, null, true, 0, 50).getContent()) {
            context.append("- ").append(course.getName()).append(" | môn ").append(course.getSubject())
                    .append(" | ").append(course.getGradeLevel()).append(" | ").append(course.getTotalSessions())
                    .append(" buổi x ").append(course.getDurationMinutes()).append(" phút | giá gốc 1-1 ")
                    .append(vnd(course.getBasePrice1on1())).append('\n');
        }
        context.append("\n## Lớp đang mở tuyển sinh (còn chỗ)\n");
        List<ClassResponse> open = classes.catalog(null, null, null, null, null, 0, 30).getContent();
        if (open.isEmpty()) context.append("- Hiện không có lớp nào đang mở.\n");
        for (ClassResponse c : open) {
            context.append("- Lớp ").append(c.getClassCode()).append(" | ").append(c.getCourseName())
                    .append(" | ").append(c.getGradeLevel()).append(" | ").append(c.getClassType())
                    .append(" | ").append(c.getDeliveryMode()).append(" | lịch ").append(c.getSchedulePattern())
                    .append(' ').append(c.getTimeSlotLabel()).append(" | khai giảng ").append(day(c.getStartDate()))
                    .append(" | hạn đăng ký ").append(day(c.getEnrollmentDeadline())).append(" | còn ")
                    .append(c.getSpotsLeft()).append(" chỗ | học phí ước tính ").append(vnd(c.getEstimatedFee()))
                    .append('\n');
        }
        context.append("\n## Quy định\n").append(POLICIES);
        context.append("\n## Người đang hỏi\n").append(schedule(user));
        return context.toString();
    }

    private String schedule(User user) {
        if (user == null) return "Khách chưa đăng nhập: không có lịch học riêng. Muốn xem lịch thì đăng nhập.\n";
        if (!Set.of("ROLE_STUDENT", "ROLE_TUTOR").contains(user.getRole())) {
            return "Tài khoản quản trị: không có lịch học riêng.\n";
        }
        LocalDate today = LocalDate.now(clock);
        List<SessionResponse> mine = sessions.getMySessions(user, today, today.plusDays(SCHEDULE_DAYS), null, null);
        if (mine.isEmpty()) return "Không có buổi học nào trong " + SCHEDULE_DAYS + " ngày tới.\n";
        Map<Long, ClassGroup> groups = classGroups.findAllById(mine.stream().map(SessionResponse::classGroupId)
                .collect(Collectors.toSet())).stream().collect(Collectors.toMap(ClassGroup::getId, Function.identity()));
        StringBuilder text = new StringBuilder("Lịch học của chính người này trong " + SCHEDULE_DAYS + " ngày tới:\n");
        for (SessionResponse session : mine) {
            ClassGroup group = groups.get(session.classGroupId());
            text.append("- ").append(day(session.date())).append(' ').append(session.startTime()).append('-')
                    .append(session.endTime()).append(" | lớp ")
                    .append(group == null ? session.classGroupId() : group.getClassCode() + " (" + group.getCourse().getName() + ")")
                    .append(" | buổi ").append(session.sessionNumber()).append(" | ").append(session.status()).append('\n');
        }
        return text.toString();
    }

    private static final String[] WEEKDAYS = {"Thứ Hai", "Thứ Ba", "Thứ Tư", "Thứ Năm", "Thứ Sáu", "Thứ Bảy", "Chủ Nhật"};

    /** Ví dụ "Thứ Hai 02/11/2026" */
    private static String day(LocalDate date) {
        if (date == null) return "chưa có";
        return WEEKDAYS[date.getDayOfWeek().getValue() - 1] + " "
                + date.format(java.time.format.DateTimeFormatter.ofPattern("dd/MM/yyyy"));
    }

    private static String vnd(java.math.BigDecimal amount) {
        return amount == null ? "chưa có" : String.format(Locale.ROOT, "%,d VND", amount.longValue()).replace(',', '.');
    }
}
