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
import java.util.concurrent.*;
import java.util.concurrent.atomic.AtomicLong;
import java.util.stream.Collectors;
import static org.assertj.core.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/** Real controllers/security/transactions with isolated H2; no live gateway or shared database. */
@SpringBootTest(properties = {
    "spring.datasource.url=jdbc:h2:mem:wallet-integration;MODE=PostgreSQL;DB_CLOSE_DELAY=-1",
    "spring.datasource.driver-class-name=org.h2.Driver", "spring.datasource.username=sa", "spring.datasource.password=",
    "spring.jpa.hibernate.ddl-auto=create-drop", "spring.flyway.enabled=false", "spring.jpa.show-sql=false",
    "logging.level.root=WARN", "app.payments.mock-enabled=false", "app.payments.vnpay.enabled=true",
    "app.payments.vnpay.tmn-code=TEST0001", "app.payments.vnpay.payment-url=https://gateway.test.invalid/pay",
    "app.payments.vnpay.api-url=https://gateway.test.invalid/api", "app.payments.vnpay.return-path=/student/checkout",
    "app.payments.vnpay.timeout-seconds=10", "app.payments.vnpay.server-ip=127.0.0.1", "app.payments.intent-ttl-minutes=5",
    "app.frontend-url=https://frontend.test.invalid", "app.cors.allowed-origins=https://frontend.test.invalid",
    "app.wallet.vnpay-return-path=/student/wallet", "app.wallet.topup-min-amount=10000",
    "app.wallet.topup-max-amount=50000000", "app.wallet.topup-ttl-minutes=15"
})
@ActiveProfiles("test") @AutoConfigureMockMvc
@Import(WalletIntegrationTest.TestTime.class)
@TestExecutionListeners(listeners = {
    org.springframework.test.context.support.DependencyInjectionTestExecutionListener.class,
    org.springframework.test.context.support.DirtiesContextTestExecutionListener.class
}, mergeMode = TestExecutionListeners.MergeMode.REPLACE_DEFAULTS)
class WalletIntegrationTest {
    static final String SECRET = UUID.randomUUID().toString();
    static final AtomicLong NUMBERS = new AtomicLong(Instant.now().toEpochMilli() * 100);
    @DynamicPropertySource static void secrets(DynamicPropertyRegistry r) {
        r.add("app.payments.vnpay.hash-secret", () -> SECRET);
        r.add("app.jwt.secret", () -> SECRET + SECRET);
        String postgres = System.getProperty("wallet.test.database-url");
        if (postgres != null) {
            URI uri = URI.create(postgres.substring("jdbc:".length()));
            if (!"postgresql".equals(uri.getScheme()) || !"127.0.0.1".equals(uri.getHost())
                    || !"/wallet_test".equals(uri.getPath())) throw new IllegalArgumentException("Use an isolated loopback wallet_test database");
            r.add("spring.datasource.url", () -> postgres);
            r.add("spring.datasource.driver-class-name", () -> "org.postgresql.Driver");
            r.add("spring.datasource.username", () -> "wallet_test");
            r.add("spring.jpa.hibernate.ddl-auto", () -> "validate");
        }
    }
    static class MutableClock extends Clock {
        volatile Instant value = Instant.parse("2030-06-01T03:00:00Z");
        @Override public ZoneId getZone() { return VnpayPaymentService.ZONE; }
        @Override public Clock withZone(ZoneId zone) { return Clock.fixed(value, zone); }
        @Override public Instant instant() { return value; }
    }
    /** Stands in for the VNPay merchant API; the real client still signs requests and verifies the reply. */
    static class FakeGateway extends com.viettritutor.service.VnpayApiClient {
        volatile Map<String, Object> reply;
        FakeGateway(com.viettritutor.config.VnpayProperties p, VnpaySignature s) { super(p, s); }
        @Override protected Map<String, Object> post(Map<String, String> body) { return reply; }
    }
    @TestConfiguration static class TestTime {
        @Bean @Primary MutableClock walletClock() { return new MutableClock(); }
        @Bean @Primary FakeGateway fakeGateway(com.viettritutor.config.VnpayProperties p, VnpaySignature s) { return new FakeGateway(p, s); }
    }
    @Autowired MockMvc http;
    @Autowired ObjectMapper json;
    @Autowired JwtService jwt;
    @Autowired MutableClock clock;
    @Autowired UserRepository users;
    @Autowired CourseRepository courses;
    @Autowired SubjectService subjects;
    @Autowired ClassGroupRepository classes;
    @Autowired SessionRepository sessions;
    @Autowired PaymentRepository payments;
    @Autowired PaymentIntentRepository intents;
    @Autowired EnrollmentRepository enrollments;
    @Autowired LearningScheduleRepository learning;
    @Autowired WalletRepository wallets;
    @Autowired WalletTopupIntentRepository topups;
    @Autowired WalletService wallet;
    @Autowired WalletTopupService topupService;
    @Autowired WalletPaymentService walletPayment;
    @Autowired VnpayPaymentService directPayment;
    @Autowired com.viettritutor.config.VnpayProperties vnpay;
    @Autowired FakeGateway gateway;
    User student, other, admin;
    ClassGroup group;
    @BeforeEach void fixture() {
        clock.value = Instant.parse("2030-06-01T03:00:00Z");
        student = user("STUDENT"); other = user("STUDENT"); admin = user("ADMIN");
        group = newClass(18);
    }
    User user(String role) {
        return users.saveAndFlush(User.builder().email(UUID.randomUUID()+"@wallet.test.invalid")
            .fullName("Wallet test").password(UUID.randomUUID().toString()).role("ROLE_"+role).enabled(true).build());
    }
    ClassGroup newClass(int hour) {
        Course course = courses.saveAndFlush(Course.builder().name("Wallet fixture").subject("MATH").subjectId(subjects.resolve("MATH").getId())
            .gradeLevel(GradeLevel.GRADE_11).basePrice1on1(new BigDecimal("100000"))
            .totalSessions(2).durationMinutes(120).active(true).build());
        LocalDate start = LocalDate.now(clock).plusWeeks(2);
        ClassGroup c = classes.saveAndFlush(ClassGroup.builder().course(course).classCode(UUID.randomUUID().toString())
            .classType(ClassType.ONE_ON_ONE).status(ClassStatus.ENROLLING).enrollmentDeadline(start.minusDays(3))
            .deliveryMode(DeliveryMode.OFFLINE).schedulePattern(SchedulePattern.MON_WED_FRI).timeSlot(TimeSlot.SLOT_EVENING)
            .startDate(start).totalSessions(2).maxStudents(1).build());
        for (int i=0;i<2;i++) sessions.saveAndFlush(Session.builder().classGroupId(c.getId()).sessionNumber(i+1)
            .sessionDate(start.plusDays(2L*i)).startTime(LocalTime.of(hour,0)).endTime(LocalTime.of(hour+2,0))
            .status(SessionStatus.SCHEDULED).build());
        return c;
    }
    String token(User user) { return "Bearer "+jwt.generateToken(Map.of(), user); }
    JsonNode request(String method, String path, Object body, User actor, String key, int expected) throws Exception {
        var b = switch(method) { case "POST" -> post(path); case "DELETE" -> delete(path); default -> get(path); };
        if(actor!=null) b.header("Authorization",token(actor));
        if(key!=null) b.header("Idempotency-Key",key);
        if(body!=null) b.contentType("application/json").content(json.writeValueAsString(body));
        b.header("Origin","https://frontend.test.invalid");
        return json.readTree(http.perform(b).andExpect(status().is(expected)).andReturn().getResponse().getContentAsString()).path("data");
    }
    long topup(int amount) throws Exception {
        return request("POST","/api/v1/wallet/topups",Map.of("amount",amount),student,UUID.randomUUID().toString(),201).path("topupId").asLong();
    }
    long quote(ClassGroup c) throws Exception {
        return request("POST","/api/v1/payment-intents",Map.of("classGroupId",c.getId()),student,UUID.randomUUID().toString(),201).path("intentId").asLong();
    }
    Map<String,String> callback(long id, String code) {
        WalletTopupIntent t=topups.findById(id).orElseThrow();
        var f = new TreeMap<String,String>();
        f.put("vnp_TmnCode","TEST0001"); f.put("vnp_TxnRef",t.getReference());
        f.put("vnp_Amount",t.getAmount().multiply(BigDecimal.valueOf(100)).toPlainString());
        f.put("vnp_ResponseCode",code); f.put("vnp_TransactionStatus",code);
        f.put("vnp_TransactionNo",Long.toString(NUMBERS.incrementAndGet()));
        f.put("vnp_PayDate",VnpayPaymentService.date(OffsetDateTime.now(clock))); return f;
    }
    String hash(String text) throws Exception {
        Mac mac=Mac.getInstance("HmacSHA512");
        mac.init(new SecretKeySpec(SECRET.getBytes(StandardCharsets.UTF_8),"HmacSHA512"));
        return HexFormat.of().formatHex(mac.doFinal(text.getBytes(StandardCharsets.UTF_8)));
    }
    MultiValueMap<String,String> signed(Map<String,String> fields) throws Exception {
        var result=new LinkedMultiValueMap<String,String>(); fields.forEach(result::add);
        String query=new TreeMap<>(fields).entrySet().stream().map(e -> URLEncoder.encode(e.getKey(),StandardCharsets.UTF_8)+"="
            +URLEncoder.encode(e.getValue(),StandardCharsets.UTF_8)).collect(Collectors.joining("&"));
        result.add("vnp_SecureHash",hash(query)); return result;
    }
    void ipn(Map<String,String> f,String expected) throws Exception {
        http.perform(get("/api/v1/payments/vnpay/ipn").params(signed(f))).andExpect(status().isOk()).andExpect(jsonPath("$.RspCode").value(expected));
    }
    void fund(int amount) throws Exception { ipn(callback(topup(amount),"00"),"00"); }
    void balance(String amount) { assertThat(wallet.view(student).balance()).isEqualByComparingTo(amount); }
    long pay(long id) throws Exception {
        return request("POST","/api/v1/payment-intents/"+id+"/wallet",null,student,"pay-"+id,200).path("payment").path("paymentId").asLong();
    }

    @Test void lazyWalletAndPermissions() throws Exception {
        var first=request("GET","/api/v1/wallet",null,student,null,200);
        assertThat(first.path("balance").asLong()).isZero();
        assertThat(request("GET","/api/v1/wallet",null,student,null,200)).isEqualTo(first);
        assertThat(request("GET","/api/v1/wallet/transactions",null,student,null,200).path("totalElements").asInt()).isZero();
        request("GET","/api/v1/wallet",null,admin,null,403);
        request("GET","/api/v1/wallet",null,null,null,401);
        request("GET","/api/v1/wallet/transactions?size=101",null,student,null,400);
        User disabled=user("STUDENT"); disabled.setEnabled(false); users.saveAndFlush(disabled);
        request("GET","/api/v1/wallet",null,disabled,null,403);
    }
    @Test void topupIsBoundToAmountKeyOriginAndOwner() throws Exception {
        String key=UUID.randomUUID().toString();
        var t=request("POST","/api/v1/wallet/topups",Map.of("amount",10000),student,key,201);
        var replay=request("POST","/api/v1/wallet/topups",Map.of("amount",10000),student,key,201);
        for (String field : List.of("topupId","amount","status","reference","paymentUrl")) {
            assertThat(replay.path(field)).isEqualTo(t.path(field));
        }
        assertThat(OffsetDateTime.parse(replay.path("expiresAt").asText()).toInstant())
            .isEqualTo(OffsetDateTime.parse(t.path("expiresAt").asText()).toInstant());
        request("POST","/api/v1/wallet/topups",Map.of("amount",20000),student,key,409);
        for(Object amount:List.of(9999,50000001,-1,0,new BigDecimal("10000.1"))) {
            request("POST","/api/v1/wallet/topups",Map.of("amount",amount),student,UUID.randomUUID().toString(),400);
        }
        request("POST","/api/v1/wallet/topups",Map.of("amount",10000),student,null,400);
        request("GET","/api/v1/wallet/topups/"+t.path("topupId").asLong(),null,other,null,403);
        http.perform(post("/api/v1/wallet/topups").header("Authorization",token(student)).header("Idempotency-Key",UUID.randomUUID())
            .header("Origin","https://evil.test.invalid").contentType("application/json").content("{\"amount\":10000}"))
            .andExpect(status().isForbidden());
        String query=URI.create(t.path("paymentUrl").asText()).getRawQuery();
        int idx=query.indexOf("&vnp_SecureHash=");
        assertThat(query.substring(idx+16)).isEqualTo(hash(query.substring(0,idx)));
        assertThat(URLDecoder.decode(query,StandardCharsets.UTF_8)).contains("vnp_ReturnUrl=https://frontend.test.invalid/student/wallet");
    }
    @Test void browserReturnNeverCreditsAndIpnCreditsOnce() throws Exception {
        long id=topup(100000); var f=callback(id,"00");
        http.perform(get("/api/v1/wallet/vnpay/return").header("Authorization",token(student)).params(signed(f)))
            .andExpect(status().isOk()).andExpect(jsonPath("$.data.status").value("PENDING"));
        balance("0");
        http.perform(get("/api/v1/wallet/vnpay/return").header("Authorization",token(other)).params(signed(f))).andExpect(status().isForbidden());
        ipn(f,"00"); ipn(f,"02"); balance("100000");
        ipn(callback(id,"24"),"02"); balance("100000");
        var history=wallet.history(student,0,20);
        assertThat(history.getTotalElements()).isEqualTo(1);
        assertThat(history.getContent().getFirst().balanceAfter()).isEqualByComparingTo("100000");
    }
    @Test void invalidCallbacksNeverCredit() throws Exception {
        long id=topup(10000);
        var invalid=signed(callback(id,"00")); invalid.set("vnp_Amount","1");
        http.perform(get("/api/v1/payments/vnpay/ipn").params(invalid)).andExpect(jsonPath("$.RspCode").value("97"));
        var f=callback(id,"00"); f.put("vnp_Amount","1"); ipn(f,"04");
        f=callback(id,"00"); f.put("vnp_TmnCode","OTHER001"); ipn(f,"97");
        invalid=signed(callback(id,"00")); invalid.add("vnp_Amount","1000000");
        http.perform(get("/api/v1/payments/vnpay/ipn").params(invalid)).andExpect(jsonPath("$.RspCode").value("97"));
        f=callback(id,"00"); f.put("vnp_TransactionNo","0"); ipn(f,"97");
        f=callback(id,"00"); f.put("vnp_PayDate",VnpayPaymentService.date(OffsetDateTime.now(clock).plusMinutes(2))); ipn(f,"97");
        f=callback(id,"00"); f.put("vnp_TxnRef","WLT"+UUID.randomUUID().toString().replace("-","")); ipn(f,"01");
        balance("0"); assertThat(wallet.history(student,0,20).getTotalElements()).isZero();
    }
    @Test void lateAndPreviouslyFailedAuthenticMoneyIsStillCredited() throws Exception {
        long id=topup(10000); clock.value=clock.value.plusSeconds(16*60);
        assertThat(request("GET","/api/v1/wallet/topups/"+id,null,student,null,200).path("status").asText()).isEqualTo("EXPIRED");
        ipn(callback(id,"00"),"00"); balance("10000");
        long failed=topup(20000); ipn(callback(failed,"24"),"00"); ipn(callback(failed,"24"),"02"); balance("10000");
        ipn(callback(failed,"00"),"00"); balance("30000");
    }
    Map<String,Object> querydr(long id, String status, String transactionNo) throws Exception {
        var f=new HashMap<String,String>(callback(id,"00"));
        f.put("vnp_ResponseId",UUID.randomUUID().toString().replace("-","")); f.put("vnp_Command","querydr");
        f.put("vnp_Message","OK"); f.put("vnp_BankCode","NCB"); f.put("vnp_TransactionType","01");
        f.put("vnp_TransactionStatus",status); f.put("vnp_TransactionNo",transactionNo); f.put("vnp_OrderInfo","Wallet top-up "+id);
        f.put("vnp_SecureHash",hash(VnpayApiClient.join(f,List.of("vnp_ResponseId","vnp_Command","vnp_ResponseCode","vnp_Message",
            "vnp_TmnCode","vnp_TxnRef","vnp_Amount","vnp_BankCode","vnp_PayDate","vnp_TransactionNo","vnp_TransactionType",
            "vnp_TransactionStatus","vnp_OrderInfo","vnp_PromotionCode","vnp_PromotionAmount"))));
        return new HashMap<>(f);
    }
    JsonNode reconcile(long id, User actor, int expected) throws Exception {
        return request("POST","/api/v1/wallet/topups/"+id+"/reconcile",null,actor,null,expected);
    }
    @Test void missedIpnIsRecoveredOnceThroughQuerydr() throws Exception {
        long id=topup(50000); clock.value=clock.value.plusSeconds(20*60);
        String no=Long.toString(NUMBERS.incrementAndGet());
        gateway.reply=querydr(id,"00",no);
        reconcile(id,other,403); balance("0");
        assertThat(reconcile(id,student,200).path("status").asText()).isEqualTo("COMPLETED");
        assertThat(reconcile(id,student,200).path("status").asText()).isEqualTo("COMPLETED");
        balance("50000"); assertThat(wallet.history(student,0,20).getTotalElements()).isEqualTo(1);
        var late=callback(id,"00"); late.put("vnp_TransactionNo",no); ipn(late,"02"); balance("50000");
    }
    @Test void unpaidOrForgedQuerydrNeverCredits() throws Exception {
        long id=topup(10000);
        gateway.reply=querydr(id,"01",Long.toString(NUMBERS.incrementAndGet()));
        assertThat(reconcile(id,student,200).path("status").asText()).isEqualTo("PENDING");
        var wrongAmount=querydr(id,"00",Long.toString(NUMBERS.incrementAndGet()));
        wrongAmount.put("vnp_Amount","100"); wrongAmount.put("vnp_SecureHash",hash("forged"));
        gateway.reply=wrongAmount; reconcile(id,student,502);
        balance("0"); assertThat(topups.findById(id).orElseThrow().getStatus()).isEqualTo("PENDING");
        ipn(callback(id,"00"),"00"); balance("10000");
    }
    @Test void pendingTopupCanStillBeReadWhenGatewayIsDisabled() throws Exception {
        long id=topup(10000);
        try {
            vnpay.setEnabled(false);
            var value=request("GET","/api/v1/wallet/topups/"+id,null,student,null,200);
            assertThat(value.path("status").asText()).isEqualTo("PENDING");
            assertThat(value.path("paymentUrl").isMissingNode() || value.path("paymentUrl").isNull()).isTrue();
            request("POST","/api/v1/wallet/topups",Map.of("amount",10000),student,"disabled",503);
        } finally { vnpay.setEnabled(true); }
    }
    @Test void simultaneousDuplicateCallbacksProduceOneCredit() throws Exception {
        long id=topup(100000); var f=signed(callback(id,"00"));
        var codes=race(() -> topupService.ipn(f).code(), () -> topupService.ipn(f).code());
        assertThat(codes).containsExactlyInAnyOrder("00","02"); balance("100000");
        assertThat(wallet.history(student,0,20).getTotalElements()).isEqualTo(1);
    }
    @Test void simultaneousIndependentTopupsNeverLoseBalance() throws Exception {
        var one=signed(callback(topup(10000),"00")); var two=signed(callback(topup(20000),"00"));
        assertThat(race(() -> topupService.ipn(one).code(), () -> topupService.ipn(two).code())).containsOnly("00");
        balance("30000"); assertThat(wallet.history(student,0,20).getTotalElements()).isEqualTo(2);
    }
    @Test void walletPaymentAndStudentRefundWorkWithMockDisabledAndReplay() throws Exception {
        fund(200000); long id=quote(group); long paymentId=pay(id);
        assertThat(pay(id)).isEqualTo(paymentId); balance("100000");
        assertThat(payments.findById(paymentId).orElseThrow().getMethod()).isEqualTo("WALLET");
        Enrollment e=enrollments.findByPaymentId(paymentId).orElseThrow();
        assertThat(learning.findByEnrollmentId(e.getId()).orElseThrow().getStatus()).isEqualTo(LearningScheduleStatus.ACTIVE);
        request("DELETE","/api/v1/enrollments/"+e.getId(),Map.of("reason","Đổi kế hoạch"),student,null,200);
        request("DELETE","/api/v1/enrollments/"+e.getId(),Map.of("reason","Đổi kế hoạch"),student,null,200);
        balance("200000"); assertThat(wallet.history(student,0,20).getTotalElements()).isEqualTo(3);
        assertThat(learning.findByEnrollmentId(e.getId()).orElseThrow().getStatus()).isEqualTo(LearningScheduleStatus.CANCELLED);
        request("POST","/api/v1/payment-intents/"+id+"/vnpay",null,student,null,422);
    }
    @Test void adminRefundCreditsOriginalOwnerOnce() throws Exception {
        fund(100000); long pid=pay(quote(group));
        long eid=enrollments.findByPaymentId(pid).orElseThrow().getId();
        String path="/api/v1/admin/enrollments/"+eid+"/refund";
        request("POST",path,Map.of("reason","Hủy lớp","refundPercentage",100),admin,"refund-key",200);
        request("POST",path,Map.of("reason","Hủy lớp","refundPercentage",100),admin,"refund-key",200);
        request("POST",path,Map.of("reason","Hủy lớp","refundPercentage",50),admin,"other-refund",409);
        balance("100000"); assertThat(wallet.view(other).balance()).isZero();
    }
    @Test void adminExceptionCanRefundPartOfWalletTuitionAfterAssignment() throws Exception {
        fund(100000); long pid=pay(quote(group));
        long eid=enrollments.findByPaymentId(pid).orElseThrow().getId();
        group.setStatus(ClassStatus.ASSIGNED); classes.saveAndFlush(group);
        request("POST","/api/v1/admin/enrollments/"+eid+"/refund",Map.of("reason","Ngoại lệ đã duyệt","refundPercentage",50),admin,"partial",200);
        balance("50000");
        assertThat(payments.findById(pid).orElseThrow().getStatus()).isEqualTo(PaymentStatus.PARTIALLY_REFUNDED);
        assertThat(enrollments.findById(eid).orElseThrow().getStatus()).isEqualTo(EnrollmentStatus.REFUNDED);
    }
    @Autowired ClassDiscountSettlementService discountSettlement;
    @Autowired org.springframework.transaction.support.TransactionTemplate transactions;
    long payAs(User actor, ClassGroup c) throws Exception {
        long topupId=request("POST","/api/v1/wallet/topups",Map.of("amount",100000),actor,UUID.randomUUID().toString(),201).path("topupId").asLong();
        ipn(callback(topupId,"00"),"00");
        long id=request("POST","/api/v1/payment-intents",Map.of("classGroupId",c.getId()),actor,UUID.randomUUID().toString(),201).path("intentId").asLong();
        return request("POST","/api/v1/payment-intents/"+id+"/wallet",null,actor,"pay-"+id,200).path("payment").path("paymentId").asLong();
    }
    @Test void groupDiscountUsesLockedPriceAndIsNotRefundedTwice() throws Exception {
        group.setClassType(ClassType.GROUP); group.setMaxStudents(8); classes.saveAndFlush(group);
        long pid=payAs(student,group); payAs(other,group);
        // A later course price cut must not enlarge the discount on the fee already paid (BR-02.04).
        Course course=group.getCourse(); course.setBasePrice1on1(new BigDecimal("50000")); courses.saveAndFlush(course);
        group.setStatus(ClassStatus.ASSIGNED); classes.saveAndFlush(group);
        transactions.executeWithoutResult(t -> discountSettlement.settle(classes.findById(group.getId()).orElseThrow()));
        balance("20000");
        long eid=enrollments.findByPaymentId(pid).orElseThrow().getId();
        request("POST","/api/v1/admin/enrollments/"+eid+"/refund",Map.of("reason","Hủy lớp","refundPercentage",100),admin,"full",200);
        // 20 000 discount credit + 80 000 refund = the 100 000 paid, never more.
        balance("100000");
        assertThat(payments.findById(pid).orElseThrow().getRefundedAmount()).isEqualByComparingTo("80000");
    }
    @Test void insufficientBalanceRollsBackAllPaymentAndEnrollmentWrites() throws Exception {
        long id=quote(group);
        request("POST","/api/v1/payment-intents/"+id+"/wallet",null,student,"insufficient",409);
        assertThat(payments.findByIntentId(id)).isEmpty();
        assertThat(intents.findById(id).orElseThrow().getStatus()).isEqualTo(PaymentIntentStatus.PENDING);
        balance("0"); assertThat(wallet.history(student,0,20).getTotalElements()).isZero();
        fund(100000); pay(id); balance("0");
    }
    @Test void walletCannotPayForeignExpiredCancelledOrRepricedIntents() throws Exception {
        fund(200000); long id=quote(group);
        request("POST","/api/v1/payment-intents/"+id+"/wallet",null,other,"foreign",403);
        request("DELETE","/api/v1/payment-intents/"+id,null,student,null,200);
        request("POST","/api/v1/payment-intents/"+id+"/wallet",null,student,"cancelled",422);
        long expired=quote(group); clock.value=clock.value.plusSeconds(301);
        request("POST","/api/v1/payment-intents/"+expired+"/wallet",null,student,"expired",422);
        long changed=quote(group);
        Course c=courses.findById(group.getCourseId()).orElseThrow(); c.setBasePrice1on1(new BigDecimal("110000")); courses.saveAndFlush(c);
        request("POST","/api/v1/payment-intents/"+changed+"/wallet",null,student,"changed",409);
        balance("200000"); assertThat(wallet.history(student,0,20).getTotalElements()).isEqualTo(1);
    }
    @Test void fullClassOrConflictingScheduleNeverDebitsWallet() throws Exception {
        fund(200000); long id=quote(group); long overlapping=quote(newClass(18));
        pay(id);
        request("POST","/api/v1/payment-intents/"+overlapping+"/wallet",null,student,"overlap",409);
        balance("100000");
        ClassGroup full=newClass(14); long fullIntent=quote(full);
        full.setStatus(ClassStatus.ASSIGNED); classes.saveAndFlush(full);
        request("POST","/api/v1/payment-intents/"+fullIntent+"/wallet",null,student,"closed",422);
        balance("100000");
    }
    @Test void sameIntentConfirmedSimultaneouslyDebitsOnce() throws Exception {
        fund(100000); long id=quote(group);
        var ids=race(() -> walletPayment.confirm(id,"one",student).payment().paymentId(),
                     () -> walletPayment.confirm(id,"two",student).payment().paymentId());
        assertThat(ids.get(0)).isEqualTo(ids.get(1)); balance("0");
        assertThat(wallet.history(student,0,20).getTotalElements()).isEqualTo(2);
    }
    @Test void independentConcurrentPaymentsCannotOverspend() throws Exception {
        fund(100000); long one=quote(group), two=quote(newClass(14));
        var outcomes=race(() -> outcome(() -> walletPayment.confirm(one,"one",student)),
                          () -> outcome(() -> walletPayment.confirm(two,"two",student)));
        assertThat(outcomes).containsExactlyInAnyOrder("OK","WALLET_INSUFFICIENT_FUNDS");
        balance("0"); assertThat(wallet.history(student,0,20).getTotalElements()).isEqualTo(2);
    }
    @Test void walletAndDirectVnpayRaceBindOnlyOneMethod() throws Exception {
        fund(100000); long id=quote(group);
        var outcomes=race(() -> outcome(() -> walletPayment.confirm(id,"wallet",student)),
            () -> outcome(() -> directPayment.checkout(id,student,"https://frontend.test.invalid","127.0.0.1")));
        assertThat(outcomes.stream().filter("OK"::equals).count()).isEqualTo(1);
        var p=payments.findByIntentId(id);
        if(p.isPresent()) { assertThat(p.get().getMethod()).isEqualTo("WALLET"); balance("0"); }
        else {
            assertThat(intents.findById(id).orElseThrow().getVnpayReference()).isNotNull();
            request("POST","/api/v1/payment-intents/"+id+"/wallet",null,student,"blocked",409); balance("100000");
        }
    }
    String outcome(Callable<?> action) throws Exception {
        try { action.call(); return "OK"; }
        catch(com.viettritutor.common.exception.BusinessException e) { return e.getErrorCode().name(); }
    }
    <T> List<T> race(Callable<T> a, Callable<T> b) throws Exception {
        ExecutorService pool=Executors.newFixedThreadPool(2);
        CountDownLatch ready=new CountDownLatch(2), start=new CountDownLatch(1);
        try {
            var one=pool.submit(() -> { ready.countDown(); start.await(); return a.call(); });
            var two=pool.submit(() -> { ready.countDown(); start.await(); return b.call(); });
            assertThat(ready.await(5,TimeUnit.SECONDS)).isTrue(); start.countDown();
            return List.of(one.get(15,TimeUnit.SECONDS),two.get(15,TimeUnit.SECONDS));
        } finally { start.countDown(); pool.shutdownNow(); }
    }
}
