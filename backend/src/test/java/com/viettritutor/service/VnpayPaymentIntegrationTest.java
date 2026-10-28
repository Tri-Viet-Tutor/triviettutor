package com.viettritutor.service;

import com.fasterxml.jackson.databind.*;
import com.viettritutor.entity.*;
import com.viettritutor.enums.*;
import com.viettritutor.repository.*;
import com.viettritutor.security.jwt.JwtService;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.*;
import org.springframework.context.annotation.*;
import org.springframework.test.context.*;
import org.springframework.test.web.servlet.*;
import org.springframework.util.*;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.math.BigDecimal;
import java.net.*;
import java.nio.charset.StandardCharsets;
import java.time.*;
import java.util.*;
import java.util.concurrent.atomic.AtomicLong;
import java.util.stream.Collectors;
import static org.assertj.core.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/** Real HTTP security/controllers/services and H2 transactions; never calls a real gateway. */
@SpringBootTest(properties = {
        "spring.datasource.url=jdbc:h2:mem:vnpay-integration;MODE=PostgreSQL;DB_CLOSE_DELAY=-1",
        "spring.datasource.driver-class-name=org.h2.Driver", "spring.datasource.username=sa", "spring.datasource.password=",
        "spring.jpa.hibernate.ddl-auto=create-drop", "spring.flyway.enabled=false", "spring.jpa.show-sql=false",
        "logging.level.root=WARN", "app.payments.vnpay.enabled=true", "app.payments.vnpay.tmn-code=TEST0001",
        "app.payments.vnpay.payment-url=https://gateway.test.invalid/pay",
        "app.payments.vnpay.api-url=https://gateway.test.invalid/api", "app.payments.vnpay.return-path=/student/checkout",
        "app.payments.vnpay.timeout-seconds=10", "app.payments.intent-ttl-minutes=5",
        "app.frontend-url=https://frontend.test.invalid", "app.cors.allowed-origins=https://frontend.test.invalid"
})
@ActiveProfiles("test")
@AutoConfigureMockMvc
@Import(VnpayPaymentIntegrationTest.TestTime.class)
@TestExecutionListeners(listeners = {
        org.springframework.test.context.support.DependencyInjectionTestExecutionListener.class,
        org.springframework.test.context.support.DirtiesContextTestExecutionListener.class
}, mergeMode = TestExecutionListeners.MergeMode.REPLACE_DEFAULTS)
class VnpayPaymentIntegrationTest {
    static final String SECRET = UUID.randomUUID().toString();
    static final AtomicLong TRANSACTIONS = new AtomicLong(100000);
    @DynamicPropertySource static void properties(DynamicPropertyRegistry r) {
        r.add("app.payments.vnpay.hash-secret", () -> SECRET);
        r.add("app.jwt.secret", () -> SECRET + SECRET);
    }
    static class MutableClock extends Clock {
        Instant value = Instant.parse("2030-06-01T03:00:00Z");
        @Override public ZoneId getZone() { return VnpayPaymentService.ZONE; }
        @Override public Clock withZone(ZoneId zone) { return Clock.fixed(value, zone); }
        @Override public Instant instant() { return value; }
    }
    @TestConfiguration static class TestTime {
        @Bean @Primary MutableClock testClock() { return new MutableClock(); }
    }
    @Autowired MockMvc http;
    @Autowired ObjectMapper json;
    @Autowired JwtService jwt;
    @Autowired MutableClock clock;
    @Autowired UserRepository users;
    @Autowired CourseRepository courses;
    @Autowired ClassGroupRepository classes;
    @Autowired SessionRepository sessions;
    @Autowired PaymentIntentRepository intents;
    @Autowired PaymentRepository payments;
    @Autowired EnrollmentRepository enrollments;
    @Autowired LearningScheduleRepository learning;
    @Autowired VnpayRefundTransactions refunds;
    User student, other, admin;
    ClassGroup group;

    @BeforeEach void fixture() {
        clock.value = Instant.parse("2030-06-01T03:00:00Z");
        student = user("STUDENT"); other = user("STUDENT"); admin = user("ADMIN");
        group = newClass();
    }
    User user(String role) {
        return users.saveAndFlush(User.builder().email(UUID.randomUUID()+"@vnpay.test.invalid")
                .fullName("Sandbox test").password(UUID.randomUUID().toString()).role("ROLE_"+role).enabled(true).build());
    }
    ClassGroup newClass() {
        Course course = courses.saveAndFlush(Course.builder().name("Sandbox fixture").subject("MATH")
                .gradeLevel(GradeLevel.GRADE_11).basePrice1on1(new BigDecimal("100000"))
                .totalSessions(2).durationMinutes(120).active(true).build());
        LocalDate start = LocalDate.now(clock).plusWeeks(2).with(java.time.temporal.TemporalAdjusters.nextOrSame(DayOfWeek.MONDAY));
        ClassGroup c = classes.saveAndFlush(ClassGroup.builder().course(course).classCode(UUID.randomUUID().toString())
                .classType(ClassType.ONE_ON_ONE).status(ClassStatus.ENROLLING).enrollmentDeadline(start.minusDays(3))
                .deliveryMode(DeliveryMode.OFFLINE).schedulePattern(SchedulePattern.MON_WED_FRI).timeSlot(TimeSlot.SLOT_EVENING)
                .startDate(start).totalSessions(2).maxStudents(1).build());
        for (int i=0; i<2; i++) sessions.saveAndFlush(Session.builder().classGroupId(c.getId()).sessionNumber(i+1)
                .sessionDate(start.plusDays(2L*i)).startTime(LocalTime.of(18,0)).endTime(LocalTime.of(20,0)).status(SessionStatus.SCHEDULED).build());
        return c;
    }
    String token(User user) { return "Bearer "+jwt.generateToken(Map.of(), user); }
    JsonNode request(String method, String path, Object body, User user, String key, int expected) throws Exception {
        var builder = switch (method) { case "POST" -> post(path); case "DELETE" -> delete(path); default -> get(path); };
        if (user != null) builder.header("Authorization",token(user));
        if (key != null) builder.header("Idempotency-Key",key);
        if (body != null) builder.contentType("application/json").content(json.writeValueAsString(body));
        builder.header("Origin","https://frontend.test.invalid");
        return json.readTree(http.perform(builder).andExpect(status().is(expected)).andReturn().getResponse().getContentAsString()).path("data");
    }
    long quote(User user, ClassGroup c, String key) throws Exception {
        return request("POST","/api/v1/payment-intents",Map.of("classGroupId",c.getId()),user,key,201).path("intentId").asLong();
    }
    long started() throws Exception {
        long id = quote(student,group,UUID.randomUUID().toString());
        request("POST","/api/v1/payment-intents/"+id+"/vnpay",null,student,null,200);
        return id;
    }
    Map<String,String> callback(long id, String code) {
        PaymentIntent p = intents.findById(id).orElseThrow();
        Map<String,String> fields = new TreeMap<>();
        fields.put("vnp_TmnCode","TEST0001"); fields.put("vnp_TxnRef",p.getVnpayReference());
        fields.put("vnp_Amount",p.getAmount().multiply(BigDecimal.valueOf(100)).toPlainString());
        fields.put("vnp_ResponseCode",code); fields.put("vnp_TransactionStatus",code);
        fields.put("vnp_TransactionNo",Long.toString(TRANSACTIONS.incrementAndGet()));
        fields.put("vnp_PayDate",VnpayPaymentService.date(OffsetDateTime.now(clock)));
        return fields;
    }
    String hash(String data) throws Exception {
        Mac mac=Mac.getInstance("HmacSHA512");
        mac.init(new SecretKeySpec(SECRET.getBytes(StandardCharsets.UTF_8),"HmacSHA512"));
        return HexFormat.of().formatHex(mac.doFinal(data.getBytes(StandardCharsets.UTF_8)));
    }
    MultiValueMap<String,String> signed(Map<String,String> fields) throws Exception {
        var result = new LinkedMultiValueMap<String,String>();
        fields.forEach(result::add);
        String query = new TreeMap<>(fields).entrySet().stream().map(e -> URLEncoder.encode(e.getKey(),StandardCharsets.UTF_8)+"="
                +URLEncoder.encode(e.getValue(),StandardCharsets.UTF_8)).collect(Collectors.joining("&"));
        result.add("vnp_SecureHash",hash(query)); return result;
    }
    void ipn(Map<String,String> fields,String expected) throws Exception {
        http.perform(get("/api/v1/payments/vnpay/ipn").params(signed(fields))).andExpect(status().isOk())
                .andExpect(jsonPath("$.RspCode").value(expected));
    }

    @Test void checkoutReturnAndDuplicateIpnHaveOneEnrollment() throws Exception {
        String key=UUID.randomUUID().toString(); long id=quote(student,group,key);
        assertThat(quote(student,group,key)).isEqualTo(id);
        String path="/api/v1/payment-intents/"+id+"/vnpay";
        JsonNode redirect=request("POST",path,null,student,null,200);
        assertThat(request("POST",path,null,student,null,200)).isEqualTo(redirect);
        String query=URI.create(redirect.path("paymentUrl").asText()).getRawQuery();
        int hashIndex=query.indexOf("&vnp_SecureHash=");
        assertThat(query.substring(hashIndex+16)).isEqualTo(hash(query.substring(0,hashIndex)));
        assertThat(URLDecoder.decode(query,StandardCharsets.UTF_8)).contains("vnp_ReturnUrl=https://frontend.test.invalid/student/checkout");
        Map<String,String> fields=callback(id,"00");
        http.perform(get("/api/v1/payments/vnpay/return").header("Authorization",token(student)).params(signed(fields)))
                .andExpect(status().isOk()).andExpect(jsonPath("$.data.intent.status").value("PENDING"))
                .andExpect(jsonPath("$.data.enrollment").isEmpty());
        assertThat(payments.findByIntentId(id)).isEmpty();
        request("GET","/api/v1/payment-intents/"+id,null,other,null,403);
        ipn(fields,"00"); ipn(fields,"02");
        Payment paid=payments.findByIntentId(id).orElseThrow();
        assertThat(paid.getStatus()).isEqualTo(PaymentStatus.COMPLETED);
        Enrollment enrollment=enrollments.findByPaymentId(paid.getId()).orElseThrow();
        assertThat(enrollment.getStatus()).isEqualTo(EnrollmentStatus.ACTIVE);
        assertThat(learning.findByEnrollmentId(enrollment.getId())).isPresent();
        request("POST","/api/v1/payment-intents",Map.of("classGroupId",group.getId()),other,UUID.randomUUID().toString(),409);
    }

    @Test void wrongSignatureAmountMerchantAndDuplicateParametersNeverSettle() throws Exception {
        long id=started(); Map<String,String> fields=callback(id,"00");
        var tampered=signed(fields); tampered.set("vnp_Amount","1");
        http.perform(get("/api/v1/payments/vnpay/ipn").params(tampered)).andExpect(jsonPath("$.RspCode").value("97"));
        fields.put("vnp_Amount","1"); ipn(fields,"04");
        fields=callback(id,"00"); fields.put("vnp_TmnCode","OTHER001"); ipn(fields,"97");
        var duplicate=signed(callback(id,"00")); duplicate.add("vnp_Amount","10000000");
        http.perform(get("/api/v1/payments/vnpay/ipn").params(duplicate)).andExpect(jsonPath("$.RspCode").value("97"));
        assertThat(payments.findByIntentId(id)).isEmpty();
    }

    @Test void failedPaymentReleasesSeatAndCancelledSuccessRequiresRefund() throws Exception {
        long id=started(); ipn(callback(id,"24"),"00");
        assertThat(payments.findByIntentId(id).orElseThrow().getStatus()).isEqualTo(PaymentStatus.FAILED);
        assertThat(intents.reservedClass(group.getId(),OffsetDateTime.now(clock))).isEmpty();
        long another=started();
        request("DELETE","/api/v1/payment-intents/"+another,null,student,null,200);
        ipn(callback(another,"00"),"00");
        Payment paid=payments.findByIntentId(another).orElseThrow();
        assertThat(paid.getStatus()).isEqualTo(PaymentStatus.REQUIRES_REFUND);
        assertThat(enrollments.findByPaymentId(paid.getId())).isEmpty();
    }

    @Test void delayedIpnUsesPaymentTimeAndLatePaymentRequiresRefund() throws Exception {
        long id=started(); var onTime=callback(id,"00");
        clock.value=clock.value.plusSeconds(360);
        ipn(onTime,"00");
        assertThat(payments.findByIntentId(id).orElseThrow().getStatus()).isEqualTo(PaymentStatus.COMPLETED);
        student=user("STUDENT"); group=newClass(); long late=started(); clock.value=clock.value.plusSeconds(360);
        ipn(callback(late,"00"),"00");
        assertThat(payments.findByIntentId(late).orElseThrow().getStatus()).isEqualTo(PaymentStatus.REQUIRES_REFUND);
    }

    @Test void holdsPreventConcurrentAdmissionAndExpiredIntentCannotRestart() throws Exception {
        long id=started();
        request("POST","/api/v1/payment-intents",Map.of("classGroupId",group.getId()),other,UUID.randomUUID().toString(),409);
        clock.value=clock.value.plusSeconds(301);
        request("POST","/api/v1/payment-intents/"+id+"/vnpay",null,student,null,422);
        assertThat(quote(other,group,UUID.randomUUID().toString())).isPositive();
    }

    @Test void overlappingSeatHoldsAndUntrustedOriginsAreRejected() throws Exception {
        long id=quote(student,group,UUID.randomUUID().toString());
        http.perform(post("/api/v1/payment-intents/"+id+"/vnpay").header("Authorization",token(student))
                        .header("Origin","https://attacker.test.invalid"))
                .andExpect(status().isForbidden()); // CORS rejects the origin before the controller.
        assertThat(intents.findById(id).orElseThrow().getVnpayReference()).isNull();
        request("POST","/api/v1/payment-intents/"+id+"/vnpay",null,student,null,200);
        ClassGroup overlapping=newClass();
        http.perform(post("/api/v1/payment-intents").header("Authorization",token(student))
                        .header("Idempotency-Key",UUID.randomUUID().toString()).contentType("application/json")
                        .content(json.writeValueAsString(Map.of("classGroupId",overlapping.getId()))))
                .andExpect(status().isConflict()).andExpect(jsonPath("$.errorCode").value("STUDENT_SCHEDULE_CONFLICT"));
    }

    @Test void ambiguousRefundQueryNeverRemovesLearningAccessOrAllowsBlindRetry() throws Exception {
        long id=started(); ipn(callback(id,"00"),"00"); Payment paid=payments.findByIntentId(id).orElseThrow();
        // Simulate a class already assigned: admin may refund a percentage under existing rules.
        ClassGroup assigned=classes.findById(group.getId()).orElseThrow(); assigned.setStatus(ClassStatus.ASSIGNED); classes.saveAndFlush(assigned);
        var prepared=refunds.prepare(paid.getId(),null,new com.viettritutor.dto.payment.RefundRequest("Sandbox partial refund",50),
                UUID.randomUUID().toString(),admin,false);
        assertThat(refunds.apply(prepared.refundId(),null).status()).isEqualTo("PENDING");
        var original=Map.of("vnp_Command","querydr","vnp_ResponseCode","00","vnp_TransactionStatus","00",
                "vnp_TransactionType","01","vnp_Amount","10000000","vnp_TransactionNo",paid.getProviderTransactionNo());
        assertThat(refunds.apply(prepared.refundId(),original).status()).isEqualTo("PENDING");
        assertThatThrownBy(() -> refunds.retry(prepared.refundId(),admin)).isInstanceOf(com.viettritutor.common.exception.BusinessException.class);
        var confirmed=new HashMap<>(original); confirmed.put("vnp_Command","refund"); confirmed.put("vnp_TransactionType","03");
        confirmed.put("vnp_Amount","5000000"); confirmed.put("vnp_TransactionNo",Long.toString(TRANSACTIONS.incrementAndGet()));
        assertThat(refunds.apply(prepared.refundId(),confirmed).status()).isEqualTo("COMPLETED");
        assertThat(refunds.apply(prepared.refundId(),confirmed).status()).isEqualTo("COMPLETED");
        assertThat(payments.findByIntentId(id).orElseThrow().getRefundedAmount()).isEqualByComparingTo("50000");
        Enrollment enrollment=enrollments.findByPaymentId(paid.getId()).orElseThrow();
        assertThat(enrollment.getStatus()).isEqualTo(EnrollmentStatus.REFUNDED);
        assertThat(learning.findByEnrollmentId(enrollment.getId()).orElseThrow().getStatus()).isEqualTo(LearningScheduleStatus.CANCELLED);
    }

    @Test void studentCancelRetryWithDifferentReasonReturnsPendingRefund() throws Exception {
        long id=started(); ipn(callback(id,"00"),"00"); Payment paid=payments.findByIntentId(id).orElseThrow();
        Enrollment enrollment=enrollments.findByPaymentId(paid.getId()).orElseThrow();
        var first=refunds.prepare(null,enrollment.getId(),new com.viettritutor.dto.payment.RefundRequest("Chọn nhầm lớp",100),
                "cancel-enrollment-"+enrollment.getId(),student,true);
        assertThat(refunds.apply(first.refundId(),null).status()).isEqualTo("PENDING");
        var again=refunds.prepare(null,enrollment.getId(),new com.viettritutor.dto.payment.RefundRequest("nhầm lớp",100),
                "cancel-enrollment-"+enrollment.getId(),student,true);
        assertThat(again.refundId()).isEqualTo(first.refundId());
        assertThat(again.send()).isFalse();
    }

    ClassGroup newGroupClass(BigDecimal basePrice) {
        Course course = courses.saveAndFlush(Course.builder().name("Group fixture").subject("MATH")
                .gradeLevel(GradeLevel.GRADE_11).basePrice1on1(basePrice)
                .totalSessions(2).durationMinutes(120).active(true).build());
        LocalDate start = LocalDate.now(clock).plusWeeks(3).with(java.time.temporal.TemporalAdjusters.nextOrSame(DayOfWeek.TUESDAY));
        ClassGroup c = classes.saveAndFlush(ClassGroup.builder().course(course).classCode(UUID.randomUUID().toString())
                .classType(ClassType.GROUP).status(ClassStatus.ENROLLING).enrollmentDeadline(start.minusDays(3))
                .deliveryMode(DeliveryMode.ONLINE).schedulePattern(SchedulePattern.TUE_THU_SAT).timeSlot(TimeSlot.SLOT_MORNING)
                .startDate(start).totalSessions(2).maxStudents(8).build());
        for (int i = 0; i < 2; i++) {
            sessions.saveAndFlush(Session.builder().classGroupId(c.getId()).sessionNumber(i + 1)
                    .sessionDate(start.plusDays(2L * i)).startTime(LocalTime.of(8, 0)).endTime(LocalTime.of(10, 0))
                    .status(SessionStatus.SCHEDULED).build());
        }
        return c;
    }

    @Test
    void groupClassProgressiveDiscountMatrixAndCapacityLimit() throws Exception {
        BigDecimal base = new BigDecimal("1000000");
        ClassGroup groupClass = newGroupClass(base);

        BigDecimal[] expectedAmounts = {
                new BigDecimal("800000"),
                new BigDecimal("800000"),
                new BigDecimal("800000"),
                new BigDecimal("650000"),
                new BigDecimal("650000"),
                new BigDecimal("600000"),
                new BigDecimal("600000"),
                new BigDecimal("600000")
        };
        BigDecimal[] expectedDiscounts = {
                new BigDecimal("0.20"),
                new BigDecimal("0.20"),
                new BigDecimal("0.20"),
                new BigDecimal("0.35"),
                new BigDecimal("0.35"),
                new BigDecimal("0.40"),
                new BigDecimal("0.40"),
                new BigDecimal("0.40")
        };

        for (int i = 0; i < 8; i++) {
            User s = user("STUDENT");
            long intentId = quote(s, groupClass, UUID.randomUUID().toString());
            PaymentIntent intent = intents.findById(intentId).orElseThrow();
            assertThat(intent.getAmount()).isEqualByComparingTo(expectedAmounts[i]);

            request("POST", "/api/v1/payment-intents/" + intentId + "/vnpay", null, s, null, 200);

            ipn(callback(intentId, "00"), "00");

            Payment paid = payments.findByIntentId(intentId).orElseThrow();
            assertThat(paid.getStatus()).isEqualTo(PaymentStatus.COMPLETED);

            Enrollment enrollment = enrollments.findByPaymentId(paid.getId()).orElseThrow();
            assertThat(enrollment.getStatus()).isEqualTo(EnrollmentStatus.ACTIVE);
            assertThat(enrollment.getFeeCharged()).isEqualByComparingTo(expectedAmounts[i]);
            assertThat(enrollment.getDiscountRate()).isEqualByComparingTo(expectedDiscounts[i]);
            assertThat(enrollment.getEnrollmentSizeAtTime()).isEqualTo(i + 1);
        }

        User rejected = user("STUDENT");
        http.perform(post("/api/v1/payment-intents")
                .header("Authorization", token(rejected))
                .header("Idempotency-Key", UUID.randomUUID().toString())
                .contentType("application/json")
                .content(json.writeValueAsString(Map.of("classGroupId", groupClass.getId()))))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.errorCode").value("CLASS_FULL"));
    }
}
