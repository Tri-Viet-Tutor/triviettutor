package com.viettritutor;

import com.viettritutor.entity.*;
import com.viettritutor.enums.*;
import com.viettritutor.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.transaction.annotation.Transactional;
import java.math.BigDecimal;
import java.time.*;
import java.util.*;

/** Test-only teaching evidence and salary fixtures; never loaded by production component scanning. */
@RequiredArgsConstructor
public class PayrollTestFixtures {
    private final UserRepository users;
    private final TutorProfileRepository profiles;
    private final ClassGroupRepository classes;
    private final SessionRepository sessions;
    private final AttendanceRosterRepository rosters;
    private final AttendanceRecordRepository records;
    private final SessionChangeRepository changes;
    private final PasswordEncoder encoder;
    private final JdbcTemplate jdbc;
    private final Clock clock;
    @Value("${payroll.test.password}") private String password;
    @Value("${payroll.test.email-domain}") private String emailDomain;

    public record Data(User admin,User tutor,User substitute,User student,User idle,User disabled,
            Long classId,YearMonth month,List<Long> completed,List<Long> cancelled,Long substituted) {}

    @Transactional
    public Data seed() {
        YearMonth month=YearMonth.now(clock).minusMonths(1);
        User admin=user("ADMIN","admin",true,month), tutor=user("TUTOR","tutor",true,month),
                substitute=user("TUTOR","substitute",true,month),student=user("STUDENT","student",true,month),
                idle=user("TUTOR","idle",true,month),disabled=user("TUTOR","disabled",false,month);
        profile(tutor,"5000000","200000");profile(substitute,"4000000","250000");
        profile(idle,"3000000","150000");profile(disabled,"1000000","100000");
        var group=classes.saveAndFlush(ClassGroup.builder().classType(ClassType.GROUP).status(ClassStatus.ASSIGNED)
                .enrollmentDeadline(month.atDay(1).minusDays(3)).build());
        List<Long> completed=new ArrayList<>(),cancelled=new ArrayList<>();
        for(int i=1;i<=8;i++)completed.add(lesson(group.getId(),month.atDay(i),i,tutor,tutor,student,admin,true).getId());
        for(int i=9;i<=10;i++){
            Session s=lesson(group.getId(),month.atDay(i),i,tutor,tutor,student,admin,false);
            cancelled.add(s.getId());
            changes.saveAndFlush(SessionChange.builder().sessionId(s.getId()).actorId(admin.getId())
                    .action(SessionChangeType.CANCEL).reason("Tutor absent; no substitute")
                    .changedAt(OffsetDateTime.now(clock)).previousStatus(SessionStatus.SCHEDULED)
                    .newStatus(SessionStatus.CANCELLED).scheduledTutorId(tutor.getId()).previousTutorId(tutor.getId()).build());
        }
        Long replacement=lesson(group.getId(),month.atDay(11),11,tutor,substitute,student,admin,true).getId();
        return new Data(admin,tutor,substitute,student,idle,disabled,group.getId(),month,List.copyOf(completed),List.copyOf(cancelled),replacement);
    }

    private User user(String role,String label,boolean enabled,YearMonth month) {
        User u=users.saveAndFlush(User.builder().email(label+"@"+emailDomain).fullName("Payroll "+label)
                .role("ROLE_"+role).password(encoder.encode(password)).enabled(enabled).build());
        jdbc.update("update users set created_at=? where id=?",month.minusYears(1).atDay(1).atStartOfDay(),u.getId());
        return u;
    }
    private void profile(User u,String base,String rate) {
        TutorProfile p=new TutorProfile();p.setUser(u);p.setBaseSalary(new BigDecimal(base));
        p.setSessionRate(new BigDecimal(rate));profiles.saveAndFlush(p);
    }
    public Session lesson(Long groupId,LocalDate date,int number,User scheduled,User actual,User student,User admin,boolean completed) {
        Session s=sessions.saveAndFlush(Session.builder().classGroupId(groupId).sessionNumber(number)
                .sessionDate(date).startTime(LocalTime.of(8,0)).endTime(LocalTime.of(10,0))
                .scheduledTutorId(scheduled.getId()).actualTutorId(actual.getId()).actualTutorOverridden(!scheduled.getId().equals(actual.getId()))
                .status(completed?SessionStatus.COMPLETED:SessionStatus.CANCELLED)
                .attendanceRosterCaptured(completed).attendanceLocked(completed).attendanceAutoProcessed(true)
                .taughtByTutorId(completed?actual.getId():null).teachingConfirmedBy(completed?actual.getId():null)
                .teachingConfirmedAt(completed?date.atTime(10,0).atZone(clock.getZone()).toOffsetDateTime():null).build());
        if(completed){
            rosters.saveAndFlush(AttendanceRosterMember.builder().sessionId(s.getId()).studentId(student.getId()).enrollmentId(s.getId()).build());
            records.saveAndFlush(AttendanceRecord.builder().sessionId(s.getId()).studentId(student.getId()).status(AttendanceStatus.PRESENT)
                    .recordedBy(actual.getId()).recordedAt(OffsetDateTime.now(clock)).build());
        }
        return s;
    }
}
