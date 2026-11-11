package com.viettritutor.service;

import com.viettritutor.document.MeetingParticipantLog;
import com.viettritutor.entity.Session;
import com.viettritutor.repository.mongo.MeetingParticipantLogRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.*;
import java.util.*;

/**
 * ATT-01: minutes each user spent in a session's online classroom, from the LiveKit participant logs.
 * Counts every JOINED→LEFT stay (not only the last one) in the session room and the class room,
 * clipped to the session's scheduled time. A stay still open counts up to now.
 */
@Service
@RequiredArgsConstructor
public class MeetingPresenceService {
    private final MeetingParticipantLogRepository logs;
    private final Clock clock;

    public Map<Long,Integer> minutesInClass(Session session) {
        ZoneId zone=clock.getZone();
        Instant from=LocalDateTime.of(session.getSessionDate(),session.getStartTime()).atZone(zone).toInstant();
        Instant to=LocalDateTime.of(session.getSessionDate(),session.getEndTime()).atZone(zone).toInstant();
        List<MeetingParticipantLog> found=new ArrayList<>(logs.findBySessionId("classroom-session-"+session.getId()));
        found.addAll(logs.findBySessionId("classroom-class-"+session.getClassGroupId()));
        Map<Long,Long> seconds=new HashMap<>();
        for(MeetingParticipantLog log:found) {
            Long userId=userId(log);
            if(userId==null) continue;
            seconds.merge(userId,overlapSeconds(log,from,to,clock.instant()),Long::sum);
        }
        Map<Long,Integer> minutes=new HashMap<>();
        seconds.forEach((user,s) -> minutes.put(user,(int) (s/60)));
        return minutes;
    }

    /** LiveKit identity is the user id (see MeetingServiceImpl). */
    private static Long userId(MeetingParticipantLog log) {
        if(log.getUserId()!=null) return log.getUserId();
        try { return Long.valueOf(log.getParticipantIdentity()); }
        catch(NumberFormatException | NullPointerException ex) { return null; }
    }

    static long overlapSeconds(MeetingParticipantLog log,Instant from,Instant to,Instant now) {
        List<Instant[]> stays=new ArrayList<>();
        Instant openedAt=null;
        List<MeetingParticipantLog.ParticipantEvent> events=log.getEventHistory()==null ? List.of() : log.getEventHistory().stream()
                .filter(e -> e.getTimestamp()!=null).sorted(Comparator.comparing(MeetingParticipantLog.ParticipantEvent::getTimestamp)).toList();
        for(var event:events) {
            if("JOINED".equals(event.getEvent())) {
                if(openedAt==null) openedAt=event.getTimestamp();
            } else if("LEFT".equals(event.getEvent()) && openedAt!=null) {
                stays.add(new Instant[]{openedAt,event.getTimestamp()});
                openedAt=null;
            }
        }
        if(openedAt!=null) stays.add(new Instant[]{openedAt,now});
        // Old logs without event history still carry their last stay.
        if(events.isEmpty() && log.getJoinedAt()!=null)
            stays.add(new Instant[]{log.getJoinedAt(),log.getLeftAt()!=null ? log.getLeftAt() : now});
        long total=0;
        for(Instant[] stay:stays) {
            Instant start=stay[0].isAfter(from) ? stay[0] : from;
            Instant end=stay[1].isBefore(to) ? stay[1] : to;
            if(end.isAfter(start)) total+=Duration.between(start,end).getSeconds();
        }
        return total;
    }
}
