package com.viettritutor.controller;

import com.fasterxml.jackson.databind.*;
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
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.*;
import org.springframework.test.annotation.DirtiesContext;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.*;
import org.springframework.transaction.annotation.*;
import java.time.*;
import java.math.BigDecimal;
import java.util.*;
import java.util.concurrent.*;
import java.util.stream.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest(properties = {
 "spring.datasource.url=jdbc:h2:mem:homework-tests;MODE=PostgreSQL;DB_CLOSE_DELAY=-1",
 "spring.datasource.driver-class-name=org.h2.Driver", "spring.datasource.username=sa", "spring.datasource.password=",
 "spring.jpa.hibernate.ddl-auto=create-drop", "spring.jpa.show-sql=false", "spring.flyway.enabled=false",
 "spring.mail.username=test@example.test", "spring.mail.password=unused",
 "app.jwt.secret=homework-tests-secret-with-at-least-thirty-two-bytes",
 "logging.level.org.hibernate.SQL=WARN", "logging.level.org.springframework=WARN"
})
@ActiveProfiles("test")
@AutoConfigureMockMvc
@Transactional
@org.springframework.test.context.event.RecordApplicationEvents
class HomeworkControllerTest {
    @Autowired org.springframework.test.context.event.ApplicationEvents events;
    static final Instant NOW = Instant.parse("2030-01-01T02:00:00Z");
    static final OffsetDateTime DUE = OffsetDateTime.parse("2030-01-10T12:00:00+07:00");
    static final String API = "/api/v1";
    @MockBean Clock clock;
    @MockBean org.springframework.mail.javamail.JavaMailSender mailSender; // never reach a real SMTP server
    @MockBean SessionLifecycleJob lifecycleJob;
    @MockBean AttendanceLockJob attendanceJob;
    @Autowired MockMvc mvc;
    @Autowired ObjectMapper json;
    @Autowired UserRepository users;
    @Autowired ClassGroupRepository classes;
    @Autowired SessionRepository sessions;
    @Autowired LearningScheduleRepository learning;
    @Autowired HomeworkRepository homeworks;
    @Autowired HomeworkSubmissionRepository submissions;
    @Autowired HomeworkChangeRepository homeworkChanges;
    @Autowired SubmissionChangeRepository submissionChanges;
    @Autowired NotificationRepository notificationRows;
    @Autowired JwtService jwt;
    User admin, tutor, substitute, student, outsider;
    Session session;
    String a, t, st;
    @BeforeEach void setup() {
        when(clock.instant()).thenReturn(NOW);
        when(clock.getZone()).thenReturn(ZoneId.of("Asia/Ho_Chi_Minh"));
        admin=user("ADMIN"); tutor=user("TUTOR"); substitute=user("TUTOR"); student=user("STUDENT"); outsider=user("STUDENT");
        a=token(admin); t=token(tutor); st=token(student);
        var c=classes.saveAndFlush(ClassGroup.builder().classType(ClassType.GROUP).status(ClassStatus.ASSIGNED)
                .enrollmentDeadline(LocalDate.of(2030,1,1)).build());
        session=sessions.saveAndFlush(Session.builder().classGroupId(c.getId()).sessionNumber(1)
                .sessionDate(LocalDate.of(2030,1,2)).startTime(LocalTime.of(8,0)).endTime(LocalTime.of(10,0))
                .scheduledTutorId(tutor.getId()).status(SessionStatus.SCHEDULED).build());
        enroll(student);
    }
    User user(String role) {
        return users.saveAndFlush(User.builder().email(UUID.randomUUID()+"@homework.test").password("unused")
                .fullName(role).role("ROLE_"+role).enabled(true).build());
    }
    LearningSchedule enroll(User u) {
        return learning.saveAndFlush(LearningSchedule.builder().enrollmentId(Math.abs(UUID.randomUUID().getMostSignificantBits()))
                .studentId(u.getId()).classGroupId(session.getClassGroupId()).status(LearningScheduleStatus.ACTIVE)
                .startDate(session.getSessionDate()).endDate(session.getSessionDate()).build());
    }
    String token(User u) { return "Bearer "+jwt.generateToken(Map.of("role",u.getRole()),u); }
    String sessionPath() { return "/sessions/"+session.getId()+"/homeworks"; }
    String hw(long id) { return "/homeworks/"+id; }
    ResultActions call(String method,String path,Object body,String auth) throws Exception {
        var r=request(HttpMethod.valueOf(method),API+path).contentType(MediaType.APPLICATION_JSON);
        if(auth!=null) r.header("Authorization",auth);
        if(body!=null) r.content(json.writeValueAsString(body));
        return mvc.perform(r);
    }
    JsonNode data(ResultActions r,int statusCode) throws Exception {
        return json.readTree(r.andExpect(status().is(statusCode)).andReturn().getResponse()
                .getContentAsString(java.nio.charset.StandardCharsets.UTF_8)).path("data");
    }
    Map<String,Object> body() {
        var b=new LinkedHashMap<String,Object>();
        b.put("title","Algebra"); b.put("instructions","Solve the equations");
        b.put("resourceUrl","https://example.test/exercises"); b.put("dueAt",DUE.toString()); b.put("maxScore",10);
        // The original suite covers strict deadlines; late work has its own tests below.
        b.put("allowLateSubmission",false);
        return b;
    }
    JsonNode create() throws Exception { return data(call("POST",sessionPath(),body(),t),201); }
    JsonNode state(long id,String value,long version) throws Exception {
        return data(call("PATCH",hw(id)+"/status",Map.of("status",value,"version",version),t),200);
    }
    long published() throws Exception { long id=create().path("id").asLong();state(id,"PUBLISHED",0);return id; }
    JsonNode start(long id) throws Exception { return data(call("POST",hw(id)+"/submissions/me/start",null,st),200); }
    JsonNode submit(long id) throws Exception {
        var s=start(id);
        return data(call("PUT",hw(id)+"/submissions/me",Map.of("content","x=2","version",s.path("version").asLong()),st),200);
    }

    @Test void independentLifecyclesAndPrivateDrafts() throws Exception {
        long id=published();
        var mine=data(call("GET",hw(id)+"/submissions/me",null,st),200);
        assertEquals("NOT_STARTED",mine.path("status").asText());assertEquals(0,submissions.count());
        var started=start(id);assertEquals("IN_PROGRESS",started.path("status").asText());
        assertEquals(started.path("id"),start(id).path("id"));assertEquals(1,submissions.count());
        var draft=data(call("PUT",hw(id)+"/submissions/me/draft",Map.of("content","draft answer","version",0),st),200);
        assertEquals("IN_PROGRESS",draft.path("status").asText());assertFalse(draft.has("submittedAt"));
        assertEquals(0,data(call("GET",hw(id)+"/submissions",null,t),200).path("totalElements").asInt());
        call("PATCH","/submissions/"+draft.path("id").asLong()+"/grade",Map.of("score",5,"version",1),t)
                .andExpect(status().isUnprocessableEntity());
        var submitted=data(call("PUT",hw(id)+"/submissions/me",Map.of("content","final answer","version",1),st),200);
        assertEquals("SUBMITTED",submitted.path("status").asText());assertTrue(submitted.has("submittedAt"));
        assertEquals("PUBLISHED",homeworks.findById(id).orElseThrow().getStatus().name());
        enroll(outsider);
        assertEquals("NOT_STARTED",data(call("GET",hw(id)+"/submissions/me",null,token(outsider)),200).path("status").asText());
        call("GET",hw(id)+"/submissions",null,st).andExpect(status().isForbidden());
        call("PUT",hw(id)+"/submissions/me/draft",Map.of("content","changed","version",2),st).andExpect(status().isUnprocessableEntity());
        state(id,"CLOSED",1);
        var grade=data(call("PATCH","/submissions/"+submitted.path("id").asLong()+"/grade",Map.of("score",8.5,"feedback","Good","version",2),t),200);
        assertEquals("GRADED",grade.path("status").asText());
        assertEquals("Good",data(call("GET",hw(id)+"/submissions/me",null,st),200).path("feedback").asText());
        assertEquals(4,submissionChanges.count()); // start, draft, submit, grade
    }

    @Test void hiddenDraftIncludingDirectlyClosedDraftDoesNotLeak() throws Exception {
        long id=create().path("id").asLong();
        call("GET",hw(id),null,st).andExpect(status().isNotFound());
        call("POST",hw(id)+"/submissions/me/start",null,st).andExpect(status().isNotFound());
        assertEquals(0,data(call("GET",sessionPath(),null,st),200).path("totalElements").asInt());
        state(id,"CLOSED",0);
        call("GET",hw(id),null,st).andExpect(status().isNotFound());
        assertEquals(0,data(call("GET",sessionPath(),null,st),200).path("totalElements").asInt());
        assertEquals(1,data(call("GET",sessionPath(),null,a),200).path("totalElements").asInt());
    }

    @ParameterizedTest
    @ValueSource(strings={"title","instructions","resourceUrl","dueAt","maxScore"})
    void publishedContentCannotChangeOrLimitsShrink(String field) throws Exception {
        long id=published();var b=body();b.put("version",1);
        b.put(field,switch(field) {case "dueAt" -> DUE.minusHours(1).toString();case "maxScore" -> 9;
            case "resourceUrl" -> "https://example.test/changed";default -> "changed";});
        call("PUT",hw(id),b,t).andExpect(status().isUnprocessableEntity());
        assertEquals(1,homeworks.findById(id).orElseThrow().getVersion());assertEquals(2,homeworkChanges.count());
    }

    @Test void draftCanChangeAllFieldsPublishedOnlyExtendsAndClosedCannotReopen() throws Exception {
        long id=create().path("id").asLong();var b=body();b.put("version",0);b.put("title","Changed");
        b.put("maxScore",5);b.put("dueAt",DUE.minusDays(1).toString());b.remove("resourceUrl");
        assertEquals("Changed",data(call("PUT",hw(id),b,a),200).path("title").asText());
        state(id,"PUBLISHED",1);b.put("version",2);b.put("dueAt",DUE.toString());b.put("maxScore",10);
        assertEquals(10,data(call("PUT",hw(id),b,t),200).path("maxScore").asInt());
        state(id,"CLOSED",3);long audits=homeworkChanges.count();state(id,"CLOSED",4);assertEquals(audits,homeworkChanges.count());
        b.put("version",4);call("PUT",hw(id),b,a).andExpect(status().isUnprocessableEntity());
        call("PATCH",hw(id)+"/status",Map.of("status","PUBLISHED","version",4),a).andExpect(status().isUnprocessableEntity());
    }

    @Test void effectiveTutorChangesImmediatelyButAuthorIsPreserved() throws Exception {
        long id=published();
        session.setActualTutorId(substitute.getId());session.setActualTutorOverridden(true);sessions.flush();
        call("GET",hw(id),null,t).andExpect(status().isForbidden());
        call("POST",sessionPath(),body(),t).andExpect(status().isForbidden());
        assertEquals(tutor.getId().longValue(),data(call("GET",hw(id),null,token(substitute)),200).path("createdBy").asLong());
        var b=body();b.put("version",1);b.put("maxScore",11);
        data(call("PUT",hw(id),b,token(substitute)),200);
        session.setActualTutorId(null);session.setScheduledTutorId(substitute.getId());sessions.flush();
        call("GET",hw(id),null,t).andExpect(status().isForbidden());
        data(call("GET",hw(id),null,token(substitute)),200);
    }

    @ParameterizedTest @ValueSource(strings={"INACTIVE","CANCELLED","BEFORE","AFTER"})
    void studentMustHaveActiveEnrollmentCoveringSessionDate(String kind) throws Exception {
        long id=published();
        var row=learning.findByClassGroupIdAndStatusOrderByStudentIdAscIdAsc(session.getClassGroupId(),LearningScheduleStatus.ACTIVE).getFirst();
        if(kind.equals("BEFORE")) row.setStartDate(session.getSessionDate().plusDays(1));
        else if(kind.equals("AFTER")) row.setEndDate(session.getSessionDate().minusDays(1));
        else row.setStatus(LearningScheduleStatus.valueOf(kind));
        learning.flush();
        call("GET",sessionPath(),null,st).andExpect(status().isForbidden());
        call("GET",hw(id),null,st).andExpect(status().isForbidden());
        call("POST",hw(id)+"/submissions/me/start",null,st).andExpect(status().isForbidden());
    }

    @ParameterizedTest @ValueSource(strings={"ANONYMOUS","INVALID","OTHER_TUTOR","OTHER_STUDENT"})
    void rejectsUnauthorizedObjectAccessAcrossFiveHomeworkRoutes(String who) throws Exception {
        long id=published();
        String auth=switch(who) {case "ANONYMOUS" -> null;case "INVALID" -> "Bearer invalid";
            case "OTHER_TUTOR" -> token(substitute);default -> token(outsider);};
        int expected=who.equals("ANONYMOUS")||who.equals("INVALID")?401:403;
        var b=body();b.put("version",1);
        call("POST",sessionPath(),body(),auth).andExpect(status().is(expected));
        call("PUT",hw(id),b,auth).andExpect(status().is(expected));
        call("PATCH",hw(id)+"/status",Map.of("status","CLOSED","version",1),auth).andExpect(status().is(expected));
        call("GET",hw(id),null,auth).andExpect(status().is(expected));
        call("GET",sessionPath(),null,auth).andExpect(status().is(expected));
    }

    @Test void studentsCannotManageHomeworkOrGradeAndStaffCannotSubmitAsStudent() throws Exception {
        long id=published();var s=submit(id);var b=body();b.put("version",1);
        call("POST",sessionPath(),body(),st).andExpect(status().isForbidden());
        call("PUT",hw(id),b,st).andExpect(status().isForbidden());
        call("PATCH",hw(id)+"/status",Map.of("status","CLOSED","version",1),st).andExpect(status().isForbidden());
        call("PATCH","/submissions/"+s.path("id").asLong()+"/grade",Map.of("score",10,"version",1),st).andExpect(status().isForbidden());
        for(String auth:List.of(a,t)) {
            call("POST",hw(id)+"/submissions/me/start",null,auth).andExpect(status().isForbidden());
            call("GET",hw(id)+"/submissions/me",null,auth).andExpect(status().isForbidden());
            call("PUT",hw(id)+"/submissions/me/draft",Map.of("version",0,"content","x"),auth).andExpect(status().isForbidden());
            call("PUT",hw(id)+"/submissions/me",Map.of("version",0,"content","x"),auth).andExpect(status().isForbidden());
        }
    }

    @Test void deadlineBoundaryBlocksWritingWithoutAutomaticallyClosingHomework() throws Exception {
        long id=published();start(id);
        when(clock.instant()).thenReturn(DUE.toInstant().minusSeconds(1));
        data(call("PUT",hw(id)+"/submissions/me/draft",Map.of("version",0,"content","before"),st),200);
        when(clock.instant()).thenReturn(DUE.toInstant());
        call("PUT",hw(id)+"/submissions/me",Map.of("version",1,"content","at deadline"),st).andExpect(status().isUnprocessableEntity());
        call("PUT",hw(id)+"/submissions/me/draft",Map.of("version",1,"content","late"),st).andExpect(status().isUnprocessableEntity());
        call("POST",hw(id)+"/submissions/me/start",null,st).andExpect(status().isUnprocessableEntity());
        var b=body();b.put("version",1);b.put("dueAt",DUE.plusDays(1).toString());
        call("PUT",hw(id),b,t).andExpect(status().isUnprocessableEntity());
        assertEquals(HomeworkStatus.PUBLISHED,homeworks.findById(id).orElseThrow().getStatus());
        assertEquals(SubmissionStatus.IN_PROGRESS,submissions.findByHomeworkIdAndStudentId(id,student.getId()).orElseThrow().getStatus());
        state(id,"CLOSED",1);
    }

    @Test void canGradeAfterDeadlineAndClosureAndAdminRevisionNeedsReason() throws Exception {
        long id=published();var s=submit(id);long sid=s.path("id").asLong();
        when(clock.instant()).thenReturn(DUE.plusDays(1).toInstant());state(id,"CLOSED",1);
        data(call("PATCH","/submissions/"+sid+"/grade",Map.of("score",0,"version",1),t),200);
        call("PATCH","/submissions/"+sid+"/grade",Map.of("score",5,"version",2),t).andExpect(status().isUnprocessableEntity());
        call("PATCH","/submissions/"+sid+"/grade",Map.of("score",5,"version",2),a).andExpect(status().isBadRequest());
        data(call("PATCH","/submissions/"+sid+"/grade",Map.of("score",10,"version",2,"reason","Recheck solution"),a),200);
        assertTrue(submissionChanges.findAll().stream().anyMatch(c->c.getAction().equals("REVISE")&&c.getDetails().contains("Recheck solution")));
    }

    @Test void cancelledSessionBlocksNewWorkButAllowsClosingAndGradingSubmittedWork() throws Exception {
        long id=published();var sub=submit(id);session.setStatus(SessionStatus.CANCELLED);sessions.flush();
        call("POST",sessionPath(),body(),a).andExpect(status().isUnprocessableEntity());
        var b=body();b.put("version",1);
        call("PUT",hw(id),b,a).andExpect(status().isUnprocessableEntity());
        call("POST",hw(id)+"/submissions/me/start",null,st).andExpect(status().isUnprocessableEntity());
        data(call("GET",hw(id),null,st),200);state(id,"CLOSED",1);
        data(call("PATCH","/submissions/"+sub.path("id").asLong()+"/grade",Map.of("score",10,"version",1),t),200);
    }

    @Test void studentCannotInjectScoreIdentityOrStatus() throws Exception {
        long id=published();start(id);
        for(String field:List.of("studentId","score","gradedBy","status")) {
            var b=new LinkedHashMap<String,Object>();b.put("version",0);b.put("content","answer");b.put(field,1);
            call("PUT",hw(id)+"/submissions/me",b,st).andExpect(status().isBadRequest());
        }
        assertEquals(SubmissionStatus.IN_PROGRESS,submissions.findByHomeworkIdAndStudentId(id,student.getId()).orElseThrow().getStatus());
    }

    @Test void startIsRequiredAndSubmissionNeedsContentOrLink() throws Exception {
        long id=published();
        call("PUT",hw(id)+"/submissions/me",Map.of("content","x","version",0),st).andExpect(status().isUnprocessableEntity());
        start(id);call("PUT",hw(id)+"/submissions/me",Map.of("content"," ","version",0),st).andExpect(status().isBadRequest());
        data(call("PUT",hw(id)+"/submissions/me/draft",Map.of("version",0),st),200);
        var current=submissions.findByHomeworkIdAndStudentId(id,student.getId()).orElseThrow();
        data(call("PUT",hw(id)+"/submissions/me",Map.of("resourceUrl","https://example.test/answer","version",current.getVersion()),st),200);
    }

    @Test void staleHomeworkAndSubmissionVersionsReturn409() throws Exception {
        long id=published();var b=body();b.put("version",0);
        call("PUT",hw(id),b,t).andExpect(status().isConflict());
        call("PATCH",hw(id)+"/status",Map.of("version",0,"status","CLOSED"),t).andExpect(status().isConflict());
        var s=submit(id);
        call("PATCH","/submissions/"+s.path("id").asLong()+"/grade",Map.of("score",5,"version",0),t).andExpect(status().isConflict());
    }

    @ParameterizedTest @ValueSource(strings={"title","instructions","dueAt","maxScore"})
    void rejectsMissingRequiredHomeworkFields(String field) throws Exception {
        var b=body();b.remove(field);call("POST",sessionPath(),b,t).andExpect(status().isBadRequest());
        assertEquals(0,homeworks.count());
    }
    @ParameterizedTest @ValueSource(strings={"javascript:alert(1)","http://example.test/x","https://user:pass@example.test/x","/relative"})
    void rejectsUnsafeResourceLinks(String url) throws Exception {
        var b=body();b.put("resourceUrl",url);call("POST",sessionPath(),b,t).andExpect(status().isBadRequest());
    }
    @ParameterizedTest @ValueSource(strings={"-1","0","100.123"})
    void rejectsInvalidMaxScore(String max) throws Exception {
        var b=body();b.put("maxScore",new BigDecimal(max));call("POST",sessionPath(),b,t).andExpect(status().isBadRequest());
    }
    @ParameterizedTest @ValueSource(strings={"-1","10.01","5.001"})
    void rejectsInvalidGrades(String score) throws Exception {
        long id=published();var s=submit(id);
        call("PATCH","/submissions/"+s.path("id").asLong()+"/grade",Map.of("score",new BigDecimal(score),"version",1),t)
                .andExpect(status().isBadRequest());
        assertEquals(SubmissionStatus.SUBMITTED,submissions.findById(s.path("id").asLong()).orElseThrow().getStatus());
    }
    @ParameterizedTest @ValueSource(strings={"page=-1","size=0","size=101","page=x"})
    void validatesPagination(String query) throws Exception {
        long id=published();
        call("GET",sessionPath()+"?"+query,null,t).andExpect(status().isBadRequest());
        call("GET",hw(id)+"/submissions?"+query,null,t).andExpect(status().isBadRequest());
    }
    @ParameterizedTest @ValueSource(strings={"0","-1","abc","999999999"})
    void validatesIdsAndMissingResources(String id) throws Exception {
        int code=id.equals("999999999")?404:400;
        call("GET","/homeworks/"+id,null,a).andExpect(status().is(code));
        call("GET","/sessions/"+id+"/homeworks",null,a).andExpect(status().is(code));
    }
    @Test void swaggerDescribesHomeworkAndSeparateSubmissionRoutes() throws Exception {
        var response=mvc.perform(get(API.replace("/api/v1","")+"/api-docs")).andExpect(status().isOk()).andReturn().getResponse();
        JsonNode paths=json.readTree(response.getContentAsString()).path("paths");
        for(String route:List.of("/student/homeworks","/sessions/{sessionId}/homeworks","/homeworks/{homeworkId}",
                "/homeworks/{homeworkId}/status","/homeworks/{homeworkId}/submissions/me/start",
                "/homeworks/{homeworkId}/submissions/me/draft","/homeworks/{homeworkId}/submissions/me",
                "/homeworks/{homeworkId}/submissions","/submissions/{submissionId}/grade")) assertTrue(paths.has(API+route),route);
    }

    @Test
    @Transactional(propagation=Propagation.NOT_SUPPORTED)
    @DirtiesContext(methodMode=DirtiesContext.MethodMode.AFTER_METHOD)
    void concurrentSameVersionEditsHaveOneWinner() throws Exception {
        long id=create().path("id").asLong();
        var first=body();first.put("version",0);first.put("title","First");
        var second=body();second.put("version",0);second.put("title","Second");
        var gate=new CountDownLatch(1);
        try(var executor=Executors.newFixedThreadPool(2)) {
            var f1=executor.submit(()->{gate.await();return call("PUT",hw(id),first,a).andReturn().getResponse().getStatus();});
            var f2=executor.submit(()->{gate.await();return call("PUT",hw(id),second,t).andReturn().getResponse().getStatus();});
            gate.countDown();
            assertEquals(List.of(200,409),Stream.of(f1.get(20,TimeUnit.SECONDS),f2.get(20,TimeUnit.SECONDS)).sorted().toList());
        }
        assertEquals(1,homeworks.findById(id).orElseThrow().getVersion());
        assertEquals(2,homeworkChanges.count());
    }
    @Test void studentListIncludesOnlyPublishedEnrolledHomeworkAndOwnProgress() throws Exception {
        long visible=published();
        long hidden=create().path("id").asLong();
        state(hidden,"CLOSED",0);
        create();
        enroll(student); // Multiple eligible schedules must not duplicate homework or the count.
        enroll(outsider);
        var other=startAs(visible, token(outsider));
        var result=data(call("GET","/student/homeworks",null,st),200);
        assertEquals(1,result.path("totalElements").asInt());
        var item=result.path("content").get(0);
        assertEquals(visible,item.path("homework").path("id").asLong());
        assertFalse(item.path("homework").has("createdBy"));
        assertEquals(session.getClassGroupId().longValue(),item.path("classGroupId").asLong());
        assertEquals("NOT_STARTED",item.path("submission").path("status").asText());
        assertFalse(item.path("submission").has("id"));
        assertEquals(1,submissions.count()); // Reading doesn't persist NOT_STARTED.
        assertEquals(outsider.getId().longValue(),submissions.findById(other.path("id").asLong()).orElseThrow().getStudentId());
        state(visible,"CLOSED",1);
        session.setStatus(SessionStatus.CANCELLED);sessions.flush();
        assertEquals(1,data(call("GET","/student/homeworks",null,st),200).path("totalElements").asInt());
    }

    JsonNode startAs(long id, String auth) throws Exception {
        return data(call("POST",hw(id)+"/submissions/me/start",null,auth),200);
    }

    @Test void studentListSpansClassesFiltersOwnStateAndOrdersBeforePagination() throws Exception {
        long notStarted=published();
        long inProgress=published();start(inProgress);
        long submitted=published();submit(submitted);
        var original=session;
        var c=classes.saveAndFlush(ClassGroup.builder().classType(ClassType.GROUP).status(ClassStatus.ASSIGNED)
                .enrollmentDeadline(LocalDate.of(2030,1,1)).build());
        session=sessions.saveAndFlush(Session.builder().classGroupId(c.getId()).sessionNumber(1)
                .sessionDate(original.getSessionDate()).startTime(LocalTime.of(14,0)).endTime(LocalTime.of(16,0))
                .scheduledTutorId(tutor.getId()).status(SessionStatus.SCHEDULED).build());
        long graded=published();enroll(student);var s=submit(graded);
        data(call("PATCH","/submissions/"+s.path("id").asLong()+"/grade",Map.of("score",8,"feedback","Well done","version",1),t),200);
        for(var entry:Map.of("NOT_STARTED",notStarted,"IN_PROGRESS",inProgress,"SUBMITTED",submitted,"GRADED",graded).entrySet()){
            var page=data(call("GET","/student/homeworks?status="+entry.getKey(),null,st),200);
            assertEquals(1,page.path("totalElements").asInt());
            assertEquals(entry.getValue().longValue(),page.path("content").get(0).path("homework").path("id").asLong());
            assertEquals(entry.getKey(),page.path("content").get(0).path("submission").path("status").asText());
        }
        var gradedPage=data(call("GET","/student/homeworks?status=GRADED",null,st),200);
        assertEquals(8,gradedPage.path("content").get(0).path("submission").path("score").asInt());
        assertEquals("Well done",gradedPage.path("content").get(0).path("submission").path("feedback").asText());
        var earlier=homeworks.findById(graded).orElseThrow();earlier.setDueAt(DUE.minusDays(1));homeworks.flush();
        var page=data(call("GET","/student/homeworks?size=1&page=1",null,st),200);
        assertEquals(4,page.path("totalElements").asInt());assertEquals(4,page.path("totalPages").asInt());
        assertEquals(notStarted,page.path("content").get(0).path("homework").path("id").asLong());
        assertEquals(0,data(call("GET","/student/homeworks?page=9",null,st),200).path("content").size());
        assertEquals(0,data(call("GET","/student/homeworks",null,token(outsider)),200).path("totalElements").asInt());
    }

    @ParameterizedTest @ValueSource(strings={"INACTIVE","CANCELLED","BEFORE","AFTER","OTHER_CLASS"})
    void studentListExcludesIneligibleMembership(String kind) throws Exception {
        published();
        var row=learning.findByClassGroupIdAndStatusOrderByStudentIdAscIdAsc(session.getClassGroupId(),LearningScheduleStatus.ACTIVE).getFirst();
        switch(kind) {
            case "BEFORE" -> row.setStartDate(session.getSessionDate().plusDays(1));
            case "AFTER" -> row.setEndDate(session.getSessionDate().minusDays(1));
            case "OTHER_CLASS" -> row.setClassGroupId(session.getClassGroupId()+10000);
            default -> row.setStatus(LearningScheduleStatus.valueOf(kind));
        }
        learning.flush();
        assertEquals(0,data(call("GET","/student/homeworks",null,st),200).path("totalElements").asInt());
    }

    @Test void studentListDateBoundsAreInclusiveAndUseInstants() throws Exception {
        published();
        String instant=DUE.toInstant().toString();
        assertEquals(1,data(call("GET","/student/homeworks?from="+instant+"&to="+instant,null,st),200).path("totalElements").asInt());
        assertEquals(0,data(call("GET","/student/homeworks?from="+DUE.plusSeconds(1).toInstant(),null,st),200).path("totalElements").asInt());
        assertEquals(0,data(call("GET","/student/homeworks?to="+DUE.minusSeconds(1).toInstant(),null,st),200).path("totalElements").asInt());
        when(clock.instant()).thenReturn(DUE.plusDays(1).toInstant());
        assertEquals(1,data(call("GET","/student/homeworks",null,st),200).path("totalElements").asInt());
    }

    @ParameterizedTest @ValueSource(strings={"status=PUBLISHED","status=0","from=bad","to=2030-01-01T12:00:00",
            "from=2030-02-01T00:00:00Z&to=2030-01-01T00:00:00Z","page=-1","size=0","size=101","page=x"})
    void studentListRejectsInvalidFilters(String query) throws Exception {
        call("GET","/student/homeworks?"+query,null,st).andExpect(status().isBadRequest());
    }

    @Test void studentListRequiresStudentAndIgnoresSpoofedIdentity() throws Exception {
        published();
        call("GET","/student/homeworks",null,null).andExpect(status().isUnauthorized());
        call("GET","/student/homeworks",null,"Bearer invalid").andExpect(status().isUnauthorized());
        for(String auth:List.of(a,t))call("GET","/student/homeworks",null,auth).andExpect(status().isForbidden());
        assertEquals(0,data(call("GET","/student/homeworks?studentId="+student.getId(),null,token(outsider)),200).path("totalElements").asInt());
    }

    @Test void resubmitBeforeDeadlineUpdatesSameRowAndAuditsWithoutChangingHomework() throws Exception {
        long id=published();var original=submit(id);
        when(clock.instant()).thenReturn(NOW.plusSeconds(60));
        var updated=data(call("PUT",hw(id)+"/submissions/me",Map.of("resourceUrl","https://example.test/revised","version",1),st),200);
        assertEquals(original.path("id"),updated.path("id"));assertEquals(2,updated.path("version").asLong());
        assertEquals("SUBMITTED",updated.path("status").asText());assertFalse(updated.has("content"));
        assertNotEquals(original.path("submittedAt"),updated.path("submittedAt"));
        assertEquals(1,submissions.count());assertEquals(HomeworkStatus.PUBLISHED,homeworks.findById(id).orElseThrow().getStatus());
        assertTrue(submissionChanges.findAll().stream().anyMatch(c->c.getAction().equals("RESUBMIT")
                && c.getDetails().contains("x=2") && c.getDetails().contains("https://example.test/revised")));
        call("PUT",hw(id)+"/submissions/me",Map.of("content","stale","version",1),st).andExpect(status().isConflict());
        call("PUT",hw(id)+"/submissions/me",Map.of("content"," ","version",2),st).andExpect(status().isBadRequest());
        call("PUT",hw(id)+"/submissions/me/draft",Map.of("content","draft","version",2),st).andExpect(status().isUnprocessableEntity());
        call("POST",hw(id)+"/submissions/me/start",null,st).andExpect(status().isUnprocessableEntity());
        var graded=data(call("PATCH","/submissions/"+updated.path("id").asLong()+"/grade",Map.of("score",9,"version",2),t),200);
        assertEquals("https://example.test/revised",graded.path("resourceUrl").asText());
        call("PUT",hw(id)+"/submissions/me",Map.of("content","after grading","version",3),st).andExpect(status().isUnprocessableEntity());
        assertEquals(9,data(call("GET",hw(id)+"/submissions/me",null,st),200).path("score").asInt());
    }

    @ParameterizedTest @ValueSource(strings={"DEADLINE","CLOSED","CANCELLED","UNENROLLED"})
    void resubmitRespectsDeadlineStateAndMembership(String cause) throws Exception {
        long id=published();submit(id);
        switch(cause){
            case "DEADLINE" -> when(clock.instant()).thenReturn(DUE.toInstant());
            case "CLOSED" -> state(id,"CLOSED",1);
            case "CANCELLED" -> {session.setStatus(SessionStatus.CANCELLED);sessions.flush();}
            default -> {var row=learning.findByClassGroupIdAndStatusOrderByStudentIdAscIdAsc(session.getClassGroupId(),LearningScheduleStatus.ACTIVE).getFirst();
                row.setStatus(LearningScheduleStatus.INACTIVE);learning.flush();}
        }
        call("PUT",hw(id)+"/submissions/me",Map.of("content","replacement","version",1),st)
                .andExpect(status().is(cause.equals("UNENROLLED")?403:422));
        assertEquals("x=2",submissions.findByHomeworkIdAndStudentId(id,student.getId()).orElseThrow().getContent());
    }

    @ParameterizedTest @ValueSource(strings={"ANONYMOUS","INVALID","OTHER_TUTOR","OTHER_STUDENT"})
    void submissionRoutesRejectUnauthorizedActors(String who) throws Exception {
        long id=published();var s=submit(id);
        String auth=switch(who){case "ANONYMOUS" -> null;case "INVALID" -> "Bearer invalid";
            case "OTHER_TUTOR" -> token(substitute);default -> token(outsider);};
        int code=who.equals("ANONYMOUS")||who.equals("INVALID")?401:403;
        call("GET",hw(id)+"/submissions/me",null,auth).andExpect(status().is(code));
        call("PUT",hw(id)+"/submissions/me",Map.of("content","answer","version",1),auth).andExpect(status().is(code));
        call("GET",hw(id)+"/submissions",null,auth).andExpect(status().is(code));
        call("PATCH","/submissions/"+s.path("id").asLong()+"/grade",Map.of("score",5,"version",1),auth).andExpect(status().is(code));
    }

    @Test
    @Transactional(propagation=Propagation.NOT_SUPPORTED)
    @DirtiesContext(methodMode=DirtiesContext.MethodMode.AFTER_METHOD)
    void concurrentResubmitAndGradeCannotOverwriteEachOther() throws Exception {
        long id=published();var s=submit(id);long sid=s.path("id").asLong();
        var gate=new CountDownLatch(1);
        try(var executor=Executors.newFixedThreadPool(2)){
            var resubmit=executor.submit(()->{gate.await();return call("PUT",hw(id)+"/submissions/me",
                    Map.of("content","replacement","version",1),st).andReturn().getResponse().getStatus();});
            var grade=executor.submit(()->{gate.await();return call("PATCH","/submissions/"+sid+"/grade",
                    Map.of("score",7,"version",1),t).andReturn().getResponse().getStatus();});
            gate.countDown();
            assertEquals(List.of(200,409),Stream.of(resubmit.get(20,TimeUnit.SECONDS),grade.get(20,TimeUnit.SECONDS)).sorted().toList());
        }
        var saved=submissions.findById(sid).orElseThrow();
        assertEquals(2,saved.getVersion());assertEquals(3,submissionChanges.count());
        if(saved.getStatus()==SubmissionStatus.GRADED){assertEquals("x=2",saved.getContent());assertEquals(0,new BigDecimal("7").compareTo(saved.getScore()));}
        else {assertEquals("replacement",saved.getContent());assertNull(saved.getScore());}
    }

    // ── Quiz: open window, password, late work, questions, photos, notifications ──

    static final byte[] JPEG={(byte)0xFF,(byte)0xD8,(byte)0xFF,(byte)0xE0,0,16,'J','F','I','F',0};
    Map<String,Object> mc(String prompt,int correct,int points) {
        return Map.of("type","MULTIPLE_CHOICE","prompt",prompt,"options",List.of("A","B","C"),"correctOption",correct,"points",points);
    }
    Map<String,Object> essay(String prompt,int points) { return Map.of("type","ESSAY","prompt",prompt,"points",points); }
    Map<String,Object> quizBody(List<Map<String,Object>> questions,int max) {
        var b=body();b.remove("allowLateSubmission");b.put("questions",questions);b.put("maxScore",max);return b;
    }
    long publish(Map<String,Object> b) throws Exception {
        long id=data(call("POST",sessionPath(),b,t),201).path("id").asLong();state(id,"PUBLISHED",0);return id;
    }
    ResultActions upload(long id,byte[] bytes,String name,String auth) throws Exception {
        return mvc.perform(multipart(API+hw(id)+"/submissions/me/attachments")
                .file(new org.springframework.mock.web.MockMultipartFile("file",name,"image/jpeg",bytes)).header("Authorization",auth));
    }
    List<Notification> notificationsOf(User u) { return notificationRows.findAll().stream().filter(n->n.getUserId().equals(u.getId())).toList(); }

    @Test void lateWorkIsAcceptedAndTutorIsToldHowLate() throws Exception {
        var b=body();b.remove("allowLateSubmission");long id=publish(b);var s=start(id);
        when(clock.instant()).thenReturn(DUE.toInstant().plusSeconds(2*3600+5*60));
        var late=data(call("PUT",hw(id)+"/submissions/me",Map.of("content","late answer","version",s.path("version").asLong()),st),200);
        assertEquals("SUBMITTED",late.path("status").asText());assertEquals(7500,late.path("lateSeconds").asLong());
        var note=notificationsOf(tutor).getFirst();
        assertEquals("HOMEWORK_LATE_SUBMISSION",note.getType());assertTrue(note.getMessage().contains("trễ 2 giờ 5 phút"),note.getMessage());
        assertEquals("/tutor/homeworks/"+id,note.getLink());
        assertEquals(1,data(call("GET","/me/notifications/unread-count",null,t),200).path("count").asInt());
        assertEquals(1,data(call("GET","/me/notifications?unreadOnly=true",null,t),200).path("totalElements").asInt());
        call("PATCH","/me/notifications/"+note.getId()+"/read",null,st).andExpect(status().isNotFound());
        data(call("PATCH","/me/notifications/read-all",null,t),200);
        assertEquals(0,data(call("GET","/me/notifications/unread-count",null,t),200).path("count").asInt());
        state(id,"CLOSED",1);
        call("PUT",hw(id)+"/submissions/me",Map.of("content","after close","version",late.path("version").asLong()),st)
                .andExpect(status().isUnprocessableEntity());
    }

    @Test void openAtBlocksStartingUntilTheWindowOpens() throws Exception {
        var b=body();b.put("openAt",NOW.plusSeconds(3600).toString());
        long id=publish(b);
        assertEquals(NOW.plusSeconds(3600),Instant.parse(data(call("GET",hw(id),null,st),200).path("openAt").asText()));
        assertEquals("HOMEWORK_NOT_OPEN",json.readTree(call("POST",hw(id)+"/submissions/me/start",null,st)
                .andExpect(status().isUnprocessableEntity()).andReturn().getResponse().getContentAsString()).path("errorCode").asText());
        when(clock.instant()).thenReturn(NOW.plusSeconds(3600));
        start(id);
        b.put("openAt",DUE.plusSeconds(1).toString());
        call("POST",sessionPath(),b,t).andExpect(status().isBadRequest());
    }

    @Test void passwordGuardsFirstStartAndQuestionsStayHiddenUntilThen() throws Exception {
        var b=quizBody(List.of(mc("2+2?",1,10)),10);b.put("accessPassword","AiTA");
        long id=publish(b);
        var view=data(call("GET",hw(id),null,st),200);
        assertTrue(view.path("passwordProtected").asBoolean());assertFalse(view.has("questions"));
        assertFalse(homeworks.findById(id).orElseThrow().getAccessPasswordHash().contains("AiTA"));
        call("POST",hw(id)+"/submissions/me/start",null,st).andExpect(status().isForbidden());
        call("POST",hw(id)+"/submissions/me/start",Map.of("password","wrong"),st).andExpect(status().isForbidden());
        data(call("POST",hw(id)+"/submissions/me/start",Map.of("password","AiTA"),st),200);
        var question=data(call("GET",hw(id),null,st),200).path("questions").get(0);
        assertEquals("2+2?",question.path("prompt").asText());assertFalse(question.has("correctOption"));
        assertEquals(1,data(call("GET",hw(id),null,t),200).path("questions").get(0).path("correctOption").asInt());
        start(id); // resuming needs no password
        var weak=body();weak.put("accessPassword","abc");call("POST",sessionPath(),weak,t).andExpect(status().isBadRequest());
    }

    @Test void multipleChoiceOnlyQuizIsGradedOnSubmit() throws Exception {
        long id=publish(quizBody(List.of(mc("Q1",0,4),mc("Q2",2,6)),10));
        var s=start(id);var q=data(call("GET",hw(id),null,st),200).path("questions");
        upload(id,JPEG,"photo.jpg",st).andExpect(status().isUnprocessableEntity());
        var answers=List.of(Map.of("questionId",q.get(0).path("id").asLong(),"selectedOption",0),
                Map.of("questionId",q.get(1).path("id").asLong(),"selectedOption",1));
        var graded=data(call("PUT",hw(id)+"/submissions/me",Map.of("answers",answers,"version",s.path("version").asLong()),st),200);
        assertEquals("GRADED",graded.path("status").asText());assertEquals(4,graded.path("score").asInt());
        assertTrue(graded.path("autoGraded").asBoolean());assertEquals(4,graded.path("answers").get(0).path("score").asInt());
        assertTrue(notificationsOf(tutor).getFirst().getMessage().contains("4/10"));
        // The tutor may still review once to leave feedback; the score stays the computed one.
        var reviewed=data(call("PATCH","/submissions/"+graded.path("id").asLong()+"/grade",
                Map.of("feedback","Xem lại câu 2","version",graded.path("version").asLong()),t),200);
        assertEquals(4,reviewed.path("score").asInt());assertEquals("Xem lại câu 2",reviewed.path("feedback").asText());
        call("PATCH","/submissions/"+graded.path("id").asLong()+"/grade",Map.of("version",reviewed.path("version").asLong()),t)
                .andExpect(status().isUnprocessableEntity());
    }

    @Test void multiAnswerQuestionNeedsExactlyTheCorrectSet() throws Exception {
        var multi=Map.<String,Object>of("type","MULTIPLE_CHOICE","prompt","Số nguyên tố?","options",List.of("2","4","3","9"),
                "correctOptions",List.of(2,0),"points",3);
        // correctOption, when sent too, must be the first correct index; indexes must be in range
        call("POST",sessionPath(),quizBody(List.of(Map.of("type","MULTIPLE_CHOICE","prompt","Q","options",List.of("A","B"),
                "correctOption",1,"correctOptions",List.of(0,1),"points",1)),1),t).andExpect(status().isBadRequest());
        call("POST",sessionPath(),quizBody(List.of(Map.of("type","MULTIPLE_CHOICE","prompt","Q","options",List.of("A","B"),
                "correctOptions",List.of(0,5),"points",1)),1),t).andExpect(status().isBadRequest());
        long id=publish(quizBody(List.of(multi,mc("Q2",1,1)),4));

        var staffView=data(call("GET",hw(id),null,t),200).path("questions").get(0);
        assertEquals("[0,2]",staffView.path("correctOptions").toString());assertEquals(0,staffView.path("correctOption").asInt());
        assertEquals(2,staffView.path("selectCount").asInt());
        var s=start(id);var q=data(call("GET",hw(id),null,st),200).path("questions");
        assertEquals(2,q.get(0).path("selectCount").asInt());assertEquals(1,q.get(1).path("selectCount").asInt());
        assertFalse(q.get(0).has("correctOptions"));assertFalse(q.get(0).has("correctOption"));
        long q1=q.get(0).path("id").asLong(), q2=q.get(1).path("id").asLong();

        // More picks than the question asks for, or a repeated pick, is rejected
        call("PUT",hw(id)+"/submissions/me/draft",Map.of("answers",List.of(Map.of("questionId",q1,"selectedOptions",List.of(0,1,2))),
                "version",s.path("version").asLong()),st).andExpect(status().isBadRequest());
        call("PUT",hw(id)+"/submissions/me/draft",Map.of("answers",List.of(Map.of("questionId",q2,"selectedOptions",List.of(0,1))),
                "version",s.path("version").asLong()),st).andExpect(status().isBadRequest());
        call("PUT",hw(id)+"/submissions/me/draft",Map.of("answers",List.of(Map.of("questionId",q1,"selectedOptions",List.of(0,0))),
                "version",s.path("version").asLong()),st).andExpect(status().isBadRequest());

        // Only half of the correct set scores nothing; the single-answer question still works with selectedOption
        var half=data(call("PUT",hw(id)+"/submissions/me/draft",Map.of("answers",List.of(Map.of("questionId",q1,"selectedOptions",List.of(0)),
                Map.of("questionId",q2,"selectedOption",1)),"version",s.path("version").asLong()),st),200);
        assertEquals("[0]",half.path("answers").get(0).path("selectedOptions").toString());
        var graded=data(call("PUT",hw(id)+"/submissions/me",Map.of("answers",List.of(Map.of("questionId",q1,"selectedOptions",List.of(2,0)),
                Map.of("questionId",q2,"selectedOption",1)),"version",half.path("version").asLong()),st),200);
        assertEquals("GRADED",graded.path("status").asText());assertEquals(4,graded.path("score").asInt());
        assertEquals("[0,2]",graded.path("answers").get(0).path("selectedOptions").toString());
        assertEquals(3,graded.path("answers").get(0).path("score").asInt());
    }

    @Test void questionPointsAddUpToAtMostTen() throws Exception {
        var tooMuch=json.readTree(call("POST",sessionPath(),quizBody(List.of(mc("Q1",0,6),mc("Q2",1,5)),11),t)
                .andExpect(status().isBadRequest()).andReturn().getResponse().getContentAsString());
        assertEquals("QUIZ_TOTAL_TOO_HIGH",tooMuch.path("errorCode").asText());
        // Exactly 10 (fractional points included) and less than 10 are fine; free homework keeps any maxScore
        var tenths=new java.util.ArrayList<Map<String,Object>>();
        for(int i=0;i<3;i++) tenths.add(Map.of("type","ESSAY","prompt","E"+i,"points",new BigDecimal("3.34")));
        tenths.set(2,Map.of("type","ESSAY","prompt","E2","points",new BigDecimal("3.32")));
        data(call("POST",sessionPath(),quizBody(tenths,10),t),201);
        data(call("POST",sessionPath(),quizBody(List.of(mc("Q",0,4)),4),t),201);
        var free=body();free.put("maxScore",100);data(call("POST",sessionPath(),free,t),201);
    }

    @Test void multiAnswerPartialPickScoresZero() throws Exception {
        var multi=Map.<String,Object>of("type","MULTIPLE_CHOICE","prompt","Q","options",List.of("A","B","C"),
                "correctOptions",List.of(0,1),"points",2);
        long id=publish(quizBody(List.of(multi),2));
        var s=start(id);long q1=data(call("GET",hw(id),null,st),200).path("questions").get(0).path("id").asLong();
        var graded=data(call("PUT",hw(id)+"/submissions/me",Map.of("answers",List.of(Map.of("questionId",q1,"selectedOptions",List.of(0,2))),
                "version",s.path("version").asLong()),st),200);
        assertEquals(0,graded.path("score").asInt());
    }

    @Test void essayQuizTakesPhotosAndTutorGradesEachEssay() throws Exception {
        long id=publish(quizBody(List.of(mc("Q1",0,4),essay("Prove it",6)),10));
        var s=start(id);var q=data(call("GET",hw(id),null,st),200).path("questions");
        long essayId=q.get(1).path("id").asLong();
        var photo=data(upload(id,JPEG,"../../bài làm.jpg",st),200);
        assertEquals("image/jpeg",photo.path("contentType").asText());assertEquals("bài làm.jpg",photo.path("fileName").asText());
        upload(id,"not an image".getBytes(),"x.jpg",st).andExpect(status().isBadRequest());
        var answers=List.of(Map.of("questionId",q.get(0).path("id").asLong(),"selectedOption",0),
                Map.of("questionId",essayId,"textAnswer","See photo"));
        var submitted=data(call("PUT",hw(id)+"/submissions/me",Map.of("answers",answers,"version",s.path("version").asLong()),st),200);
        assertEquals("SUBMITTED",submitted.path("status").asText());assertEquals(4,submitted.path("autoScore").asInt());
        assertFalse(submitted.path("answers").get(0).has("score")); // hidden until graded
        upload(id,JPEG,"more.jpg",st).andExpect(status().isUnprocessableEntity());

        var row=data(call("GET",hw(id)+"/submissions",null,t),200).path("content").get(0);
        assertEquals("STUDENT",row.path("studentName").asText());assertEquals(1,row.path("attachments").size());
        long fileId=row.path("attachments").get(0).path("id").asLong();
        var file=mvc.perform(get(API+"/submission-attachments/"+fileId).header("Authorization",t)).andExpect(status().isOk()).andReturn().getResponse();
        assertEquals("image/jpeg",file.getContentType());assertArrayEquals(JPEG,file.getContentAsByteArray());
        enroll(outsider);
        mvc.perform(get(API+"/submission-attachments/"+fileId).header("Authorization",token(outsider))).andExpect(status().isNotFound());
        mvc.perform(get(API+"/submission-attachments/"+fileId).header("Authorization",token(substitute))).andExpect(status().isForbidden());

        long sid=submitted.path("id").asLong(), v=submitted.path("version").asLong();
        call("PATCH","/submissions/"+sid+"/grade",Map.of("score",9,"version",v),t).andExpect(status().isBadRequest());
        call("PATCH","/submissions/"+sid+"/grade",Map.of("answerScores",Map.of(essayId,7),"version",v),t).andExpect(status().isBadRequest());
        var graded=data(call("PATCH","/submissions/"+sid+"/grade",Map.of("answerScores",Map.of(essayId,5),"feedback","Tốt","version",v),t),200);
        assertEquals(9,graded.path("score").asInt());
        var mine=data(call("GET",hw(id)+"/submissions/me",null,st),200);
        assertEquals(9,mine.path("score").asInt());assertEquals("Tốt",mine.path("feedback").asText());
        assertEquals(5,mine.path("answers").get(1).path("score").asInt());
        var note=notificationsOf(student).stream().filter(n->n.getType().equals("HOMEWORK_GRADED")).findFirst().orElseThrow();
        assertTrue(note.getMessage().contains("9/10"),note.getMessage());
    }

    @Test void questionsMustMatchMaxScoreAndFreezeOncePublished() throws Exception {
        call("POST",sessionPath(),quizBody(List.of(mc("Q1",0,4)),10),t).andExpect(status().isBadRequest());
        call("POST",sessionPath(),quizBody(List.of(Map.of("type","MULTIPLE_CHOICE","prompt","Q","options",List.of("A"),"correctOption",0,"points",1)),1),t)
                .andExpect(status().isBadRequest());
        call("POST",sessionPath(),quizBody(List.of(mc("Q",3,1)),1),t).andExpect(status().isBadRequest());
        call("POST",sessionPath(),quizBody(List.of(Map.of("type","ESSAY","prompt","Q","correctOption",0,"points",1)),1),t)
                .andExpect(status().isBadRequest());
        var draft=quizBody(List.of(mc("Q1",0,4)),4);
        long id=data(call("POST",sessionPath(),draft,t),201).path("id").asLong();
        draft.put("version",0);draft.put("questions",List.of(mc("Q1",1,4),essay("E",6)));draft.put("maxScore",10);
        assertEquals(2,data(call("PUT",hw(id),draft,t),200).path("questions").size());
        state(id,"PUBLISHED",1);
        draft.put("version",2);draft.put("questions",List.of(mc("Q1",0,4),essay("E",6)));
        call("PUT",hw(id),draft,t).andExpect(status().isUnprocessableEntity());
        draft.remove("questions");draft.put("accessPassword","new-pass");
        assertTrue(data(call("PUT",hw(id),draft,t),200).path("passwordProtected").asBoolean());
    }

    @Test void publishingNotifiesEnrolledStudentsAndTutorListCountsWork() throws Exception {
        long id=publish(body());
        var note=notificationsOf(student).getFirst();
        assertEquals("HOMEWORK_PUBLISHED",note.getType());assertEquals("/student/homework/"+id,note.getLink());
        assertTrue(notificationsOf(outsider).isEmpty());
        // The email goes to the same enrolled students (sent after commit by HomeworkPublishedMailer)
        var mail=events.stream(HomeworkPublishedEvent.class).toList();
        assertEquals(1,mail.size());assertEquals(id,mail.getFirst().homeworkId());
        assertEquals(List.of(student.getId()),mail.getFirst().studentIds());
        submit(id);
        var item=data(call("GET","/tutor/homeworks",null,t),200).path("content").get(0);
        assertEquals(id,item.path("homework").path("id").asLong());assertEquals(1,item.path("submittedCount").asInt());
        assertEquals(0,data(call("GET","/tutor/homeworks",null,token(substitute)),200).path("totalElements").asInt());
        call("GET","/tutor/homeworks",null,st).andExpect(status().isForbidden());
    }

}
