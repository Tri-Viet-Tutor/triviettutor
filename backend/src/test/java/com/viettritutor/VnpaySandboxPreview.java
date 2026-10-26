package com.viettritutor;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.viettritutor.entity.*;
import com.viettritutor.enums.*;
import com.viettritutor.repository.*;
import org.springframework.boot.SpringApplication;
import org.springframework.security.crypto.password.PasswordEncoder;
import java.math.BigDecimal;
import java.nio.file.*;
import java.time.*;
import java.util.*;

/** Disposable loopback-only merchant smoke test. Test sources are excluded from the application JAR. */
public class VnpaySandboxPreview {
    public static void main(String[] args) throws Exception {
        VietTriTutorApplication.loadEnvironment(Path.of(""));
        String origin = setting("VNPAY_PREVIEW_FRONTEND_ORIGIN");
        String output = setting("VNPAY_PREVIEW_SESSION_FILE");
        if (origin == null || output == null) throw new IllegalArgumentException("Use scripts/start-vnpay-preview.ps1");
        List<String> options = new ArrayList<>(List.of(
                "--spring.profiles.active=test", "--spring.datasource.url=jdbc:h2:mem:vnpay-preview;MODE=PostgreSQL",
                "--spring.datasource.driver-class-name=org.h2.Driver", "--spring.datasource.username=sa", "--spring.datasource.password=",
                "--spring.flyway.enabled=false", "--spring.jpa.hibernate.ddl-auto=create-drop", "--spring.jpa.show-sql=false",
                "--app.jwt.secret="+UUID.randomUUID()+UUID.randomUUID(), "--server.address="+java.net.InetAddress.getLoopbackAddress().getHostAddress(),
                "--app.frontend-url="+origin, "--app.cors.allowed-origins="+origin,
                "--logging.level.root=WARN"));
        options.addAll(List.of(args));
        var context=SpringApplication.run(VietTriTutorApplication.class,options.toArray(String[]::new));
        Clock clock=context.getBean(Clock.class);
        String password=UUID.randomUUID().toString();
        User student=context.getBean(UserRepository.class).saveAndFlush(User.builder()
                .email(UUID.randomUUID()+"@sandbox.test.invalid").fullName("VNPay Sandbox Preview").role("ROLE_STUDENT")
                .password(context.getBean(PasswordEncoder.class).encode(password)).enabled(true).build());
        Course course=context.getBean(CourseRepository.class).saveAndFlush(Course.builder()
                .name("Toán 11 – VNPay Sandbox Preview").subject("MATH").gradeLevel(GradeLevel.GRADE_11)
                .basePrice1on1(new BigDecimal("100000")).totalSessions(2).durationMinutes(120).active(true).build());
        LocalDate start=LocalDate.now(clock).plusWeeks(2).with(java.time.temporal.TemporalAdjusters.nextOrSame(DayOfWeek.MONDAY));
        ClassGroup group=context.getBean(ClassGroupRepository.class).saveAndFlush(ClassGroup.builder()
                .course(course).classCode("VNPAY-PREVIEW-"+UUID.randomUUID().toString().substring(0,8))
                .classType(ClassType.ONE_ON_ONE).status(ClassStatus.ENROLLING).deliveryMode(DeliveryMode.OFFLINE)
                .schedulePattern(SchedulePattern.MON_WED_FRI).timeSlot(TimeSlot.SLOT_EVENING)
                .startDate(start).enrollmentDeadline(start.minusDays(3)).totalSessions(2).maxStudents(1).build());
        for (int i=0;i<2;i++) context.getBean(SessionRepository.class).saveAndFlush(Session.builder()
                .classGroupId(group.getId()).sessionNumber(i+1).sessionDate(start.plusDays(i*2L))
                .startTime(TimeSlot.SLOT_EVENING.getStartTime()).endTime(TimeSlot.SLOT_EVENING.getEndTime()).status(SessionStatus.SCHEDULED).build());
        Path file=Path.of(output);
        Files.createDirectories(file.toAbsolutePath().getParent());
        context.getBean(ObjectMapper.class).writeValue(file.toFile(),Map.of("email",student.getEmail(),"password",password,
                "classId",group.getId(),"frontendOrigin",origin));
        System.out.println("VNPay Sandbox preview ready. Disposable login details: "+file);
    }
    private static String setting(String name) { return System.getProperty(name,System.getenv(name)); }
}
