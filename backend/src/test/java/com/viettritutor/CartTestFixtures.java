package com.viettritutor;
import com.viettritutor.entity.*;
import com.viettritutor.enums.*;
import com.viettritutor.repository.*;
import com.viettritutor.service.SubjectService;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.transaction.annotation.Transactional;
import java.math.BigDecimal;
import java.time.*;
import java.util.UUID;
@RequiredArgsConstructor
public class CartTestFixtures {
 private final UserRepository users; private final CourseRepository courses;
 private final ClassGroupRepository classes; private final SessionRepository sessions;
 private final SubjectService subjects; private final PasswordEncoder encoder; private final Clock clock;
 @Value("${cart.test.password}") private String password;
 @Value("${cart.test.email-domain}") private String domain;
 public record Data(User admin,User tutor,User student,User other,Course math,Course science,ClassGroup a,ClassGroup b,ClassGroup overlap,ClassGroup alternative){}
 @Transactional public Data seed(){return seed(UUID.randomUUID().toString());}
 @Transactional public Data seed(String prefix){
  String hash=encoder.encode(password);
  var admin=user("ADMIN",prefix+"-admin",hash);var tutor=user("TUTOR",prefix+"-tutor",hash);
  var student=user("STUDENT",prefix+"-student",hash);var other=user("STUDENT",prefix+"-other",hash);
  var math=course("MATH",new BigDecimal("1000000"));var science=course("SCIENCE",new BigDecimal("1500000"));
  var a=group(math,8,30);var b=group(science,10,30);var overlap=group(science,8,30);var alternative=group(math,8,40);
  return new Data(admin,tutor,student,other,math,science,a,b,overlap,alternative);
 }
 private User user(String role,String label,String hash){return users.saveAndFlush(User.builder().email(label+"@"+domain).password(hash).fullName("Order "+label).role("ROLE_"+role).enabled(true).build());}
 private Course course(String name,BigDecimal price){var subject=subjects.resolve(name);return courses.saveAndFlush(Course.builder().name("Order "+name).subject(name).subjectId(subject.getId()).gradeLevel(GradeLevel.GRADE_10).basePrice1on1(price).totalSessions(2).durationMinutes(120).build());}
 private ClassGroup group(Course course,int hour,int days){
  LocalDate start=LocalDate.now(clock).plusDays(days);
  var group=classes.saveAndFlush(ClassGroup.builder().course(course).classType(ClassType.GROUP).status(ClassStatus.ENROLLING)
   .classCode("ORDER-"+UUID.randomUUID()).deliveryMode(DeliveryMode.ONLINE).schedulePattern(SchedulePattern.MON_WED_FRI)
   .timeSlot(TimeSlot.SLOT_MORNING).startDate(start).enrollmentDeadline(start.minusDays(2)).maxStudents(8).totalSessions(2).build());
  for(int i=1;i<=2;i++)sessions.saveAndFlush(Session.builder().classGroupId(group.getId()).sessionNumber(i)
   .sessionDate(start.plusDays((i-1)*2L)).startTime(LocalTime.of(hour,0)).endTime(LocalTime.of(hour+2,0)).status(SessionStatus.SCHEDULED).build());
  return group;
 }
}
