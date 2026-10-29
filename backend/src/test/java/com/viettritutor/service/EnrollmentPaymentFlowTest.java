package com.viettritutor.service;

import com.fasterxml.jackson.databind.*;
import com.viettritutor.common.exception.*;
import com.viettritutor.entity.*;
import com.viettritutor.enums.*;
import com.viettritutor.repository.*;
import com.viettritutor.security.jwt.JwtService;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.*;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.*;
import org.springframework.test.context.*;
import org.springframework.test.web.servlet.*;
import org.springframework.util.*;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.math.BigDecimal;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.time.*;
import java.util.*;
import java.util.concurrent.atomic.AtomicLong;
import java.util.stream.Collectors;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * FLOW-02 enrollment payment gaps: wallet payment of group classes, VNPay querydr reconciliation when the IPN is lost,
 * the quoted discount rate at IPN time, and the refund/cancel state exposed to students. VNPay is a mock; H2 database.
 */
@SpringBootTest(properties = {
        "spring.datasource.url=jdbc:h2:mem:enrollment-payment-flow;MODE=PostgreSQL;DB_CLOSE_DELAY=-1",
        "spring.datasource.driver-class-name=org.h2.Driver", "spring.datasource.username=sa", "spring.datasource.password=",
        "spring.jpa.hibernate.ddl-auto=create-drop", "spring.flyway.enabled=false", "spring.jpa.show-sql=false",
        "logging.level.root=WARN", "app.payments.vnpay.enabled=true", "app.payments.vnpay.tmn-code=TEST0001",
        "app.payments.vnpay.payment-url=https://gateway.test.invalid/pay",
        "app.payments.vnpay.api-url=https://gateway.test.invalid/api", "app.payments.vnpay.return-path=/student/checkout",
        "app.payments.vnpay.timeout-seconds=10", "app.payments.vnpay.server-ip=127.0.0.1", "app.payments.intent-ttl-minutes=5",
        "app.frontend-url=https://frontend.test.invalid", "app.cors.allowed-origins=https://frontend.test.invalid"
})
@ActiveProfiles("test")
@AutoConfigureMockMvc
@Import(EnrollmentPaymentFlowTest.TestTime.class)
@TestExecutionListeners(listeners = {
        org.springframework.test.context.support.DependencyInjectionTestExecutionListener.class,
        org.springframework.test.context.support.DirtiesContextTestExecutionListener.class,
        org.springframework.boot.test.mock.mockito.MockitoTestExecutionListener.class,
        org.springframework.boot.test.mock.mockito.ResetMocksTestExecutionListener.class
}, mergeMode = TestExecutionListeners.MergeMode.REPLACE_DEFAULTS)
class EnrollmentPaymentFlowTest {
    static final String SECRET = UUID.randomUUID().toString();
    static final AtomicLong TRANSACTIONS = new AtomicLong(500000);
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
    @MockBean VnpayApiClient gateway;
    @Autowired MockMvc http;
    @Autowired ObjectMapper json;
    @Autowired JwtService jwt;
    @Autowired MutableClock clock;
    @Autowired UserRepository users;
    @Autowired CourseRepository courses;
    @Autowired SubjectService subjects;
    @Autowired ClassGroupRepository classes;
    @Autowired SessionRepository sessions;
    @Autowired PaymentIntentRepository intents;
    @Autowired PaymentRepository payments;
    @Autowired EnrollmentRepository enrollments;
    @Autowired WalletRepository wallets;
    User student, other;

    @BeforeEach void fixture() {
        clock.value = Instant.parse("2030-06-01T03:00:00Z");
        student = user(); other = user();
    }
    User user() {
        return users.saveAndFlush(User.builder().email(UUID.randomUUID()+"@flow.test.invalid")
                .fullName("Flow test").password(UUID.randomUUID().toString()).role("ROLE_STUDENT").enabled(true).build());
    }
    ClassGroup newClass(ClassType type, String basePrice) {
        Course course = courses.saveAndFlush(Course.builder().name("Flow fixture").subject("MATH").subjectId(subjects.resolve("MATH").getId())
                .gradeLevel(GradeLevel.GRADE_11).basePrice1on1(new BigDecimal(basePrice))
                .totalSessions(2).durationMinutes(120).active(true).build());
        LocalDate start = LocalDate.now(clock).plusWeeks(2).with(java.time.temporal.TemporalAdjusters.nextOrSame(DayOfWeek.MONDAY));
        ClassGroup c = classes.saveAndFlush(ClassGroup.builder().course(course).classCode(UUID.randomUUID().toString())
                .classType(type).status(ClassStatus.ENROLLING).enrollmentDeadline(start.minusDays(3))
                .deliveryMode(DeliveryMode.ONLINE).schedulePattern(SchedulePattern.MON_WED_FRI).timeSlot(TimeSlot.SLOT_EVENING)
                .startDate(start).totalSessions(2).maxStudents(type == ClassType.GROUP ? 8 : 1).build());
        for (int i = 0; i < 2; i++) sessions.saveAndFlush(Session.builder().classGroupId(c.getId()).sessionNumber(i + 1)
                .sessionDate(start.plusDays(2L * i)).startTime(LocalTime.of(18, 0)).endTime(LocalTime.of(20, 0))
                .status(SessionStatus.SCHEDULED).build());
        return c;
    }
    String token(User user) { return "Bearer " + jwt.generateToken(Map.of(), user); }
    JsonNode request(String method, String path, Object body, User user, String key, int expected) throws Exception {
        var builder = switch (method) { case "POST" -> post(path); case "DELETE" -> delete(path); default -> get(path); };
        if (user != null) builder.header("Authorization", token(user));
        if (key != null) builder.header("Idempotency-Key", key);
        if (body != null) builder.contentType("application/json").content(json.writeValueAsString(body));
        builder.header("Origin", "https://frontend.test.invalid");
        return json.readTree(http.perform(builder).andExpect(status().is(expected)).andReturn().getResponse().getContentAsString()).path("data");
    }
    long quote(User user, ClassGroup c) throws Exception {
        return request("POST", "/api/v1/payment-intents", Map.of("classGroupId", c.getId()), user, UUID.randomUUID().toString(), 201)
                .path("intentId").asLong();
    }
    long started(User user, ClassGroup c) throws Exception {
        long id = quote(user, c);
        request("POST", "/api/v1/payment-intents/" + id + "/vnpay", null, user, null, 200);
        return id;
    }
    Map<String, String> paid(long id) {
        PaymentIntent p = intents.findById(id).orElseThrow();
        Map<String, String> fields = new TreeMap<>();
        fields.put("vnp_TmnCode", "TEST0001"); fields.put("vnp_TxnRef", p.getVnpayReference());
        fields.put("vnp_Amount", p.getAmount().multiply(BigDecimal.valueOf(100)).toPlainString());
        fields.put("vnp_ResponseCode", "00"); fields.put("vnp_TransactionStatus", "00");
        fields.put("vnp_TransactionNo", Long.toString(TRANSACTIONS.incrementAndGet()));
        fields.put("vnp_PayDate", VnpayPaymentService.date(OffsetDateTime.now(clock)));
        return fields;
    }
    Map<String, String> querydr(long id, String status) {
        Map<String, String> fields = new HashMap<>(paid(id));
        fields.put("vnp_Command", "querydr"); fields.put("vnp_TransactionType", "01"); fields.put("vnp_TransactionStatus", status);
        return fields;
    }
    void ipn(Map<String, String> fields, String expected) throws Exception {
        var params = new LinkedMultiValueMap<String, String>();
        fields.forEach(params::add);
        String query = new TreeMap<>(fields).entrySet().stream().map(e -> URLEncoder.encode(e.getKey(), StandardCharsets.UTF_8) + "="
                + URLEncoder.encode(e.getValue(), StandardCharsets.UTF_8)).collect(Collectors.joining("&"));
        Mac mac = Mac.getInstance("HmacSHA512");
        mac.init(new SecretKeySpec(SECRET.getBytes(StandardCharsets.UTF_8), "HmacSHA512"));
        params.add("vnp_SecureHash", HexFormat.of().formatHex(mac.doFinal(query.getBytes(StandardCharsets.UTF_8))));
        http.perform(get("/api/v1/payments/vnpay/ipn").params(params)).andExpect(status().isOk())
                .andExpect(jsonPath("$.RspCode").value(expected));
    }
    JsonNode reconcile(long id, User user, int expected) throws Exception {
        return request("POST", "/api/v1/payment-intents/" + id + "/reconcile", null, user, null, expected);
    }
    JsonNode myEnrollment(User user, long enrollmentId) throws Exception {
        for (JsonNode row : request("GET", "/api/v1/enrollments/my", null, user, null, 200).path("content")) {
            if (row.path("enrollmentId").asLong() == enrollmentId) return row;
        }
        throw new AssertionError("Enrollment " + enrollmentId + " not listed");
    }

    @Test void walletPaysGroupClassAtDiscountedPrice() throws Exception {
        ClassGroup group = newClass(ClassType.GROUP, "1000000");
        wallets.saveAndFlush(Wallet.builder().studentId(student.getId()).balance(new BigDecimal("1000000"))
                .createdAt(OffsetDateTime.now(clock)).build());
        long id = quote(student, group);
        assertThat(intents.findById(id).orElseThrow().getAmount()).isEqualByComparingTo("800000");
        JsonNode result = request("POST", "/api/v1/payment-intents/" + id + "/wallet", null, student, "wallet-" + id, 200);
        assertThat(result.path("enrollment").path("status").asText()).isEqualTo("ACTIVE");
        Enrollment enrollment = enrollments.findByPaymentId(payments.findByIntentId(id).orElseThrow().getId()).orElseThrow();
        assertThat(enrollment.getFeeCharged()).isEqualByComparingTo("800000");
        assertThat(enrollment.getDiscountRate()).isEqualByComparingTo("0.20");
        assertThat(wallets.findByStudentId(student.getId()).orElseThrow().getBalance()).isEqualByComparingTo("200000");
    }

    @Test void reconcileSettlesPaidIntentWhenIpnNeverArrivesAndIsIdempotent() throws Exception {
        ClassGroup group = newClass(ClassType.ONE_ON_ONE, "100000");
        long id = started(student, group);
        Map<String, String> result = querydr(id, "00");
        when(gateway.exchange(anyMap(), anyString(), eq("querydr"))).thenReturn(result);
        reconcile(id, other, 403);
        JsonNode detail = reconcile(id, student, 200);
        assertThat(detail.path("intent").path("status").asText()).isEqualTo("COMPLETED");
        assertThat(detail.path("enrollment").path("status").asText()).isEqualTo("ACTIVE");
        Payment payment = payments.findByIntentId(id).orElseThrow();
        assertThat(payment.getStatus()).isEqualTo(PaymentStatus.COMPLETED);
        assertThat(payment.getProviderTransactionNo()).isEqualTo(result.get("vnp_TransactionNo"));
        // A repeated check and the late IPN neither query again nor enroll twice.
        assertThat(reconcile(id, student, 200).path("enrollment").path("enrollmentId").asLong())
                .isEqualTo(detail.path("enrollment").path("enrollmentId").asLong());
        Map<String, String> lateIpn = new TreeMap<>(paid(id));
        lateIpn.put("vnp_TransactionNo", result.get("vnp_TransactionNo"));
        ipn(lateIpn, "02");
        verify(gateway, times(1)).exchange(anyMap(), anyString(), eq("querydr"));
        assertThat(enrollments.findAll().stream().filter(e -> e.getPaymentId().equals(payment.getId()))).hasSize(1);
    }

    @Test void reconcileLeavesUnfinishedOrMismatchedResultsUntouched() throws Exception {
        ClassGroup group = newClass(ClassType.ONE_ON_ONE, "100000");
        long id = started(student, group);
        when(gateway.exchange(anyMap(), anyString(), eq("querydr"))).thenReturn(querydr(id, "01"));
        assertThat(reconcile(id, student, 200).path("intent").path("status").asText()).isEqualTo("PENDING");
        Map<String, String> wrongAmount = querydr(id, "00");
        wrongAmount.put("vnp_Amount", "1");
        when(gateway.exchange(anyMap(), anyString(), eq("querydr"))).thenReturn(wrongAmount);
        reconcile(id, student, 400);
        when(gateway.exchange(anyMap(), anyString(), eq("querydr"))).thenThrow(new BusinessException(ErrorCode.PAYMENT_GATEWAY_ERROR));
        reconcile(id, student, 502);
        assertThat(payments.findByIntentId(id)).isEmpty();
        assertThat(intents.findById(id).orElseThrow().getStatus()).isEqualTo(PaymentIntentStatus.PENDING);
    }

    @Test void ipnRecordsTheQuotedDiscountRateEvenIfTheClassGrewMeanwhile() throws Exception {
        ClassGroup group = newClass(ClassType.GROUP, "1000000");
        long held = started(student, group);
        for (int i = 0; i < 3; i++) {
            User peer = user();
            long id = started(peer, group);
            ipn(paid(id), "00");
        }
        ipn(paid(held), "00");
        Enrollment enrollment = enrollments.findByPaymentId(payments.findByIntentId(held).orElseThrow().getId()).orElseThrow();
        assertThat(enrollment.getFeeCharged()).isEqualByComparingTo("800000");
        assertThat(enrollment.getDiscountRate()).isEqualByComparingTo("0.20");
        assertThat(enrollment.getEnrollmentSizeAtTime()).isEqualTo(4);
    }

    @Test void cancellingVnpayEnrollmentShowsPendingRefundAndBlocksAnotherCancel() throws Exception {
        ClassGroup group = newClass(ClassType.ONE_ON_ONE, "100000");
        long id = started(student, group);
        ipn(paid(id), "00");
        long enrollmentId = enrollments.findByPaymentId(payments.findByIntentId(id).orElseThrow().getId()).orElseThrow().getId();
        JsonNode before = myEnrollment(student, enrollmentId);
        assertThat(before.path("cancellable").asBoolean()).isTrue();
        assertThat(before.path("refundStatus").isNull()).isTrue();
        // The provider does not answer: the refund stays PENDING and the enrollment stays ACTIVE until it confirms.
        when(gateway.exchange(anyMap(), anyString(), eq("refund"))).thenThrow(new BusinessException(ErrorCode.PAYMENT_GATEWAY_ERROR));
        JsonNode cancelled = request("DELETE", "/api/v1/enrollments/" + enrollmentId, Map.of("reason", "Đổi lịch"), student, null, 200);
        assertThat(cancelled.path("status").asText()).isEqualTo("ACTIVE");
        assertThat(cancelled.path("refundStatus").asText()).isEqualTo("PENDING");
        assertThat(cancelled.path("cancellable").asBoolean()).isFalse();
        JsonNode listed = myEnrollment(student, enrollmentId);
        assertThat(listed.path("refundStatus").asText()).isEqualTo("PENDING");
        assertThat(listed.path("cancellable").asBoolean()).isFalse();
    }

    @Test void assignedClassEnrollmentIsNotSelfCancellable() throws Exception {
        ClassGroup group = newClass(ClassType.ONE_ON_ONE, "100000");
        long id = started(student, group);
        ipn(paid(id), "00");
        long enrollmentId = enrollments.findByPaymentId(payments.findByIntentId(id).orElseThrow().getId()).orElseThrow().getId();
        ClassGroup assigned = classes.findById(group.getId()).orElseThrow();
        assigned.setStatus(ClassStatus.ASSIGNED);
        classes.saveAndFlush(assigned);
        JsonNode listed = myEnrollment(student, enrollmentId);
        assertThat(listed.path("status").asText()).isEqualTo("ACTIVE");
        assertThat(listed.path("cancellable").asBoolean()).isFalse();
        request("DELETE", "/api/v1/enrollments/" + enrollmentId, Map.of("reason", "Đổi lịch"), student, null, 422);
    }
}
