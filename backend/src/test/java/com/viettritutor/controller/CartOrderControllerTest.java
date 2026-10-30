package com.viettritutor.controller;
import com.fasterxml.jackson.databind.*;
import com.viettritutor.CartTestFixtures;
import com.viettritutor.entity.*;
import com.viettritutor.enums.*;
import com.viettritutor.repository.*;
import com.viettritutor.security.jwt.JwtService;
import com.viettritutor.service.*;
import org.junit.jupiter.api.*;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.http.*;
import org.springframework.test.context.*;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;
import jakarta.persistence.EntityManager;
import java.math.BigDecimal;
import java.time.*;
import java.util.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;

@SpringBootTest(properties={"spring.jpa.hibernate.ddl-auto=create-drop","spring.flyway.enabled=false",
 "spring.datasource.driver-class-name=org.h2.Driver","spring.jpa.show-sql=false","logging.level.root=WARN","app.payments.mock-enabled=true"})
@ActiveProfiles("test") @AutoConfigureMockMvc @Transactional @Import(CartTestFixtures.class)
class CartOrderControllerTest {
 static final String SECRET=UUID.randomUUID().toString()+UUID.randomUUID(),PASSWORD=UUID.randomUUID().toString();
 @DynamicPropertySource static void config(DynamicPropertyRegistry r){
  r.add("spring.datasource.url",()->"jdbc:h2:mem:cart-order;MODE=PostgreSQL;DB_CLOSE_DELAY=-1");r.add("spring.datasource.username",()->"sa");r.add("spring.datasource.password",()->"");
  r.add("app.jwt.secret",()->SECRET);r.add("cart.test.password",()->PASSWORD);r.add("cart.test.email-domain",()->"cart-test.invalid");
 }
 @MockBean SessionLifecycleJob lifecycle;@MockBean AttendanceLockJob attendance;@MockBean MockPaymentGateway gateway;
 @Autowired MockMvc mvc;@Autowired ObjectMapper json;@Autowired CartTestFixtures fixtures;@Autowired JwtService jwt;
 @Autowired CartRepository carts;@Autowired CartItemRepository cartItems;@Autowired OrderRepository orders;@Autowired OrderItemRepository orderItems;
 @Autowired PaymentRepository payments;@Autowired EnrollmentRepository enrollments;@Autowired PaymentIntentRepository intents;
 @Autowired CourseRepository courses;@Autowired ClassGroupRepository classes;@Autowired SessionRepository sessions;@Autowired LearningScheduleRepository schedules;
 @Autowired SubjectService subjects;@Autowired EntityManager em;@Autowired Clock clock;
 CartTestFixtures.Data f;
 @BeforeEach void setup(){f=fixtures.seed();when(gateway.confirm()).thenReturn(true);}
 JsonNode call(String method,String uri,Object body,User actor,String key,int expected)throws Exception{
  var request=request(HttpMethod.valueOf(method),uri).contentType(MediaType.APPLICATION_JSON);
  if(actor!=null)request.header("Authorization","Bearer "+jwt.generateToken(Map.of(), org.springframework.security.core.userdetails.User.withUsername(actor.getEmail()).password(actor.getPassword()).authorities(actor.getRole()).build()));
  if(key!=null)request.header("Idempotency-Key",key);
  if(body!=null)request.content(body instanceof String?(String)body:json.writeValueAsString(body));
  var response=mvc.perform(request).andReturn().getResponse();assertEquals(expected,response.getStatus(),method+" "+uri+" "+response.getContentAsString());
  var tree=json.readTree(response.getContentAsString());assertEquals(expected<400,tree.path("success").asBoolean());return expected<400?tree.path("data"):tree;
 }
 JsonNode add(Long subject,User student)throws Exception{return call("POST","/api/v1/cart/items",Map.of("subjectId",subject),student,null,200);}
 JsonNode cart()throws Exception{return call("GET","/api/v1/cart",null,f.student(),null,200);}
 Map<String,Object> checkoutBody()throws Exception{
  var c=cart();List<Map<String,Long>> selections=new ArrayList<>();for(var i:c.path("items"))selections.add(Map.of("cartItemId",i.path("id").asLong(),"classId",i.path("subjectId").asLong()==f.math().getSubjectId()?f.a().getId():f.b().getId()));
  return Map.of("cartVersion",c.path("cartVersion").asLong(),"items",selections);
 }
 JsonNode order()throws Exception{add(f.math().getSubjectId(),f.student());add(f.science().getSubjectId(),f.student());return call("POST","/api/v1/orders/checkout",checkoutBody(),f.student(),"checkout",200);}
 JsonNode pay(long id,String key,int status)throws Exception{return call("POST","/api/v1/orders/"+id+"/payments/mock",null,f.student(),key,status);}
 JsonNode detail(long id)throws Exception{return call("GET","/api/v1/orders/"+id,null,f.student(),null,200);}
 @Test void emptyCartIsReadOnly()throws Exception{long before=carts.count();assertEquals(0,cart().path("items").size());assertEquals(before,carts.count());}
 @Test void addDuplicateAndClearAreStable()throws Exception{var a=add(f.math().getSubjectId(),f.student());assertEquals(a,add(f.math().getSubjectId(),f.student()));assertEquals(1,a.path("cartVersion").asInt());call("DELETE","/api/v1/cart/items",null,f.student(),null,200);var empty=cart();assertEquals(empty,call("DELETE","/api/v1/cart/items",null,f.student(),null,200));}
 @Test void removeChecksOwnership()throws Exception{long id=add(f.math().getSubjectId(),f.student()).path("items").get(0).path("id").asLong();call("DELETE","/api/v1/cart/items/"+id,null,f.other(),null,403);call("DELETE","/api/v1/cart/items/"+id,null,f.student(),null,200);assertEquals(0,cart().path("items").size());}
 @ParameterizedTest @ValueSource(strings={"{}","{\"subjectId\":0}","{\"subjectId\":1.5}","{\"subjectId\":\"1\"}","{\"subjectId\":1,\"price\":1}"})
 void invalidCartInput(String body)throws Exception{call("POST","/api/v1/cart/items",body,f.student(),null,400);}
 @Test void missingSubjectAndItemReturn404()throws Exception{call("POST","/api/v1/cart/items",Map.of("subjectId",Long.MAX_VALUE),f.student(),null,404);call("DELETE","/api/v1/cart/items/"+Long.MAX_VALUE,null,f.student(),null,404);}
 @Test void cartLimitsTwentySubjects()throws Exception{for(int i=0;i<20;i++)add(subjects.resolve("LIMIT"+i).getId(),f.student());call("POST","/api/v1/cart/items",Map.of("subjectId",f.math().getSubjectId()),f.student(),null,422);}
 @Test void allRoleRestrictions()throws Exception{
  var routes=List.of(new String[]{"GET","/api/v1/cart"},new String[]{"POST","/api/v1/cart/items"},new String[]{"DELETE","/api/v1/cart/items/1"},new String[]{"DELETE","/api/v1/cart/items"},new String[]{"POST","/api/v1/orders/checkout"},new String[]{"GET","/api/v1/orders/my"},new String[]{"GET","/api/v1/orders/1"},new String[]{"POST","/api/v1/orders/1/payments/mock"},new String[]{"POST","/api/v1/orders/1/cancel"},new String[]{"GET","/api/v1/admin/orders"});
  for(var r:routes)call(r[0],r[1],Map.of(),null,null,401);
  for(var r:routes)call(r[0],r[1],Map.of(),f.tutor(),null,403);
  call("GET","/api/v1/cart",null,f.admin(),null,403);call("GET","/api/v1/admin/orders",null,f.student(),null,403);
 }
 @Test void groupDiscountedSnapshotAndNoEnrollmentAtCheckout()throws Exception{long before=enrollments.count();var o=order();assertEquals(2000000,o.path("totalAmount").asLong());assertEquals(2000000,o.path("items").get(0).path("unitPrice").asLong()+o.path("items").get(1).path("unitPrice").asLong());assertEquals("PENDING_PAYMENT",o.path("status").asText());assertEquals(2,cart().path("items").size());assertEquals(before,enrollments.count());assertEquals(0,o.path("payments").size());}
 @Test void checkoutRetryAndConflictingKey()throws Exception{order();var body=checkoutBody();long count=orders.count();var a=call("POST","/api/v1/orders/checkout",body,f.student(),"checkout",200);assertEquals(count,orders.count());assertEquals(a,call("POST","/api/v1/orders/checkout",body,f.student(),"checkout",200));var changed=new HashMap<>(body);changed.put("cartVersion",999);call("POST","/api/v1/orders/checkout",changed,f.student(),"checkout",409);}
 @Test void staleCartAndPartialCheckoutRejected()throws Exception{add(f.math().getSubjectId(),f.student());var old=checkoutBody();add(f.science().getSubjectId(),f.student());call("POST","/api/v1/orders/checkout",old,f.student(),"old",409);var partial=new HashMap<>(old);partial.put("cartVersion",cart().path("cartVersion").asLong());call("POST","/api/v1/orders/checkout",partial,f.student(),"partial",409);}
 @Test void mismatchedSubjectRejected()throws Exception{var c=add(f.math().getSubjectId(),f.student());var body=Map.of("cartVersion",c.path("cartVersion").asLong(),"items",List.of(Map.of("cartItemId",c.path("items").get(0).path("id").asLong(),"classId",f.b().getId())));call("POST","/api/v1/orders/checkout",body,f.student(),"bad",409);}
 @Test void duplicateClassOrItemRejected()throws Exception{order();var c=cart();var item=Map.of("cartItemId",c.path("items").get(0).path("id").asLong(),"classId",f.a().getId());call("POST","/api/v1/orders/checkout",Map.of("cartVersion",c.path("cartVersion").asLong(),"items",List.of(item,item)),f.student(),"dup",400);}
 @Test void cannotCheckoutAnotherStudentsItem()throws Exception{var other=add(f.math().getSubjectId(),f.other());add(f.math().getSubjectId(),f.student());call("POST","/api/v1/orders/checkout",Map.of("cartVersion",1,"items",List.of(Map.of("cartItemId",other.path("items").get(0).path("id").asLong(),"classId",f.a().getId()))),f.student(),"other",409);}
 @Test void overlapWithinOrderRejected()throws Exception{order();var c=cart();var items=new ArrayList<Map<String,Long>>();for(var i:c.path("items"))items.add(Map.of("cartItemId",i.path("id").asLong(),"classId",i.path("subjectId").asLong()==f.math().getSubjectId()?f.a().getId():f.overlap().getId()));call("POST","/api/v1/orders/checkout",Map.of("cartVersion",c.path("cartVersion").asLong(),"items",items),f.student(),"overlap",409);}
 @Test void successfulPaymentUsesSnapshotAndIsIdempotent()throws Exception{var o=order();long id=o.path("id").asLong();f.math().setBasePrice1on1(new BigDecimal("9000000"));courses.saveAndFlush(f.math());var paid=pay(id,"pay",200);assertEquals("PAID",paid.path("status").asText());assertEquals(2000000,paid.path("totalAmount").asLong());assertTrue(enrollments.findAllById(List.of(paid.path("items").get(0).path("enrollmentId").asLong(),paid.path("items").get(1).path("enrollmentId").asLong())).stream().allMatch(e->e.getDiscountRate().compareTo(new BigDecimal("0.20"))==0));assertEquals(2,paid.path("payments").size());assertEquals(0,cart().path("items").size());assertEquals(paid,pay(id,"pay",200));assertEquals(paid,pay(id,"other-key",200));assertEquals(2,payments.findByOrderIdOrderById(id).size());verify(gateway,times(1)).confirm();}
 @Test void failedPaymentCreatesNoEnrollmentAndCanRetry()throws Exception{long before=enrollments.count();long id=order().path("id").asLong();when(gateway.confirm()).thenReturn(false);var failed=pay(id,"failed",200);assertEquals("PENDING_PAYMENT",failed.path("status").asText());assertEquals(before,enrollments.count());assertEquals(2,cart().path("items").size());assertEquals(failed,pay(id,"failed",200));when(gateway.confirm()).thenReturn(true);assertEquals("PAID",pay(id,"retry",200).path("status").asText());assertEquals(failed,pay(id,"failed",200));assertEquals(4,payments.findByOrderIdOrderById(id).size());}
 @Test void paymentDoesNotDeleteRemovedThenReaddedCartItem()throws Exception{long id=order().path("id").asLong();var original=cart().path("items").get(0);call("DELETE","/api/v1/cart/items/"+original.path("id").asLong(),null,f.student(),null,200);add(original.path("subjectId").asLong(),f.student());pay(id,"pay",200);assertEquals(1,cart().path("items").size());assertNotEquals(original.path("id").asLong(),cart().path("items").get(0).path("id").asLong());}
 @Test void anotherStudentCannotReadPayCancel()throws Exception{long id=order().path("id").asLong();call("GET","/api/v1/orders/"+id,null,f.other(),null,403);call("POST","/api/v1/orders/"+id+"/payments/mock",null,f.other(),"p",403);call("POST","/api/v1/orders/"+id+"/cancel",Map.of("reason","test"),f.other(),"c",403);call("GET","/api/v1/orders/"+id,null,f.admin(),null,200);}
 @Test void cancelKeepsCartAndBlocksPayment()throws Exception{long id=order().path("id").asLong();var c=call("POST","/api/v1/orders/"+id+"/cancel",Map.of("reason","Changed plan"),f.student(),"cancel",200);assertEquals("CANCELLED",c.path("status").asText());assertEquals(c,call("POST","/api/v1/orders/"+id+"/cancel",Map.of("reason","Changed plan"),f.student(),"cancel",200));call("POST","/api/v1/orders/"+id+"/cancel",Map.of("reason","different"),f.student(),"new-key",409);pay(id,"pay",422);assertEquals(2,cart().path("items").size());}
 @Test void paidOrderCannotBeCancelled()throws Exception{long id=order().path("id").asLong();pay(id,"pay",200);call("POST","/api/v1/orders/"+id+"/cancel",Map.of("reason","test"),f.student(),"cancel",422);}
 @Test void expiredOrderIsReadOnlyAndCannotPayOrCancel()throws Exception{long id=order().path("id").asLong();var o=orders.findById(id).orElseThrow();o.setCreatedAt(OffsetDateTime.now(clock).minusMinutes(10));o.setExpiresAt(OffsetDateTime.now(clock).minusMinutes(5));orders.flush();assertEquals("EXPIRED",detail(id).path("status").asText());assertEquals(OrderStatus.PENDING_PAYMENT,o.getStatus());pay(id,"expired",422);call("POST","/api/v1/orders/"+id+"/cancel",Map.of("reason","test"),f.student(),"cancel",422);assertEquals(1,call("GET","/api/v1/orders/my?status=EXPIRED",null,f.student(),null,200).path("totalElements").asInt());assertEquals(0,call("GET","/api/v1/orders/my?status=PENDING_PAYMENT",null,f.student(),null,200).path("totalElements").asInt());}
 @ParameterizedTest @ValueSource(strings={"page=-1","size=0","size=101","status=BAD","from=2030-02-01&to=2030-01-01","from=wrong"})
 void invalidFilters(String query)throws Exception{call("GET","/api/v1/orders/my?"+query,null,f.student(),null,400);}
 @Test void historyIsOwnedAndAdminCanFilter()throws Exception{order();assertEquals(0,call("GET","/api/v1/orders/my?studentId="+f.student().getId(),null,f.other(),null,200).path("totalElements").asInt());assertEquals(1,call("GET","/api/v1/admin/orders?studentId="+f.student().getId(),null,f.admin(),null,200).path("totalElements").asInt());assertEquals(0,call("GET","/api/v1/orders/my?page=99",null,f.student(),null,200).path("content").size());}
 @Test void invalidKeyUnknownPriceAndEmptyItemsRejected()throws Exception{order();call("POST","/api/v1/orders/checkout",checkoutBody(),f.student(),null,400);call("POST","/api/v1/orders/checkout",checkoutBody(),f.student(),"bad key",400);var injected=new HashMap<>(checkoutBody());injected.put("amount",1);call("POST","/api/v1/orders/checkout",injected,f.student(),"tamper",400);call("POST","/api/v1/orders/checkout",Map.of("cartVersion",2,"items",List.of()),f.student(),"empty",400);}
 @Test void classClosingBeforePayRollsBackAll()throws Exception{long id=order().path("id").asLong();f.b().setStatus(ClassStatus.CANCELLED);classes.saveAndFlush(f.b());long before=enrollments.count();pay(id,"pay",422);assertEquals(before,enrollments.count());assertEquals(0,payments.findByOrderIdOrderById(id).size());verify(gateway,never()).confirm();}
 @Test void classCourseSubjectChangeBeforePayRejected()throws Exception{long id=order().path("id").asLong();f.math().setSubjectId(f.science().getSubjectId());courses.saveAndFlush(f.math());pay(id,"pay",409);assertEquals(0,payments.findByOrderIdOrderById(id).size());}
 @Test void missingScheduleBeforePayRejected()throws Exception{long id=order().path("id").asLong();sessions.delete(sessions.findByClassGroupIdOrderBySessionNumberAsc(f.b().getId()).get(0));sessions.flush();pay(id,"pay",422);assertEquals(0,payments.findByOrderIdOrderById(id).size());}
 @Test void inactiveCourseRejectedAtCheckout()throws Exception{add(f.math().getSubjectId(),f.student());f.math().setActive(false);courses.saveAndFlush(f.math());call("POST","/api/v1/orders/checkout",checkoutBody(),f.student(),"inactive",422);}
 @Test void refundOneItemKeepsOtherEnrollmentAndUpdatesOrder()throws Exception{long id=order().path("id").asLong();var paid=pay(id,"pay",200);long enrollment=paid.path("items").get(0).path("enrollmentId").asLong();call("POST","/api/v1/admin/enrollments/"+enrollment+"/refund",Map.of("reason","test refund","refundPercentage",100),f.admin(),"refund1",200);var detail=detail(id);assertEquals("PARTIALLY_REFUNDED",detail.path("status").asText());assertEquals(800000,detail.path("refundedAmount").asLong());long other=paid.path("items").get(1).path("enrollmentId").asLong();assertEquals(EnrollmentStatus.ACTIVE,enrollments.findById(other).orElseThrow().getStatus());call("POST","/api/v1/admin/enrollments/"+other+"/refund",Map.of("reason","test refund","refundPercentage",100),f.admin(),"refund2",200);assertEquals("REFUNDED",detail(id).path("status").asText());}
}
