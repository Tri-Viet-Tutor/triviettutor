package com.viettritutor.controller;

import com.fasterxml.jackson.databind.*;
import com.viettritutor.CartTestFixtures;
import com.viettritutor.entity.*;
import com.viettritutor.enums.*;
import com.viettritutor.repository.*;
import com.viettritutor.service.*;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.*;
import org.springframework.boot.test.mock.mockito.*;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.context.annotation.Import;
import org.springframework.http.*;
import org.springframework.test.context.*;
import java.time.*;
import java.util.*;
import java.util.concurrent.*;
import java.util.concurrent.atomic.AtomicInteger;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/** Separate HTTP transactions exercise commit, rollback and competing requests. */
@SpringBootTest(webEnvironment=SpringBootTest.WebEnvironment.RANDOM_PORT,properties={
    "spring.jpa.hibernate.ddl-auto=create-drop","spring.flyway.enabled=false",
    "spring.datasource.driver-class-name=org.h2.Driver","spring.jpa.show-sql=false",
    "spring.datasource.url=jdbc:h2:mem:cart-http;MODE=PostgreSQL;DB_CLOSE_DELAY=-1;LOCK_TIMEOUT=15000",
    "spring.datasource.username=sa","spring.datasource.password=",
    "logging.level.root=WARN","app.payments.mock-enabled=true"})
@ActiveProfiles("test")
@Import(CartTestFixtures.class)
class CartOrderHttpTest {
    static final String PASSWORD=UUID.randomUUID().toString(), SECRET=UUID.randomUUID().toString()+UUID.randomUUID();
    @DynamicPropertySource static void properties(DynamicPropertyRegistry r) {
        r.add("app.jwt.secret",()->SECRET);
        r.add("cart.test.password",()->PASSWORD);
        r.add("cart.test.email-domain",()->"cart-http.invalid");
    }
    @MockBean SessionLifecycleJob lifecycle;
    @MockBean AttendanceLockJob attendance;
    @MockBean MockPaymentGateway gateway;
    @SpyBean LearningScheduleService learning;
    @SpyBean MockPaymentPolicy policy;
    @Autowired TestRestTemplate http;
    @Autowired ObjectMapper json;
    @Autowired CartTestFixtures fixtures;
    @Autowired OrderRepository orders;
    @Autowired PaymentRepository payments;
    @Autowired EnrollmentRepository enrollments;
    @Autowired ClassGroupRepository classes;
    @Autowired PaymentIntentRepository intents;
    @Autowired LearningScheduleRepository schedules;
    CartTestFixtures.Data f;
    final Map<String,String> tokens=new HashMap<>();
    @BeforeEach void setup() throws Exception {
        http.getRestTemplate().setRequestFactory(new org.springframework.http.client.JdkClientHttpRequestFactory());
        f=fixtures.seed();
        when(gateway.confirm()).thenReturn(true);
        for(var entry:Map.of("admin",f.admin(),"tutor",f.tutor(),"student",f.student(),"other",f.other()).entrySet()) {
            var login=call("POST","/api/v1/auth/login",Map.of("email",entry.getValue().getEmail(),"password",PASSWORD),null,null,200);
            tokens.put(entry.getKey(),login.path("accessToken").asText());
            assertFalse(tokens.get(entry.getKey()).isBlank());
        }
    }
    ResponseEntity<String> request(String method,String path,Object body,String role,String key) {
        var headers=new HttpHeaders(); headers.setContentType(MediaType.APPLICATION_JSON);
        if(role!=null)headers.setBearerAuth(tokens.get(role));
        if(key!=null)headers.set("Idempotency-Key",key);
        return http.exchange(path,HttpMethod.valueOf(method),new HttpEntity<>(body,headers),String.class);
    }
    JsonNode call(String method,String path,Object body,String role,String key,int expected) throws Exception {
        var response=request(method,path,body,role,key);
        assertEquals(expected,response.getStatusCode().value(),method+" "+path+" "+response.getBody());
        return json.readTree(response.getBody()).path("data");
    }
    JsonNode checkout(String role,ClassGroup... selected) throws Exception {
        JsonNode cart=null;
        for(var group:selected)cart=call("POST","/api/v1/cart/items",Map.of("subjectId",group.getCourse().getSubjectId()),role,null,200);
        List<Map<String,Long>> pairs=new ArrayList<>();
        for(var item:cart.path("items")) {
            var group=Arrays.stream(selected).filter(g->g.getCourse().getSubjectId()==item.path("subjectId").asLong()).findFirst().orElseThrow();
            pairs.add(Map.of("cartItemId",item.path("id").asLong(),"classId",group.getId()));
        }
        return call("POST","/api/v1/orders/checkout",Map.of("cartVersion",cart.path("cartVersion").asLong(),"items",pairs),role,UUID.randomUUID().toString(),200);
    }
    String payPath(long id){return "/api/v1/orders/"+id+"/payments/mock";}
    List<ResponseEntity<String>> race(Callable<ResponseEntity<String>> a,Callable<ResponseEntity<String>> b) throws Exception {
        var barrier=new CyclicBarrier(2);
        try(var pool=Executors.newFixedThreadPool(2)) {
            var first=pool.submit(()->{barrier.await(10,TimeUnit.SECONDS);return a.call();});
            var second=pool.submit(()->{barrier.await(10,TimeUnit.SECONDS);return b.call();});
            return List.of(first.get(30,TimeUnit.SECONDS),second.get(30,TimeUnit.SECONDS));
        }
    }
    @Test void swaggerAndEveryEndpointWithRoleMatrix() throws Exception {
        assertEquals(200,http.getForEntity("/swagger-ui/index.html",String.class).getStatusCode().value());
        var paths=json.readTree(http.getForObject("/api-docs",String.class)).path("paths");
        String[][] routes={{"GET","/cart"},{"POST","/cart/items"},{"DELETE","/cart/items/{itemId}"},
            {"DELETE","/cart/items"},{"POST","/orders/checkout"},{"GET","/orders/my"},
            {"GET","/orders/{orderId}"},{"POST","/orders/{orderId}/payments/mock"},
            {"POST","/orders/{orderId}/cancel"},{"GET","/admin/orders"}};
        for(var route:routes) {
            assertTrue(paths.path("/api/v1"+route[1]).has(route[0].toLowerCase()),Arrays.toString(route));
            var path="/api/v1"+route[1].replace("{itemId}","1").replace("{orderId}","1");
            call(route[0],path,Map.of(),null,null,401);
            call(route[0],path,Map.of(),"tutor",null,403);
            if(!route[1].equals("/admin/orders") && !route[1].equals("/orders/{orderId}"))
                call(route[0],path,Map.of(),"admin",null,403);
        }
        call("GET","/api/v1/admin/orders",null,"student",null,403);
        var order=checkout("student",f.a(),f.b()); long id=order.path("id").asLong();
        assertEquals(2000000,order.path("totalAmount").asLong());
        call("GET","/api/v1/orders/"+id,null,"other",null,403);
        call("GET","/api/v1/orders/"+id,null,"admin",null,200);
        call("GET","/api/v1/admin/orders?studentId="+f.student().getId(),null,"admin",null,200);
        call("GET","/api/v1/orders/my",null,"student",null,200);
        var paid=call("POST",payPath(id),null,"student","pay",200);
        assertEquals("PAID",paid.path("status").asText());
        assertEquals(paid,call("POST",payPath(id),null,"student","pay",200));
        var second=checkout("other",f.a());
        call("POST","/api/v1/orders/"+second.path("id").asLong()+"/cancel",Map.of("reason","Changed plan"),"other","cancel",200);
        var cart=call("GET","/api/v1/cart",null,"other",null,200);
        call("DELETE","/api/v1/cart/items/"+cart.path("items").get(0).path("id").asLong(),null,"other",null,200);
        call("DELETE","/api/v1/cart/items",null,"other",null,200);
    }
    @Test void concurrentPaymentsChargeOnceAndReturnCompleteItems() throws Exception {
        long id=checkout("student",f.a(),f.b()).path("id").asLong();
        var responses=race(()->request("POST",payPath(id),null,"student","pay-a"),()->request("POST",payPath(id),null,"student","pay-b"));
        for(var response:responses) {
            assertEquals(200,response.getStatusCode().value(),response.getBody());
            for(var item:json.readTree(response.getBody()).path("data").path("items"))assertTrue(item.path("enrollmentId").asLong()>0);
        }
        assertEquals(2,payments.findByOrderIdOrderById(id).size());
        verify(gateway,times(1)).confirm();
    }
    @Test void concurrentPaymentAndCancellationHaveOneWinner() throws Exception {
        long id=checkout("student",f.a()).path("id").asLong();
        var responses=race(()->request("POST",payPath(id),null,"student","pay"),
            ()->request("POST","/api/v1/orders/"+id+"/cancel",Map.of("reason","race"),"student","cancel"));
        assertEquals(List.of(200,422),responses.stream().map(r->r.getStatusCode().value()).sorted().toList());
        var order=orders.findById(id).orElseThrow();
        assertTrue(Set.of(OrderStatus.PAID,OrderStatus.CANCELLED).contains(order.getStatus()));
        assertEquals(order.getStatus()==OrderStatus.PAID?1:0,payments.findByOrderIdOrderById(id).size());
    }
    @Test void competingStudentsCannotBuyTheLastSeatTwice() throws Exception {
        f.a().setClassType(ClassType.ONE_ON_ONE);f.a().setMaxStudents(1);classes.saveAndFlush(f.a());
        long a=checkout("student",f.a()).path("id").asLong(), b=checkout("other",f.a()).path("id").asLong();
        var responses=race(()->request("POST",payPath(a),null,"student","a"),()->request("POST",payPath(b),null,"other","b"));
        assertEquals(List.of(200,409),responses.stream().map(r->r.getStatusCode().value()).sorted().toList());
        assertEquals(1,schedules.findByClassGroupIdAndStatusOrderByStudentIdAscIdAsc(f.a().getId(),LearningScheduleStatus.ACTIVE).size());
        verify(gateway,times(1)).confirm();
    }
    @Test void sameStudentCannotPayOverlappingOrdersConcurrently() throws Exception {
        long a=checkout("student",f.a()).path("id").asLong();
        call("DELETE","/api/v1/cart/items",null,"student",null,200);
        long b=checkout("student",f.overlap()).path("id").asLong();
        var responses=race(()->request("POST",payPath(a),null,"student","a"),()->request("POST",payPath(b),null,"student","b"));
        assertEquals(List.of(200,409),responses.stream().map(r->r.getStatusCode().value()).sorted().toList());
        verify(gateway,times(1)).confirm();
    }
    @Test void failureOnSecondEnrollmentRollsBackFirstEnrollmentAndPayments() throws Exception {
        long id=checkout("student",f.a(),f.b()).path("id").asLong();
        long before=enrollments.count();var calls=new AtomicInteger();
        doAnswer(invocation->{if(calls.incrementAndGet()==2)throw new IllegalStateException("Injected second enrollment failure");return invocation.callRealMethod();})
            .when(learning).activate(anyLong(),anyLong(),anyLong(),any(),any());
        call("POST",payPath(id),null,"student","rollback",500);
        assertEquals(2,calls.get());assertEquals(before,enrollments.count());
        assertTrue(payments.findByOrderIdOrderById(id).isEmpty());
        assertEquals(OrderStatus.PENDING_PAYMENT,orders.findById(id).orElseThrow().getStatus());
        assertTrue(schedules.findByClassGroupIdAndStatusOrderByStudentIdAscIdAsc(f.a().getId(),LearningScheduleStatus.ACTIVE).isEmpty());
        assertEquals(2,call("GET","/api/v1/cart",null,"student",null,200).path("items").size());
        doCallRealMethod().when(learning).activate(anyLong(),anyLong(),anyLong(),any(),any());
        assertEquals("PAID",call("POST",payPath(id),null,"student","rollback",200).path("status").asText());
    }
    @Test void fullSecondClassPreventsAllEnrollment() throws Exception {
        f.b().setClassType(ClassType.ONE_ON_ONE);f.b().setMaxStudents(1);classes.saveAndFlush(f.b());
        long id=checkout("student",f.a(),f.b()).path("id").asLong();
        long other=checkout("other",f.b()).path("id").asLong();
        call("POST",payPath(other),null,"other","other",200);
        call("POST",payPath(id),null,"student","student",409);
        assertTrue(payments.findByOrderIdOrderById(id).isEmpty());
        assertTrue(schedules.findByClassGroupIdAndStatusOrderByStudentIdAscIdAsc(f.a().getId(),LearningScheduleStatus.ACTIVE).isEmpty());
    }
    void reserve(User student,ClassGroup group) {
        intents.saveAndFlush(PaymentIntent.builder().studentId(student.getId()).classGroupId(group.getId()).courseId(group.getCourseId())
            .amount(group.getCourse().getBasePrice1on1()).status(PaymentIntentStatus.PENDING).createdAt(OffsetDateTime.now())
            .expiresAt(OffsetDateTime.now().plusMinutes(10)).vnpayReference(UUID.randomUUID().toString()).build());
    }
    @Test void vnpayReservationTakesLastSeatBeforePayment() throws Exception {
        f.b().setClassType(ClassType.ONE_ON_ONE);f.b().setMaxStudents(1);classes.saveAndFlush(f.b());
        long id=checkout("student",f.a(),f.b()).path("id").asLong();reserve(f.other(),f.b());
        call("POST",payPath(id),null,"student","reserved",409);verify(gateway,never()).confirm();
    }
    @Test void vnpayReservationBlocksOverlappingStudentSchedule() throws Exception {
        long id=checkout("student",f.a()).path("id").asLong();reserve(f.student(),f.overlap());
        call("POST",payPath(id),null,"student","overlap",409);verify(gateway,never()).confirm();
    }
    @Test void disabledMockPolicyBlocksBeforeCreatingPayments() throws Exception {
        long id=checkout("student",f.a()).path("id").asLong();
        doThrow(new com.viettritutor.common.exception.BusinessException(com.viettritutor.common.exception.ErrorCode.PAYMENT_MOCK_DISABLED)).when(policy).requireEnabled();
        call("POST",payPath(id),null,"student","disabled",422);assertTrue(payments.findByOrderIdOrderById(id).isEmpty());
        verify(gateway,never()).confirm();
    }
}
