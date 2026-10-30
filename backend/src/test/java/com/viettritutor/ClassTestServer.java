package com.viettritutor;

import com.viettritutor.dto.catalog.*;
import com.viettritutor.entity.*;
import com.viettritutor.enums.*;
import com.viettritutor.repository.*;
import com.viettritutor.service.ClassService;
import org.springframework.boot.*;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;
import java.math.BigDecimal;
import java.time.*;
import java.util.UUID;

/** Isolated HTTP fixtures. Test sources never enter the production jar. */
public class ClassTestServer {
 public static void main(String[] args) {
  if (System.getenv("CLASS_TEST_PASSWORD")==null || System.getenv("CLASS_TEST_PASSWORD").isBlank())
   throw new IllegalStateException("Use the local start-class-test-backend.ps1 script");
  new SpringApplication(VietTriTutorApplication.class, Fixtures.class).run(
   "--spring.profiles.active=class-test", "--server.address=127.0.0.1",
   "--server.port="+System.getenv().getOrDefault("CLASS_TEST_PORT","8082"),
   "--spring.datasource.url=jdbc:h2:mem:class-http-test;MODE=PostgreSQL;DB_CLOSE_DELAY=-1",
   "--spring.datasource.driver-class-name=org.h2.Driver","--spring.datasource.username=sa","--spring.datasource.password=",
   "--spring.jpa.hibernate.ddl-auto=create-drop","--spring.jpa.show-sql=false","--spring.flyway.enabled=false",
   "--spring.mail.host=127.0.0.1","--spring.mail.port=1","--spring.mail.username=test@example.test","--spring.mail.password=unused",
   "--app.jwt.secret="+UUID.randomUUID()+UUID.randomUUID());
 }
 @TestConfiguration(proxyBeanMethods=false)
 static class Fixtures {
  @Bean ApplicationRunner classFixtures(UserRepository users, PasswordEncoder encoder, CourseRepository courses,
   ClassGroupRepository classes, LearningScheduleRepository rosters, SessionRepository sessions,
   ClassService service, com.viettritutor.service.SubjectService subjects, PlatformTransactionManager manager, Clock clock) {
   return args -> new TransactionTemplate(manager).executeWithoutResult(tx -> {
    String hash=encoder.encode(System.getenv("CLASS_TEST_PASSWORD"));
    User admin=null, student=null, tutor=null;
    for(String role:new String[]{"ADMIN","TUTOR","STUDENT"}) {
     User u=users.saveAndFlush(User.builder().email(role.toLowerCase()+"@class-test.local").password(hash)
      .fullName("Class Test "+role).role("ROLE_"+role).enabled(true).build());
     if(role.equals("ADMIN")) admin=u;
     if(role.equals("STUDENT")) student=u;
     if(role.equals("TUTOR")) tutor=u;
    }
    int index=0;
    for(String fixture:new String[]{"REOPEN","KEEP","COLLECT","REFUND"}) {
     Course course=courses.saveAndFlush(Course.builder().name("Fixture "+fixture).subject("FIXTURE_"+fixture).subjectId(subjects.resolve("FIXTURE_"+fixture).getId())
      .gradeLevel(GradeLevel.GRADE_10).basePrice1on1(new BigDecimal("8000000")).totalSessions(4).durationMinutes(120).build());
     CreateClassRequest r=new CreateClassRequest();r.setCourseId(course.getId());r.setClassType(ClassType.GROUP);
     r.setDeliveryMode(DeliveryMode.ONLINE);r.setSchedulePattern(SchedulePattern.MON_WED_FRI);r.setTimeSlot(TimeSlot.SLOT_MORNING);
     r.setStartDate(LocalDate.now(clock).plusDays(30+21L*index++));r.setTutorId(tutor.getId());
     Long id=service.create(r,admin).getId();
     ChangeClassStatusRequest status=new ChangeClassStatusRequest();status.setNewStatus(ClassStatus.PUBLISHED);service.changeStatus(id,status,admin);
     status.setNewStatus(ClassStatus.ENROLLING);service.changeStatus(id,status,admin);
     var all=sessions.findByClassGroupIdOrderBySessionNumberAsc(id);
     rosters.saveAndFlush(LearningSchedule.builder().enrollmentId(id).classGroupId(id).studentId(student.getId())
      .startDate(all.getFirst().getSessionDate()).endDate(all.getLast().getSessionDate()).status(LearningScheduleStatus.ACTIVE).build());
     classes.findById(id).orElseThrow().setEnrollmentDeadline(LocalDate.now(clock).minusDays(1));
     status.setNewStatus(ClassStatus.FAILED_TO_OPEN);service.changeStatus(id,status,admin);
    }
   });
  }
 }
}
