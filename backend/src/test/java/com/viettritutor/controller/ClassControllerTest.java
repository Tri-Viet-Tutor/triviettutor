package com.viettritutor.controller;

import com.fasterxml.jackson.databind.*;
import com.viettritutor.entity.*;
import com.viettritutor.enums.*;
import com.viettritutor.repository.*;
import com.viettritutor.security.jwt.JwtService;
import com.viettritutor.service.SessionLifecycleJob;
import org.junit.jupiter.api.*;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.*;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.*;
import org.springframework.http.*;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.*;
import org.springframework.transaction.annotation.Transactional;
import java.math.BigDecimal;
import java.time.*;
import java.util.*;
import java.util.stream.Stream;
import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest(properties = {
 "spring.datasource.url=jdbc:h2:mem:classes;MODE=PostgreSQL;DB_CLOSE_DELAY=-1",
 "spring.datasource.driver-class-name=org.h2.Driver", "spring.datasource.username=sa", "spring.datasource.password=",
 "spring.jpa.hibernate.ddl-auto=create-drop", "spring.jpa.show-sql=false", "spring.flyway.enabled=false",
 "spring.mail.username=test@example.test", "spring.mail.password=test",
 "app.jwt.secret=class-test-secret-with-at-least-thirty-two-bytes"
})
@ActiveProfiles("test")
@AutoConfigureMockMvc
@Transactional
@Import(ClassControllerTest.FixedTime.class)
class ClassControllerTest {
 @Autowired com.viettritutor.service.SubjectService subjects;
 static final String BASE = "/api/v1/admin/classes", CAT = "/api/v1/catalog/classes";
 static final LocalDate TODAY = LocalDate.of(2030, 1, 1), START = TODAY.plusDays(20);
 @TestConfiguration static class FixedTime {
  @Bean @Primary Clock testClock() { return Clock.fixed(Instant.parse("2030-01-01T02:00:00Z"), ZoneId.of("Asia/Ho_Chi_Minh")); }
 }
 @MockBean SessionLifecycleJob lifecycleJob;
 @Autowired MockMvc mvc;
 @Autowired ObjectMapper json;
 @Autowired UserRepository users;
 @Autowired CourseRepository courses;
 @Autowired ClassGroupRepository classes;
 @Autowired SessionRepository sessions;
 @Autowired LearningScheduleRepository rosters;
 @Autowired ClassConversionRepository conversions;
 @Autowired ClassChangeRepository changes;
 @Autowired JwtService jwt;
 @Autowired jakarta.persistence.EntityManager em;
 Course course;
 String admin;
 User student;

 @BeforeEach void setup() {
  admin = token(user("ADMIN"));
  student = user("STUDENT");
  course = courses.saveAndFlush(Course.builder().name("Math").subject("MATH").subjectId(subjects.resolve("MATH").getId()).gradeLevel(GradeLevel.GRADE_10)
   .basePrice1on1(new BigDecimal("8000000")).totalSessions(4).durationMinutes(120).build());
 }
 User user(String role) { return users.saveAndFlush(User.builder().email(UUID.randomUUID()+"@classes.test")
  .password("unused").fullName(role).role("ROLE_"+role).enabled(true).build()); }
 String token(User u) { return "Bearer "+jwt.generateToken(Map.of("role", u.getRole()), u); }
 Map<String,Object> valid() {
  var b = new LinkedHashMap<String,Object>();
  b.put("courseId",course.getId()); b.put("classType","GROUP"); b.put("deliveryMode","ONLINE");
  b.put("schedulePattern","MON_WED_FRI"); b.put("timeSlot","SLOT_MORNING"); b.put("startDate",START.toString());
  b.put("meetingUrl","https://meet.example.test/private-room"); return b;
 }
 ResultActions call(String method, String path, Object body, String bearer) throws Exception {
  var r = request(HttpMethod.valueOf(method),path).contentType(MediaType.APPLICATION_JSON);
  if (bearer != null) r.header("Authorization",bearer);
  if (body != null) r.content(json.writeValueAsString(body));
  return mvc.perform(r);
 }
 JsonNode data(ResultActions r, int status) throws Exception {
  return json.readTree(r.andExpect(status().is(status)).andReturn().getResponse().getContentAsString()).get("data");
 }
 long create() throws Exception { return data(call("POST",BASE,valid(),admin),201).path("id").asLong(); }
 JsonNode changeStatus(long id, String value) throws Exception { return data(call("PATCH",BASE+"/"+id+"/status",Map.of("newStatus",value),admin),200); }
 long open() throws Exception { long id=create(); changeStatus(id,"PUBLISHED"); changeStatus(id,"ENROLLING"); return id; }
 LearningSchedule enroll(long id, User u) {
  var all=sessions.findByClassGroupIdOrderBySessionNumberAsc(id);
  return rosters.saveAndFlush(LearningSchedule.builder().enrollmentId(Math.abs(UUID.randomUUID().getMostSignificantBits()))
   .studentId(u.getId()).classGroupId(id).startDate(all.getFirst().getSessionDate()).endDate(all.getLast().getSessionDate())
   .status(LearningScheduleStatus.ACTIVE).build());
 }
 long failed() throws Exception {
  long id=open(); enroll(id,student); classes.findById(id).orElseThrow().setEnrollmentDeadline(TODAY.minusDays(1));
  changeStatus(id,"FAILED_TO_OPEN"); return id;
 }
 Map<String,Object> conversion(String fee) {
  var b=new LinkedHashMap<String,Object>();
  b.put("studentId",student.getId()); b.put("consentReference","signed-consent-1");
  b.put("feeResolution",fee); b.put("paidAmount",6400000); b.put("originalPaymentReference","receipt-1");
  b.put("adjustmentAmount",fee.equals("KEEP_PAID_AMOUNT")?0:1000000); return b;
 }

 @Test void publicationGeneratesSnapshotAndEnrollmentIsIdempotent() throws Exception {
  long id=create();
  var c=classes.findById(id).orElseThrow();
  assertEquals(ClassStatus.DRAFT,c.getStatus()); assertEquals(START.minusDays(3),c.getEnrollmentDeadline());
  assertTrue(c.getClassCode().startsWith("MATH-G10-MWF-M-")); assertEquals(8,c.getMaxStudents());
  assertTrue(sessions.findByClassGroupIdOrderBySessionNumberAsc(id).isEmpty());
  course.setTotalSessions(8);
  assertEquals(4,changeStatus(id,"PUBLISHED").path("sessions").size());
  var ids=sessions.findByClassGroupIdOrderBySessionNumberAsc(id).stream().map(Session::getId).toList();
  changeStatus(id,"ENROLLING"); changeStatus(id,"ENROLLING");
  assertEquals(ids,sessions.findByClassGroupIdOrderBySessionNumberAsc(id).stream().map(Session::getId).toList());
 }
 @ParameterizedTest @ValueSource(strings={"TUTOR","STUDENT","ANONYMOUS","INVALID"})
 void enforcesRolesOnEveryRoute(String role) throws Exception {
  long id=open();
  String auth=role.equals("ANONYMOUS")?null:role.equals("INVALID")?"Bearer invalid":token(user(role));
  int denied=role.equals("TUTOR")||role.equals("STUDENT")?403:401;
  call("GET",BASE,null,auth).andExpect(status().is(denied));
  call("POST",BASE,valid(),auth).andExpect(status().is(denied));
  call("PATCH",BASE+"/"+id+"/status",Map.of("newStatus","CANCELLED"),auth).andExpect(status().is(denied));
  call("POST",BASE+"/"+id+"/reopen",Map.of("startDate",START.plusDays(20).toString(),"reason","test"),auth).andExpect(status().is(denied));
  call("POST",BASE+"/"+id+"/convert-to-one-on-one",conversion("KEEP_PAID_AMOUNT"),auth).andExpect(status().is(denied));
  int publicStatus=denied==403?200:401;
  call("GET",CAT,null,auth).andExpect(status().is(publicStatus));
  call("GET",CAT+"/"+id,null,auth).andExpect(status().is(publicStatus));
  assertEquals(ClassStatus.ENROLLING,classes.findById(id).orElseThrow().getStatus());
 }
 @Test void catalogFiltersVisibilityAndNeverExposesMeetingLink() throws Exception {
  long draft=create(), id=open();
  call("GET",CAT+"/"+draft,null,admin).andExpect(status().isNotFound());
  var listing=data(call("GET",CAT+"?subject=math&gradeLevel=GRADE_10&deliveryMode=ONLINE&schedulePattern=MON_WED_FRI&timeSlot=SLOT_MORNING",null,admin),200);
  assertEquals(1,listing.path("totalElements").asInt()); assertEquals(id,listing.path("content").get(0).path("id").asLong());
  var detail=data(call("GET",CAT+"/"+id,null,token(student)),200);
  assertFalse(detail.has("meetingUrl")); assertEquals(4,detail.path("sessions").size());
  assertFalse(detail.path("sessions").toString().contains("private-room")); assertEquals(6400000,detail.path("estimatedFee").asInt());
  assertEquals(2,data(call("GET",BASE+"?courseId="+course.getId(),null,admin),200).path("totalElements").asInt());
  assertEquals(0,data(call("GET",CAT+"?deliveryMode=OFFLINE",null,admin),200).path("totalElements").asInt());
  course.setActive(false);
  assertEquals(0,data(call("GET",CAT,null,admin),200).path("totalElements").asInt());
  call("GET",CAT+"/"+id,null,admin).andExpect(status().isNotFound());
 }
 @ParameterizedTest @CsvSource({"0,6400000","2,6400000","3,5200000","5,4800000","7,4800000"})
 void pricesNextSeat(int count,int price) throws Exception {
  long id=open(); for(int i=0;i<count;i++) enroll(id,user("STUDENT"));
  var d=data(call("GET",CAT+"/"+id,null,admin),200);
  assertEquals(price,d.path("estimatedFee").asInt()); assertEquals(8-count,d.path("spotsLeft").asInt());
 }
 @Test void fullAndExpiredClassesAreExcludedFromList() throws Exception {
  long id=open(); for(int i=0;i<8;i++) enroll(id,user("STUDENT"));
  assertEquals(0,data(call("GET",CAT,null,admin),200).path("totalElements").asInt());
  var d=data(call("GET",CAT+"/"+id,null,admin),200); assertTrue(d.path("full").asBoolean()); assertFalse(d.has("estimatedFee"));
  long expired=open(); classes.findById(expired).orElseThrow().setEnrollmentDeadline(TODAY.minusDays(1));
  assertEquals(0,data(call("GET",CAT,null,admin),200).path("totalElements").asInt());
 }
 @ParameterizedTest @ValueSource(strings={"courseId","classType","deliveryMode","schedulePattern","timeSlot","startDate"})
 void missingRequiredFields(String field) throws Exception {
  var b=valid();b.remove(field);call("POST",BASE,b,admin).andExpect(status().isBadRequest()); assertEquals(0,classes.count());
 }
 @ParameterizedTest @CsvSource({"page,-1","size,0","size,101","status,INVALID","classType,INVALID","courseId,0"})
 void invalidAdminFilters(String k,String v) throws Exception { call("GET",BASE+"?"+k+"="+v,null,admin).andExpect(status().isBadRequest()); }
 @ParameterizedTest @ValueSource(strings={"classType","deliveryMode","schedulePattern","timeSlot"})
 void rejectsEnumOrdinals(String field) throws Exception { var b=valid();b.put(field,0);call("POST",BASE,b,admin).andExpect(status().isBadRequest()); }
 @Test void validatesConfiguration() throws Exception {
  for(var entry:Map.<String,Object>of("startDate",TODAY.toString(),"enrollmentDeadline",START.toString(),"meetingUrl","javascript:alert(1)","extra","unknown").entrySet()) {
   var b=valid();b.put(entry.getKey(),entry.getValue());call("POST",BASE,b,admin).andExpect(status().isBadRequest());
  }
  course.setActive(false);call("POST",BASE,valid(),admin).andExpect(status().isUnprocessableEntity());
 }
 @ParameterizedTest @ValueSource(strings={"ASSIGNED","IN_PROGRESS","COMPLETED","FAILED_TO_OPEN","ENROLLING"})
 void draftCannotBypassLifecycle(String target) throws Exception {
  long id=create();call("PATCH",BASE+"/"+id+"/status",Map.of("newStatus",target),admin).andExpect(status().isUnprocessableEntity());
  assertEquals(ClassStatus.DRAFT,classes.findById(id).orElseThrow().getStatus());
 }
 @Test void cancellationRequiresRefundAndCancelsEmptyClassSessions() throws Exception {
  long paid=open();enroll(paid,student);
  call("PATCH",BASE+"/"+paid+"/status",Map.of("newStatus","CANCELLED"),admin).andExpect(status().isUnprocessableEntity())
   .andExpect(jsonPath("$.errorCode").value("CLASS_REFUND_REQUIRED"));
  long empty=open(); changeStatus(empty,"CANCELLED");
  assertTrue(sessions.findByClassGroupIdOrderBySessionNumberAsc(empty).stream().allMatch(s->s.getStatus()==SessionStatus.CANCELLED));
 }
 @Test void reopensWithoutDuplicatingSessionsOrEnrollment() throws Exception {
  long id=failed(); var old=sessions.findByClassGroupIdOrderBySessionNumberAsc(id).stream().map(Session::getId).toList();
  var result=data(call("POST",BASE+"/"+id+"/reopen",Map.of("startDate",START.plusDays(21).toString(),"reason","Retained student agrees"),admin),200);
  assertEquals("ENROLLING",result.path("status").asText());
  var all=sessions.findByClassGroupIdOrderBySessionNumberAsc(id);
  assertEquals(old,all.stream().map(Session::getId).toList());
  var roster=rosters.findByClassGroupIdAndStatusOrderByStudentIdAscIdAsc(id,LearningScheduleStatus.ACTIVE);
  assertEquals(1,roster.size()); assertEquals(all.getFirst().getSessionDate(),roster.getFirst().getStartDate());
  assertEquals(all.getLast().getSessionDate(),roster.getFirst().getEndDate());
 }
 @ParameterizedTest @ValueSource(strings={"KEEP_PAID_AMOUNT","COLLECT_DIFFERENCE","REFUND_DIFFERENCE"})
 void conversionPreservesEnrollmentAndRequiresSettlementEvidence(String fee) throws Exception {
  long id=failed();var body=conversion(fee);String url=BASE+"/"+id+"/convert-to-one-on-one";
  if(!fee.equals("KEEP_PAID_AMOUNT")) {
   var pending=data(call("POST",url,body,admin),202);assertEquals("PENDING_SETTLEMENT",pending.path("feeStatus").asText());
   assertEquals(ClassType.GROUP,classes.findById(id).orElseThrow().getClassType());
   data(call("POST",url,body,admin),202);assertEquals(1,conversions.count());
   body.put("settlementReference","bank-receipt-verified-by-admin");
  }
  var done=data(call("POST",url,body,admin),200);
  assertEquals("ONE_ON_ONE",done.path("classDetail").path("classType").asText());assertTrue(done.path("classDetail").path("full").asBoolean());
  assertEquals(fee.equals("COLLECT_DIFFERENCE")?7400000:fee.equals("REFUND_DIFFERENCE")?5400000:6400000,done.path("agreedFee").asInt());
  assertEquals(1,rosters.count());assertEquals(4,sessions.findByClassGroupIdOrderBySessionNumberAsc(id).size());
  data(call("POST",url,body,admin),200);assertEquals(1,conversions.count());
  body.put("consentReference","different-agreement");call("POST",url,body,admin).andExpect(status().isConflict());
 }
 @Test void rejectsInvalidFeesAndWrongStudent() throws Exception {
  long id=failed();String url=BASE+"/"+id+"/convert-to-one-on-one";
  var keep=conversion("KEEP_PAID_AMOUNT");keep.put("adjustmentAmount",1);call("POST",url,keep,admin).andExpect(status().isBadRequest());
  var refund=conversion("REFUND_DIFFERENCE");refund.put("adjustmentAmount",6400000);call("POST",url,refund,admin).andExpect(status().isBadRequest());
  var noConsent=conversion("KEEP_PAID_AMOUNT");noConsent.remove("consentReference");call("POST",url,noConsent,admin).andExpect(status().isBadRequest());
  var wrong=conversion("KEEP_PAID_AMOUNT");wrong.put("studentId",user("STUDENT").getId());call("POST",url,wrong,admin).andExpect(status().isUnprocessableEntity());
  assertEquals(0,conversions.count());assertEquals(ClassType.GROUP,classes.findById(id).orElseThrow().getClassType());
 }
 @Test void pendingConversionBlocksReopen() throws Exception {
  long id=failed();data(call("POST",BASE+"/"+id+"/convert-to-one-on-one",conversion("COLLECT_DIFFERENCE"),admin),202);
  call("POST",BASE+"/"+id+"/reopen",Map.of("startDate",START.plusDays(21).toString(),"reason","try"),admin).andExpect(status().isUnprocessableEntity());
 }
 @Test void schedulerDoesNotAdvanceFailedOrUnassignedClass() throws Exception {
  long id=failed();var s=sessions.findByClassGroupIdOrderBySessionNumberAsc(id).getFirst();s.setSessionDate(TODAY.minusDays(1));sessions.flush();
  assertTrue(sessions.findByStatusAndSessionDateLessThanEqual(SessionStatus.SCHEDULED,TODAY).isEmpty());
 }
 @ParameterizedTest @ValueSource(strings={"999999","0","-1","abc"})
 void validatesIds(String id) throws Exception {
  call("GET",CAT+"/"+id,null,admin).andExpect(status().is(id.equals("999999")?404:400));
  call("PATCH",BASE+"/"+id+"/status",Map.of("newStatus","PUBLISHED"),admin).andExpect(status().is(id.equals("999999")?404:400));
 }

 @Test void reopenRejectsStudentConflictWithoutChangingDates() throws Exception {
  long id=failed();
  var oldDates=sessions.findByClassGroupIdOrderBySessionNumberAsc(id).stream().map(Session::getSessionDate).toList();
  var body=valid(); body.put("startDate",START.plusDays(21).toString());
  long other=data(call("POST",BASE,body,admin),201).path("id").asLong();
  changeStatus(other,"PUBLISHED");changeStatus(other,"ENROLLING");enroll(other,student);
  call("POST",BASE+"/"+id+"/reopen",Map.of("startDate",START.plusDays(21).toString(),"reason","conflict"),admin)
   .andExpect(status().isConflict()).andExpect(jsonPath("$.errorCode").value("STUDENT_SCHEDULE_CONFLICT"));
  assertEquals(ClassStatus.FAILED_TO_OPEN,classes.findById(id).orElseThrow().getStatus());
  assertEquals(oldDates,sessions.findByClassGroupIdOrderBySessionNumberAsc(id).stream().map(Session::getSessionDate).toList());
 }
 @Test
 @Transactional(propagation=org.springframework.transaction.annotation.Propagation.NOT_SUPPORTED)
 @org.springframework.test.annotation.DirtiesContext(methodMode=org.springframework.test.annotation.DirtiesContext.MethodMode.AFTER_METHOD)
 void publicationFailureRollsBackStatusAndAuditInRealTransaction() throws Exception {
  long id=create();long before=changes.count();
  sessions.saveAndFlush(Session.builder().classGroupId(id).sessionNumber(1).sessionDate(START.minusDays(1))
   .startTime(LocalTime.of(8,0)).endTime(LocalTime.of(10,0)).status(SessionStatus.SCHEDULED).build());
  call("PATCH",BASE+"/"+id+"/status",Map.of("newStatus","PUBLISHED"),admin).andExpect(status().isConflict());
  assertEquals(ClassStatus.DRAFT,classes.findById(id).orElseThrow().getStatus());
  assertEquals(before,changes.count());assertEquals(1,sessions.findByClassGroupIdOrderBySessionNumberAsc(id).size());
 }
 @Test void oneOnOneCapacityAndFeeHaveNoGroupDiscount() throws Exception {
  var body=valid();body.put("classType","ONE_ON_ONE");
  long id=data(call("POST",BASE,body,admin),201).path("id").asLong();
  changeStatus(id,"PUBLISHED");changeStatus(id,"ENROLLING");
  var detail=data(call("GET",CAT+"/"+id,null,admin),200);
  assertEquals(1,detail.path("maxStudents").asInt());assertEquals(8000000,detail.path("estimatedFee").asInt());
 }

}