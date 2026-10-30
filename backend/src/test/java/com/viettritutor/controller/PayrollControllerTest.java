package com.viettritutor.controller;

import com.fasterxml.jackson.databind.*;
import com.viettritutor.PayrollTestFixtures;
import com.viettritutor.entity.*;
import com.viettritutor.enums.*;
import com.viettritutor.repository.*;
import com.viettritutor.security.jwt.JwtService;
import com.viettritutor.service.*;
import org.junit.jupiter.api.*;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.*;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.*;
import org.springframework.http.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.annotation.DirtiesContext;
import org.springframework.test.context.*;
import org.springframework.test.web.servlet.*;
import org.springframework.transaction.annotation.*;
import java.time.*;
import java.math.BigDecimal;
import java.util.*;
import java.util.concurrent.*;
import java.util.stream.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest(properties={"spring.jpa.hibernate.ddl-auto=create-drop","spring.flyway.enabled=false",
        "spring.datasource.driver-class-name=org.h2.Driver","spring.jpa.show-sql=false","logging.level.root=WARN"})
@ActiveProfiles("test") @AutoConfigureMockMvc @Transactional
@Import({PayrollTestFixtures.class,PayrollControllerTest.Time.class})
class PayrollControllerTest {
    static final Instant NOW=Instant.parse("2030-02-01T00:00:00Z");
    @TestConfiguration static class Time {
        @Bean @Primary Clock testClock(){return Clock.fixed(NOW,ZoneOffset.UTC);}
    }
    @DynamicPropertySource static void properties(DynamicPropertyRegistry r) {
        r.add("spring.datasource.url",()->"jdbc:h2:mem:payroll-tests;MODE=PostgreSQL;DB_CLOSE_DELAY=-1");
        r.add("spring.datasource.username",()->"sa");r.add("spring.datasource.password",()->"");
        
        r.add("app.jwt.secret",()->UUID.randomUUID().toString()+UUID.randomUUID());
        r.add("payroll.test.password",()->UUID.randomUUID().toString());
        r.add("payroll.test.email-domain",()->"payroll.invalid");
        r.add("spring.mail.username",()->"unused");r.add("spring.mail.password",()->"unused");
    }
    @MockBean SessionLifecycleJob lifecycleJob;
    @MockBean AttendanceLockJob attendanceJob;
    @Autowired PayrollTestFixtures fixtures;
    @Autowired MockMvc mvc;
    @Autowired ObjectMapper json;
    @Autowired JwtService jwt;
    @Autowired PayrollPeriodRepository periods;
    @Autowired PayrollLineRepository lines;
    @Autowired PayrollMutexRepository mutex;
    @Autowired SessionRepository sessions;
    @Autowired UserRepository users;
    @Autowired TutorProfileRepository profiles;
    @Autowired AttendanceRecordRepository records;
    @Autowired JdbcTemplate jdbc;
    @Autowired jakarta.persistence.EntityManager entityManager;
    @Autowired SessionGenerator generator;
    @Autowired PayrollService service;
    PayrollTestFixtures.Data f;
    String admin,tutor,student,other;
    @BeforeEach void setup(){f=fixtures.seed();admin=token(f.admin());tutor=token(f.tutor());student=token(f.student());other=token(f.substitute());}
    String token(User u){return "Bearer "+jwt.generateToken(Map.of("role",u.getRole()),u);}
    String path(){return "/admin/payroll/"+f.month().getYear()+"/"+f.month().getMonthValue();}
    ResultActions call(String method,String path,Object body,String auth,String key)throws Exception{
        var r=request(HttpMethod.valueOf(method),"/api/v1"+path).contentType(MediaType.APPLICATION_JSON);
        if(auth!=null)r.header("Authorization",auth);if(key!=null)r.header("Idempotency-Key",key);
        if(body!=null)r.content(json.writeValueAsString(body));
        return mvc.perform(r);
    }
    JsonNode data(ResultActions a,int code)throws Exception{return json.readTree(a.andExpect(status().is(code)).andReturn().getResponse().getContentAsString()).path("data");}
    JsonNode get()throws Exception{return data(call("GET",path(),null,admin,null),200);}
    JsonNode finalizePay()throws Exception{return data(call("POST",path()+"/finalize",null,admin,"period-one"),200);}
    JsonNode line(JsonNode result,Long id){for(var l:result.path("lines"))if(l.path("tutorId").asLong()==id)return l;throw new AssertionError("Missing tutor");}

    @Test void previewIsReadOnlyPaysEightCompletedWithoutSubtractingTwoCancelled()throws Exception{
        var p=get();var l=line(p,f.tutor().getId());
        assertEquals("DRAFT",p.path("status").asText());assertTrue(p.path("canFinalize").asBoolean());
        assertEquals(8,l.path("validSessions").asInt());assertEquals(2,l.path("cancelledSessions").asInt());
        assertEquals(1,l.path("substitutedOutSessions").asInt());assertEquals(1600000,l.path("sessionPay").asLong());
        assertEquals(6600000,l.path("totalPay").asLong());
        assertEquals("Tutor absent; no substitute",l.path("reconciliation").path("cancelled").get(0).path("cancellationReason").asText());
        assertEquals(1,line(p,f.substitute().getId()).path("validSessions").asInt());
        assertEquals(4250000,line(p,f.substitute().getId()).path("totalPay").asLong());
        assertEquals(3000000,line(p,f.idle().getId()).path("totalPay").asLong());
        // No disabled-at timestamp exists, so past and current months keep a disabled tutor's base salary.
        assertEquals(1000000,line(p,f.disabled().getId()).path("totalPay").asLong());
        assertEquals(14850000,p.path("totalPayroll").asLong());
        assertEquals(0,periods.count());assertEquals(0,lines.count());assertEquals(0,mutex.count());
        assertEquals(0,data(call("GET","/tutor/payroll",null,tutor,null),200).path("totalElements").asInt());
    }
    @Test void currentRatesApplyToWholeMonthAndFinalizedSnapshotNeverRecalculates()throws Exception{
        var profile=profiles.findById(f.tutor().getId()).orElseThrow();
        profile.setBaseSalary(new BigDecimal("6000000"));profile.setSessionRate(new BigDecimal("300000"));profiles.flush();
        var saved=finalizePay();assertEquals(8400000,line(saved,f.tutor().getId()).path("totalPay").asLong());
        profile.setBaseSalary(BigDecimal.ZERO);profile.setSessionRate(BigDecimal.ZERO);profiles.flush();
        assertEquals(saved,get());
        assertEquals(saved,data(call("POST",path()+"/finalize",null,admin,"period-one"),200));
        assertEquals(saved,data(call("POST",path()+"/finalize",null,admin,"another-key"),200));
        call("POST","/admin/payroll/2029/12/finalize",null,admin,"another-key").andExpect(status().isConflict());
        assertEquals(1,periods.count());assertEquals(4,lines.count());
        var mine=data(call("GET","/tutor/payroll",null,tutor,null),200);
        assertEquals(1,mine.path("totalElements").asInt());assertEquals(8400000,mine.path("content").get(0).path("totalPay").asLong());
        assertFalse(mine.toString().contains("totalPayroll"));
    }
    @Test void snapshotWithPlainTextReconciliationStillShowsStoredAmounts()throws Exception{
        finalizePay();
        // Imported sample rows (as on the shared database) carry a plain-text note instead of the JSON reconciliation.
        jdbc.update("update payroll_lines set reconciliation='Đã đối soát số buổi dạy và chốt bảng lương.'");
        entityManager.clear();
        var stored=lines.findAll().stream().filter(l->l.getTutorId().equals(f.tutor().getId())).findFirst().orElseThrow();
        var admin=line(get(),f.tutor().getId());
        assertEquals(stored.getTotalPay().longValue(),admin.path("totalPay").asLong());
        assertEquals(stored.getValidSessions(),admin.path("validSessions").asInt());
        assertTrue(admin.path("reconciliation").isNull()||admin.path("reconciliation").isMissingNode());
        var mine=data(call("GET","/tutor/payroll",null,tutor,null),200).path("content").get(0);
        assertEquals(stored.getTotalPay().longValue(),mine.path("totalPay").asLong());
    }
    @Test void tutorIdentityCannotBeOverriddenAndEachTutorSeesOnlyOwnPay()throws Exception{
        finalizePay();
        var mine=data(call("GET","/tutor/payroll?tutorId="+f.substitute().getId(),null,tutor,null),200);
        assertEquals(f.tutor().getId().longValue(),mine.path("content").get(0).path("tutorId").asLong());
        assertEquals(1,data(call("GET","/tutor/payroll",null,other,null),200).path("content").get(0).path("validSessions").asInt());
        assertEquals(0,data(call("GET","/tutor/payroll?year=2028",null,tutor,null),200).path("totalElements").asInt());
    }
    @ParameterizedTest @ValueSource(strings={"ANONYMOUS","INVALID","TUTOR","STUDENT"})
    void adminRoutesEnforceRoles(String role)throws Exception{
        String auth=switch(role){case "ANONYMOUS"->null;case "INVALID"->"Bearer invalid";case "TUTOR"->tutor;default->student;};
        int code=role.equals("ANONYMOUS")||role.equals("INVALID")?401:403;
        call("GET",path(),null,auth,null).andExpect(status().is(code));
        call("POST",path()+"/finalize",null,auth,"key").andExpect(status().is(code));assertEquals(0,periods.count());
    }
    @ParameterizedTest @ValueSource(strings={"ANONYMOUS","INVALID","ADMIN","STUDENT"})
    void tutorRouteEnforcesRoles(String role)throws Exception{
        String auth=switch(role){case "ANONYMOUS"->null;case "INVALID"->"Bearer invalid";case "ADMIN"->admin;default->student;};
        call("GET","/tutor/payroll",null,auth,null).andExpect(status().is(role.equals("ANONYMOUS")||role.equals("INVALID")?401:403));
    }
    @ParameterizedTest @ValueSource(strings={"0/1","9999/1","2030/0","2030/13","abc/1","2030/abc"})
    void invalidPeriodRejected(String period)throws Exception{
        call("GET","/admin/payroll/"+period,null,admin,null).andExpect(status().isBadRequest());
        call("POST","/admin/payroll/"+period+"/finalize",null,admin,"key").andExpect(status().isBadRequest());
    }
    @ParameterizedTest @ValueSource(strings={"month=1","year=0","year=9999","year=2030&month=13","year=x","page=-1","size=0","size=101"})
    void invalidTutorFiltersRejected(String query)throws Exception{
        call("GET","/tutor/payroll?"+query,null,tutor,null).andExpect(status().isBadRequest());
    }
    @Test void keyRequiredValidatedAndCannotBeReusedForAnotherMonth()throws Exception{
        for(String key:Arrays.asList(null,"","bad key","x".repeat(101)))call("POST",path()+"/finalize",null,admin,key).andExpect(status().isBadRequest());
        finalizePay();
        call("POST","/admin/payroll/2029/12/finalize",null,admin,"period-one").andExpect(status().isConflict());
    }
    @ParameterizedTest @ValueSource(ints={2,3})
    void cannotFinalizeCurrentOrFutureMonth(int month)throws Exception{
        call("POST","/admin/payroll/2030/"+month+"/finalize",null,admin,"key").andExpect(status().isUnprocessableEntity());
        assertEquals(0,periods.count());
    }
    @ParameterizedTest @ValueSource(strings={"UNLOCKED","REVIEW","NO_CONFIRMATION","WRONG_TEACHER","MISSING_RECORD","SCHEDULED","UNASSIGNED"})
    void incompleteEvidenceBlocksFinalization(String cause)throws Exception{
        Session s=sessions.findById(f.completed().getFirst()).orElseThrow();
        switch(cause){
            case "UNLOCKED"->s.setAttendanceLocked(false);
            case "REVIEW"->s.setAttendanceNeedsReview(true);
            case "NO_CONFIRMATION"->s.setTeachingConfirmedAt(null);
            case "WRONG_TEACHER"->s.setTaughtByTutorId(f.substitute().getId());
            case "MISSING_RECORD"->records.deleteAll(records.findBySessionIdOrderByStudentId(s.getId()));
            case "SCHEDULED"->s.setStatus(SessionStatus.SCHEDULED);
            default->{s.setActualTutorId(null);s.setScheduledTutorId(null);}
        }
        sessions.flush();records.flush();
        assertFalse(get().path("canFinalize").asBoolean());
        call("POST",path()+"/finalize",null,admin,"key").andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.errorCode").value("PAYROLL_UNRESOLVED_SESSIONS"));
        assertEquals(0,periods.count());assertEquals(0,lines.count());
    }
    @Test void tutorsCreatedAfterMonthAreExcludedAndMissingPaidProfileBlocks()throws Exception{
        jdbc.update("update users set created_at=? where id=?",LocalDateTime.of(2030,2,1,0,0),f.idle().getId());
        assertEquals(3,get().path("lines").size());
        profiles.deleteById(f.tutor().getId());profiles.flush();
        call("POST",path()+"/finalize",null,admin,"key").andExpect(status().isUnprocessableEntity());
    }
    @Test void chainedActualTutorCorrectionsDoNotCountIntermediateTutorAsSubstitutedOut()throws Exception{
        Long id=f.completed().getFirst();
        data(call("PATCH","/admin/sessions/"+id+"/actual-tutor",Map.of("tutorId",f.idle().getId(),"reason","First guess"),admin,null),200);
        data(call("PATCH","/admin/sessions/"+id+"/actual-tutor",Map.of("tutorId",f.substitute().getId(),"reason","Actually taught by substitute"),admin,null),200);
        var p=get();
        var idle=line(p,f.idle().getId());
        assertEquals(0,idle.path("substitutedOutSessions").asInt());assertEquals(0,idle.path("unfinalizedSessions").asInt());
        assertEquals(2,line(p,f.tutor().getId()).path("substitutedOutSessions").asInt());
        assertEquals(1,line(p,f.substitute().getId()).path("unfinalizedSessions").asInt());
    }
    @Test void disabledTutorsDrawNoBaseSalaryInFutureMonths()throws Exception{
        var current=data(call("GET","/admin/payroll/2030/2",null,admin,null),200);
        assertEquals(1000000,line(current,f.disabled().getId()).path("totalPay").asLong());
        var future=data(call("GET","/admin/payroll/2030/3",null,admin,null),200);
        for(var item:future.path("lines"))assertNotEquals(f.disabled().getId().longValue(),item.path("tutorId").asLong());
        assertEquals(3000000,line(future,f.idle().getId()).path("totalPay").asLong());
    }
    @Test void disabledTutorWhoTaughtInMonthIsStillPaidAndDoesNotBlock()throws Exception{
        fixtures.lesson(f.classId(),f.month().atDay(12),12,f.disabled(),f.disabled(),f.student(),f.admin(),true);
        var p=get();
        assertTrue(p.path("canFinalize").asBoolean());
        var l=line(p,f.disabled().getId());
        assertEquals(1,l.path("validSessions").asInt());assertEquals(1100000,l.path("totalPay").asLong());
    }
    @Test void adminCorrectsActualTutorWhichResetsEvidenceAndIsBlockedOnceFinalized()throws Exception{
        Long id=f.completed().getFirst();
        var body=Map.of("tutorId",f.idle().getId(),"reason","Scheduled tutor did not show up");
        call("PATCH","/admin/sessions/"+id+"/actual-tutor",body,tutor,null).andExpect(status().isForbidden());
        call("PATCH","/admin/sessions/"+id+"/actual-tutor",Map.of("tutorId",f.idle().getId()),admin,null)
                .andExpect(status().isBadRequest());
        call("PATCH","/admin/sessions/"+id+"/actual-tutor",Map.of("tutorId",f.disabled().getId(),"reason","x"),admin,null)
                .andExpect(status().isUnprocessableEntity()).andExpect(jsonPath("$.errorCode").value("TUTOR_DISABLED"));
        var updated=data(call("PATCH","/admin/sessions/"+id+"/actual-tutor",body,admin,null),200);
        assertEquals(f.idle().getId().longValue(),updated.path("actualTutorId").asLong());
        Session s=sessions.findById(id).orElseThrow();
        assertNull(s.getTeachingConfirmedAt());assertTrue(s.isAttendanceNeedsReview());
        assertFalse(get().path("canFinalize").asBoolean());
        assertEquals(1,line(get(),f.idle().getId()).path("unfinalizedSessions").asInt());
        // Restore evidence so the month can be finalized, then the change is refused.
        s.setActualTutorId(f.tutor().getId());s.setTaughtByTutorId(f.tutor().getId());
        s.setTeachingConfirmedAt(OffsetDateTime.now());s.setAttendanceNeedsReview(false);
        s.setStatus(SessionStatus.COMPLETED);s.setAttendanceLocked(true);sessions.flush();
        finalizePay();
        call("PATCH","/admin/sessions/"+id+"/actual-tutor",body,admin,null)
                .andExpect(status().isUnprocessableEntity()).andExpect(jsonPath("$.errorCode").value("PAYROLL_FINALIZED"));
    }
    @Test void makeupIsPaidInMonthActuallyTaughtAndOriginalCancellationIsNotDeducted()throws Exception{
        var old=fixtures.lesson(f.classId(),f.month().minusMonths(1).atEndOfMonth(),12,f.tutor(),f.tutor(),f.student(),f.admin(),false);
        var makeup=fixtures.lesson(f.classId(),f.month().atDay(12),13,f.tutor(),f.tutor(),f.student(),f.admin(),true);
        makeup.setOriginalSession(old);sessions.flush();
        var result=line(get(),f.tutor().getId());
        assertEquals(9,result.path("validSessions").asInt());assertEquals(1800000,result.path("sessionPay").asLong());
        assertEquals(2,result.path("cancelledSessions").asInt());
        var earlier=data(call("GET","/admin/payroll/2029/12",null,admin,null),200);
        assertEquals(0,line(earlier,f.tutor().getId()).path("validSessions").asInt());
        assertEquals(1,line(earlier,f.tutor().getId()).path("cancelledSessions").asInt());
    }
    @Test void finalizedPayrollBlocksAttendanceChangesAndRetroactiveGeneration()throws Exception{
        finalizePay();Long id=f.completed().getFirst();
        call("PATCH","/admin/sessions/"+id+"/attendance/lock",Map.of("locked",false,"reason","Reopen"),admin,null)
                .andExpect(status().isUnprocessableEntity()).andExpect(jsonPath("$.errorCode").value("PAYROLL_FINALIZED"));
        var record=records.findBySessionIdOrderByStudentId(id).getFirst();
        call("PATCH","/admin/sessions/"+id+"/attendance/"+record.getId(),Map.of("status","ABSENT","reason","Correction"),admin,null)
                .andExpect(status().isUnprocessableEntity()).andExpect(jsonPath("$.errorCode").value("PAYROLL_FINALIZED"));
        var exception=assertThrows(com.viettritutor.common.exception.BusinessException.class,
                ()->generator.ensureGenerated(new SessionGenerationSpec(999999L,f.month().atDay(1),1,SchedulePattern.MON_WED_FRI,TimeSlot.SLOT_MORNING,null)));
        assertEquals(com.viettritutor.common.exception.ErrorCode.PAYROLL_FINALIZED,exception.getErrorCode());
    }
    @Test void historyIsPaginatedAndNewestFirst()throws Exception{
        finalizePay();
        data(call("POST","/admin/payroll/2029/12/finalize",null,admin,"december"),200);
        var first=data(call("GET","/tutor/payroll?size=1",null,tutor,null),200);
        assertEquals(2,first.path("totalElements").asInt());assertEquals(2030,first.path("content").get(0).path("year").asInt());
        assertEquals(2029,data(call("GET","/tutor/payroll?size=1&page=1",null,tutor,null),200).path("content").get(0).path("year").asInt());
        assertEquals(1,data(call("GET","/tutor/payroll?year=2030&month=1",null,tutor,null),200).path("totalElements").asInt());
        assertEquals(0,data(call("GET","/tutor/payroll?page=99",null,tutor,null),200).path("content").size());
    }
    @Test void swaggerDocumentsAllThreeRoutes()throws Exception{
        JsonNode paths=json.readTree(mvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get("/api-docs")).andExpect(status().isOk()).andReturn().getResponse().getContentAsString()).path("paths");
        assertTrue(paths.path("/api/v1/admin/payroll/{year}/{month}").has("get"));
        assertTrue(paths.path("/api/v1/admin/payroll/{year}/{month}/finalize").has("post"));
        assertTrue(paths.path("/api/v1/tutor/payroll").has("get"));
    }
    @Test @Transactional(propagation=Propagation.NOT_SUPPORTED) @DirtiesContext(methodMode=DirtiesContext.MethodMode.AFTER_METHOD)
    void concurrentFinalizeReturnsOneStableSnapshot()throws Exception{
        var gate=new CountDownLatch(1);
        try(var pool=Executors.newFixedThreadPool(2)){
            var one=pool.submit(()->{gate.await();return data(call("POST",path()+"/finalize",null,admin,"same-key"),200);});
            var two=pool.submit(()->{gate.await();return data(call("POST",path()+"/finalize",null,admin,"same-key"),200);});
            gate.countDown();assertEquals(one.get(30,TimeUnit.SECONDS),two.get(30,TimeUnit.SECONDS));
        }
        assertEquals(1,periods.count());assertEquals(4,lines.count());
    }
    @Test @Transactional(propagation=Propagation.NOT_SUPPORTED) @DirtiesContext(methodMode=DirtiesContext.MethodMode.AFTER_METHOD)
    void concurrentUnlockAndFinalizeCannotCommitInconsistentPayroll()throws Exception{
        var gate=new CountDownLatch(1);
        try(var pool=Executors.newFixedThreadPool(2)){
            var one=pool.submit(()->{gate.await();return call("POST",path()+"/finalize",null,admin,"race-key").andReturn().getResponse().getStatus();});
            var two=pool.submit(()->{gate.await();return call("PATCH","/admin/sessions/"+f.completed().getFirst()+"/attendance/lock",
                    Map.of("locked",false,"reason","Review evidence"),admin,null).andReturn().getResponse().getStatus();});
            gate.countDown();assertEquals(List.of(200,422),Stream.of(one.get(30,TimeUnit.SECONDS),two.get(30,TimeUnit.SECONDS)).sorted().toList());
        }
        var changed=sessions.findById(f.completed().getFirst()).orElseThrow();
        if(periods.count()==1){assertTrue(changed.isAttendanceLocked());assertEquals(SessionStatus.COMPLETED,changed.getStatus());}
        else assertFalse(changed.isAttendanceLocked());
    }
}
