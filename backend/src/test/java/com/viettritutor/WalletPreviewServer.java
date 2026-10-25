package com.viettritutor;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.viettritutor.entity.*;
import com.viettritutor.enums.*;
import com.viettritutor.repository.*;
import com.viettritutor.service.*;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.web.servlet.context.ServletWebServerApplicationContext;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.util.LinkedMultiValueMap;
import java.math.BigDecimal;
import java.net.*;
import java.nio.file.*;
import java.time.*;
import java.util.*;

/** Disposable loopback preview. Never loads .env, never connects to the shared database or real VNPay. */
public class WalletPreviewServer {
    public static void main(String[] args) throws Exception {
        String origin = required("WALLET_PREVIEW_ORIGIN");
        String bind = required("WALLET_PREVIEW_BIND");
        URI frontend = URI.create(origin);
        if (!InetAddress.getByName(bind).isLoopbackAddress() || !InetAddress.getByName(frontend.getHost()).isLoopbackAddress()) {
            throw new IllegalArgumentException("Wallet preview requires loopback backend and frontend");
        }
        String secret = UUID.randomUUID().toString();
        var context = (ServletWebServerApplicationContext) new SpringApplication(VietTriTutorApplication.class).run(
            "--spring.profiles.active=test", "--server.address="+bind, "--server.port="+required("WALLET_PREVIEW_PORT"),
            "--spring.datasource.url=jdbc:h2:mem:wallet-preview;MODE=PostgreSQL;DB_CLOSE_DELAY=-1",
            "--spring.datasource.driver-class-name=org.h2.Driver", "--spring.datasource.username=sa", "--spring.datasource.password=",
            "--spring.jpa.hibernate.ddl-auto=create-drop", "--spring.flyway.enabled=false", "--spring.jpa.show-sql=false",
            "--app.jwt.secret="+secret+secret, "--app.frontend-url="+origin, "--app.cors.allowed-origins="+origin,
            "--app.payments.mock-enabled=false", "--app.payments.vnpay.enabled=true", "--app.payments.vnpay.tmn-code=TEST0001",
            "--app.payments.vnpay.hash-secret="+secret, "--app.payments.vnpay.timeout-seconds=10",
            "--app.payments.vnpay.payment-url="+required("WALLET_PREVIEW_GATEWAY_URL"),
            "--app.payments.vnpay.api-url="+required("WALLET_PREVIEW_GATEWAY_URL"),
            "--app.payments.vnpay.return-path=/student/checkout", "--app.wallet.vnpay-return-path=/student/wallet");
        var users=context.getBean(UserRepository.class);
        String password=UUID.randomUUID().toString();
        User student=users.saveAndFlush(User.builder().email("student@wallet-preview.test.invalid").fullName("Học viên Ví Sandbox")
            .password(context.getBean(PasswordEncoder.class).encode(password)).role("ROLE_STUDENT").enabled(true).build());
        Course course=context.getBean(CourseRepository.class).saveAndFlush(Course.builder().name("Toán 11 · Ví Sandbox")
            .subject("MATH").gradeLevel(GradeLevel.GRADE_11).basePrice1on1(new BigDecimal("100000"))
            .totalSessions(2).durationMinutes(120).active(true).build());
        LocalDate start=LocalDate.now(context.getBean(Clock.class)).plusWeeks(2);
        ClassGroup group=context.getBean(ClassGroupRepository.class).saveAndFlush(ClassGroup.builder()
            .course(course).classCode("WALLET-PREVIEW").classType(ClassType.ONE_ON_ONE).status(ClassStatus.ENROLLING)
            .enrollmentDeadline(start.minusDays(3)).deliveryMode(DeliveryMode.OFFLINE).schedulePattern(SchedulePattern.MON_WED_FRI)
            .timeSlot(TimeSlot.SLOT_EVENING).startDate(start).totalSessions(2).maxStudents(1).build());
        for(int i=0;i<2;i++) context.getBean(SessionRepository.class).saveAndFlush(Session.builder()
            .classGroupId(group.getId()).sessionNumber(i+1).sessionDate(start.plusDays(2L*i))
            .startTime(LocalTime.of(18,0)).endTime(LocalTime.of(20,0)).status(SessionStatus.SCHEDULED).build());
        var topups=context.getBean(WalletTopupService.class);
        var t=topups.create(new BigDecimal("200000"),UUID.randomUUID().toString(),student,origin,bind);
        Map<String,String> f=new TreeMap<>();
        f.put("vnp_TmnCode","TEST0001");f.put("vnp_TxnRef",t.reference());f.put("vnp_Amount","20000000");
        f.put("vnp_ResponseCode","00");f.put("vnp_TransactionStatus","00");f.put("vnp_TransactionNo","9000001");
        f.put("vnp_PayDate",VnpayPaymentService.date(OffsetDateTime.now(context.getBean(Clock.class))));
        var signature=context.getBean(VnpaySignature.class);
        var input=new LinkedMultiValueMap<String,String>();f.forEach(input::add);
        input.add("vnp_SecureHash",signature.hash(signature.query(f)));topups.ipn(input);
        Path file=Path.of(required("WALLET_PREVIEW_SESSION_FILE"));Files.createDirectories(file.getParent());
        new ObjectMapper().writeValue(file.toFile(),Map.of("email",student.getEmail(),"password",password,
            "classId",group.getId(),"backendPort",context.getWebServer().getPort()));
        System.out.println("Disposable wallet preview ready; session file: "+file);
    }
    private static String required(String key) {
        String value=System.getenv(key);
        if(value==null || value.isBlank()) throw new IllegalArgumentException("Set "+key);
        return value;
    }
}
