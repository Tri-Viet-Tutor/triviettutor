#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
VietTriTutor - Meeting Flow Seed Data Generator
Generates realistic, referentially sound seed data for the Online Meeting workflow:
- 5 Online Class Groups (IN_PROGRESS / ONLINE)
- 50 Tutor Assignments
- 50 Enrollments & Learning Schedules
- 50 Sessions (Today In-Session, Past Completed, Future Scheduled)
- 50 Attendance Roster entries
- 50 Attendance Records
- 50 Tutor Reviews
- MongoDB seed json for LiveKit audit logs & participants
"""

import json
from datetime import datetime, timedelta

def main():
    today = datetime.now().date()
    today_str = today.strftime("%Y-%m-%d")
    
    # -------------------------------------------------------------
    # 1. CLASS GROUPS FOR ONLINE MEETINGS (IDs 20 - 24)
    # -------------------------------------------------------------
    class_groups = [
        (20, 'GROUP', 'IN_PROGRESS', '2026-10-20', 5, 'ONLINE-MATH-10-A', 'ONLINE', 'MON_WED_FRI', 'SLOT_EVENING', str(today - timedelta(days=10)), 36, 8, '/classroom/class/20'),
        (21, 'GROUP', 'IN_PROGRESS', '2026-10-20', 6, 'ONLINE-PHYS-11-B', 'ONLINE', 'TUE_THU_SAT', 'SLOT_EVENING', str(today - timedelta(days=10)), 36, 8, '/classroom/class/21'),
        (22, 'ONE_ON_ONE', 'IN_PROGRESS', '2026-10-22', 7, 'ONLINE-CHEM-12-VIP', 'ONLINE', 'MON_WED_FRI', 'SLOT_AFTERNOON', str(today - timedelta(days=7)), 24, 1, '/classroom/class/22'),
        (23, 'GROUP', 'IN_PROGRESS', '2026-10-25', 8, 'ONLINE-ENG-12-INT', 'ONLINE', 'TUE_THU_SAT', 'SLOT_MORNING', str(today - timedelta(days=5)), 30, 8, '/classroom/class/23'),
        (24, 'GROUP', 'IN_PROGRESS', '2026-10-25', 9, 'ONLINE-BIO-10-ADV', 'ONLINE', 'SAT_SUN', 'SLOT_AFTERNOON', str(today - timedelta(days=4)), 20, 8, '/classroom/class/24'),
    ]

    # Available tutors and students from existing sample_data
    # Tutors: 25 (Hùng), 26 (Hà), 27 (Thắng), 31 (Hương), 32 (Khoa)
    tutors = [25, 26, 27, 31, 32]
    # Students: 13, 22, 23, 24, 33, 34, 35, 9, 10, 14, 17, 29
    students = [13, 22, 23, 24, 33, 34, 35, 9, 10, 14, 17, 29]
    admin_id = 1

    # -------------------------------------------------------------
    # 2. TUTOR ASSIGNMENTS (50 records: IDs 10 to 59)
    # -------------------------------------------------------------
    tutor_assignments = []
    ta_id = 10
    target_classes = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 14, 20, 21, 22, 23, 24]
    for i in range(50):
        c_id = target_classes[i % len(target_classes)]
        t_id = tutors[i % len(tutors)]
        status = 'ACTIVE' if i < 40 else 'TERMINATED'
        term_by = admin_id if status == 'TERMINATED' else 'NULL'
        term_at = f"'{today - timedelta(days=1)} 10:00:00+00'" if status == 'TERMINATED' else 'NULL'
        term_reason = "'Thay đổi lịch công tác.'" if status == 'TERMINATED' else 'NULL'
        assigned_at = f"'{today - timedelta(days=15 + i%10)} 08:00:00+00'"
        tutor_assignments.append(
            f"INSERT INTO tutor_assignments (id, class_group_id, tutor_id, status, assigned_by, assigned_at, reason, terminated_by, terminated_at, termination_reason) VALUES ({ta_id}, {c_id}, {t_id}, '{status}', {admin_id}, {assigned_at}, 'Phân công phụ trách giảng dạy.', {term_by}, {term_at}, {term_reason}) ON CONFLICT DO NOTHING;"
        )
        ta_id += 1

    # -------------------------------------------------------------
    # 3. ENROLLMENTS & LEARNING SCHEDULES (50 records: IDs 20 to 69)
    # -------------------------------------------------------------
    enrollments = []
    learning_schedules = []
    enr_id = 20
    for i in range(50):
        c_id = target_classes[i % len(target_classes)]
        s_id = students[i % len(students)]
        enr_date = today - timedelta(days=20 + (i % 10))
        fee = 1500000 + (i % 5) * 200000
        # Dummy unique payment id or reuse dummy sequence
        # Note: In replica mode FK to payments is safe, or dummy payment_id
        payment_id = 1000 + enr_id
        enrollments.append(
            f"INSERT INTO enrollments (id, student_id, class_group_id, payment_id, fee_charged, discount_rate, enrollment_size_at_time, status, enrolled_at, cancelled_at, cancellation_reason, cancelled_by) VALUES ({enr_id}, {s_id}, {c_id}, {payment_id}, {fee}, 0.000, 4, 'ACTIVE', '{enr_date} 09:00:00+00', NULL, NULL, NULL) ON CONFLICT DO NOTHING;"
        )
        learning_schedules.append(
            f"INSERT INTO learning_schedules (id, enrollment_id, student_id, class_group_id, start_date, end_date, status, created_at, updated_at) VALUES ({enr_id}, {enr_id}, {s_id}, {c_id}, '{enr_date}', '{enr_date + timedelta(days=90)}', 'ACTIVE', '{enr_date} 09:00:00', '{enr_date} 09:00:00') ON CONFLICT DO NOTHING;"
        )
        enr_id += 1

    # -------------------------------------------------------------
    # 4. SESSIONS (50 records: IDs 100 to 149)
    # -------------------------------------------------------------
    # Breakdown:
    # 15 sessions TODAY (various slots, some IN_SESSION, some SCHEDULED)
    # 20 sessions PAST (COMPLETED with attendance & teaching confirmed)
    # 15 sessions FUTURE (SCHEDULED)
    sessions = []
    session_logs = []
    participant_logs = []

    time_slots = [
        ("08:00:00", "10:00:00"),
        ("14:00:00", "16:00:00"),
        ("18:00:00", "20:00:00"),
        ("20:00:00", "22:00:00")
    ]

    sess_id = 100
    for i in range(50):
        c_id = target_classes[i % len(target_classes)]
        t_id = tutors[i % len(tutors)]
        slot = time_slots[i % len(time_slots)]
        sess_num = (i // 5) + 1
        room_name = f"classroom-session-{sess_id}"

        if i < 15:
            # TODAY (Sessions 100 - 114) -> Perfect for instant Live testing!
            s_date = today_str
            status = 'IN_SESSION' if i < 5 else 'SCHEDULED'
            url = f"'/classroom/{sess_id}'"
            roster_cap = 'TRUE'
            locked = 'FALSE'
            auto_proc = 'FALSE'
            taught_by = 'NULL'
            conf_by = 'NULL'
            conf_at = 'NULL'
        elif i < 35:
            # PAST COMPLETED (Sessions 115 - 134) -> Perfect for Review, Log & History testing!
            day_offset = (i - 14) * 2
            s_date = str(today - timedelta(days=day_offset))
            status = 'COMPLETED'
            url = f"'/classroom/{sess_id}'"
            roster_cap = 'TRUE'
            locked = 'TRUE'
            auto_proc = 'TRUE'
            taught_by = str(t_id)
            conf_by = str(admin_id)
            conf_at = f"'{s_date} {slot[1]}+07'"
        else:
            # FUTURE (Sessions 135 - 149) -> Perfect for Upcoming schedule testing!
            day_offset = (i - 34) * 2
            s_date = str(today + timedelta(days=day_offset))
            status = 'SCHEDULED'
            url = f"'/classroom/{sess_id}'"
            roster_cap = 'FALSE'
            locked = 'FALSE'
            auto_proc = 'FALSE'
            taught_by = 'NULL'
            conf_by = 'NULL'
            conf_at = 'NULL'

        sessions.append(
            f"INSERT INTO sessions (id, class_group_id, session_number, session_date, start_time, end_time, status, scheduled_tutor_id, actual_tutor_id, meeting_url, topic_id, original_session_id, created_at, updated_at, actual_tutor_overridden, version, attendance_roster_captured, attendance_locked, attendance_auto_processed, attendance_locked_at, attendance_needs_review, taught_by_tutor_id, teaching_confirmed_by, teaching_confirmed_at) VALUES ({sess_id}, {c_id}, {sess_num}, '{s_date}', '{slot[0]}', '{slot[1]}', '{status}', {t_id}, {t_id}, {url}, NULL, NULL, NOW(), NOW(), FALSE, 0, {roster_cap}, {locked}, {auto_proc}, {conf_at}, FALSE, {taught_by}, {conf_by}, {conf_at}) ON CONFLICT DO NOTHING;"
        )

        # Generate Mongo Audit Log for each session
        session_log_status = "COMPLETED" if status == 'COMPLETED' else ("ACTIVE" if status == 'IN_SESSION' else "SCHEDULED")
        duration = 7200 if status == 'COMPLETED' else (1800 if status == 'IN_SESSION' else 0)
        session_logs.append({
            "sessionId": room_name,
            "roomName": room_name,
            "classGroupId": c_id,
            "scheduleId": sess_id,
            "hostUserId": t_id,
            "startTime": f"{s_date}T{slot[0]}Z",
            "endTime": f"{s_date}T{slot[1]}Z" if status == 'COMPLETED' else None,
            "durationSeconds": duration,
            "status": session_log_status,
            "totalParticipantsCount": 5 if status != 'SCHEDULED' else 0,
            "maxParticipants": 6 if status != 'SCHEDULED' else 0
        })

        # Generate Tutor and Student participant logs for active/completed sessions
        if status in ['COMPLETED', 'IN_SESSION']:
            participant_logs.append({
                "sessionId": room_name,
                "roomName": room_name,
                "userId": t_id,
                "userRole": "TUTOR",
                "participantIdentity": str(t_id),
                "participantName": f"Gia Sư #{t_id} (Gia sư)",
                "joinedAt": f"{s_date}T{slot[0]}Z",
                "leftAt": f"{s_date}T{slot[1]}Z" if status == 'COMPLETED' else None,
                "durationSeconds": duration,
                "disconnectReason": "CLIENT_INITIATED" if status == 'COMPLETED' else None,
                "eventHistory": [
                    {"event": "JOINED", "timestamp": f"{s_date}T{slot[0]}Z", "details": {"name": f"Gia Sư #{t_id}"}},
                    {"event": "PUBLISHED_AUDIO", "timestamp": f"{s_date}T{slot[0]}Z", "details": {"trackSid": f"TR_AUD_{sess_id}_T"}},
                    {"event": "PUBLISHED_VIDEO", "timestamp": f"{s_date}T{slot[0]}Z", "details": {"trackSid": f"TR_VID_{sess_id}_T"}}
                ]
            })
            for s_idx in range(3):
                stud_id = students[(i + s_idx) % len(students)]
                participant_logs.append({
                    "sessionId": room_name,
                    "roomName": room_name,
                    "userId": stud_id,
                    "userRole": "STUDENT",
                    "participantIdentity": str(stud_id),
                    "participantName": f"Học Viên #{stud_id} (Học sinh)",
                    "joinedAt": f"{s_date}T{slot[0]}Z",
                    "leftAt": f"{s_date}T{slot[1]}Z" if status == 'COMPLETED' else None,
                    "durationSeconds": duration - 120,
                    "disconnectReason": "CLIENT_INITIATED" if status == 'COMPLETED' else None,
                    "eventHistory": [
                        {"event": "JOINED", "timestamp": f"{s_date}T{slot[0]}Z", "details": {"name": f"Học Viên #{stud_id}"}},
                        {"event": "PUBLISHED_AUDIO", "timestamp": f"{s_date}T{slot[0]}Z", "details": {"trackSid": f"TR_AUD_{sess_id}_S{stud_id}"}}
                    ]
                })

        sess_id += 1

    # -------------------------------------------------------------
    # 5. ATTENDANCE ROSTER & RECORDS (50 records: IDs 20 to 69)
    # -------------------------------------------------------------
    roster_statements = []
    records_statements = []
    att_id = 20
    # Map roster to first 25 completed/in-session sessions (2 students per session = 50 records)
    for i in range(25):
        s_session_id = 100 + i
        for s_idx in range(2):
            st_id = students[(i * 2 + s_idx) % len(students)]
            en_id = 20 + ((i * 2 + s_idx) % 50)
            status = 'PRESENT' if (i + s_idx) % 4 != 0 else ('LATE' if (i + s_idx) % 4 == 1 else 'ABSENT')
            note = 'Tham gia đầy đủ và tích cực.' if status == 'PRESENT' else ('Vào muộn 15 phút do mạng chậm.' if status == 'LATE' else 'Nghỉ có phép.')
            arrived = f"'{today - timedelta(days=i%10)} 18:15:00+07'" if status in ['PRESENT', 'LATE'] else 'NULL'
            
            roster_statements.append(
                f"INSERT INTO attendance_roster (id, session_id, student_id, enrollment_id) VALUES ({att_id}, {s_session_id}, {st_id}, {en_id}) ON CONFLICT DO NOTHING;"
            )
            records_statements.append(
                f"INSERT INTO attendance_records (id, session_id, student_id, status, note, arrived_at, recorded_by, recorded_at) VALUES ({att_id}, {s_session_id}, {st_id}, '{status}', '{note}', {arrived}, 25, NOW()) ON CONFLICT DO NOTHING;"
            )
            att_id += 1

    # -------------------------------------------------------------
    # 6. TUTOR REVIEWS (50 records: IDs 30 to 79)
    # -------------------------------------------------------------
    reviews = []
    rev_id = 30
    sample_comments = [
        "Thầy dạy rất tận tâm, giải thích chi tiết dễ hiểu.",
        "Buổi học trực tuyến rất mượt mà, bài giảng sinh động.",
        "Gia sư hướng dẫn phương pháp giải bài tập rất nhanh.",
        "Em đã hiểu rõ phần kiến thức hổng sau buổi học này.",
        "Giáo viên nhiệt tình, tương tác tốt qua LiveKit video call."
    ]
    for i in range(50):
        st_id = students[i % len(students)]
        t_id = tutors[i % len(tutors)]
        c_id = target_classes[i % len(target_classes)]
        rating = 4.5 if i % 2 == 0 else 5.0
        cmt = sample_comments[i % len(sample_comments)]
        created_at = f"'{today - timedelta(days=i % 15 + 1)} 21:00:00+07'"
        reviews.append(
            f"INSERT INTO tutor_reviews (id, student_id, tutor_id, class_group_id, rating, comment, created_at) VALUES ({rev_id}, {st_id}, {t_id}, {c_id}, {rating}, '{cmt}', {created_at}) ON CONFLICT DO NOTHING;"
        )
        rev_id += 1

    # -------------------------------------------------------------
    # ASSEMBLE SQL OUTPUT
    # -------------------------------------------------------------
    sql_lines = [
        "-- ==============================================================================",
        "-- VietTriTutor: Comprehensive Online Meeting Seed Dataset",
        "-- Purpose: Ensure complete RBAC access, active sessions, attendance and logs",
        "-- ==============================================================================",
        "SET session_replication_role = 'replica';",
        "",
        "-- ------------------------------------------------------------",
        "-- 1. Online Class Groups (5 groups)",
        "-- ------------------------------------------------------------"
    ]
    for cg in class_groups:
        sql_lines.append(
            f"INSERT INTO class_groups (id, class_type, status, enrollment_deadline, course_id, class_code, delivery_mode, schedule_pattern, time_slot, start_date, total_sessions, max_students, meeting_url, created_at, updated_at) "
            f"VALUES ({cg[0]}, '{cg[1]}', '{cg[2]}', '{cg[3]}', {cg[4]}, '{cg[5]}', '{cg[6]}', '{cg[7]}', '{cg[8]}', '{cg[9]}', {cg[10]}, {cg[11]}, '{cg[12]}', NOW(), NOW()) ON CONFLICT DO NOTHING;"
        )
    sql_lines.append("SELECT setval(pg_get_serial_sequence('class_groups', 'id'), COALESCE((SELECT MAX(id) FROM class_groups), 1));\n")

    sql_lines.append("-- ------------------------------------------------------------")
    sql_lines.append(f"-- 2. Tutor Assignments ({len(tutor_assignments)} records)")
    sql_lines.append("-- ------------------------------------------------------------")
    sql_lines.extend(tutor_assignments)
    sql_lines.append("SELECT setval(pg_get_serial_sequence('tutor_assignments', 'id'), COALESCE((SELECT MAX(id) FROM tutor_assignments), 1));\n")

    sql_lines.append("-- ------------------------------------------------------------")
    sql_lines.append(f"-- 3. Enrollments ({len(enrollments)} records)")
    sql_lines.append("-- ------------------------------------------------------------")
    sql_lines.extend(enrollments)
    sql_lines.append("SELECT setval(pg_get_serial_sequence('enrollments', 'id'), COALESCE((SELECT MAX(id) FROM enrollments), 1));\n")

    sql_lines.append("-- ------------------------------------------------------------")
    sql_lines.append(f"-- 4. Learning Schedules ({len(learning_schedules)} records)")
    sql_lines.append("-- ------------------------------------------------------------")
    sql_lines.extend(learning_schedules)
    sql_lines.append("SELECT setval(pg_get_serial_sequence('learning_schedules', 'id'), COALESCE((SELECT MAX(id) FROM learning_schedules), 1));\n")

    sql_lines.append("-- ------------------------------------------------------------")
    sql_lines.append(f"-- 5. Sessions ({len(sessions)} records: 15 Today, 20 Past, 15 Future)")
    sql_lines.append("-- ------------------------------------------------------------")
    sql_lines.extend(sessions)
    sql_lines.append("SELECT setval(pg_get_serial_sequence('sessions', 'id'), COALESCE((SELECT MAX(id) FROM sessions), 1));\n")

    sql_lines.append("-- ------------------------------------------------------------")
    sql_lines.append(f"-- 6. Attendance Roster ({len(roster_statements)} records)")
    sql_lines.append("-- ------------------------------------------------------------")
    sql_lines.extend(roster_statements)
    sql_lines.append("SELECT setval(pg_get_serial_sequence('attendance_roster', 'id'), COALESCE((SELECT MAX(id) FROM attendance_roster), 1));\n")

    sql_lines.append("-- ------------------------------------------------------------")
    sql_lines.append(f"-- 7. Attendance Records ({len(records_statements)} records)")
    sql_lines.append("-- ------------------------------------------------------------")
    sql_lines.extend(records_statements)
    sql_lines.append("SELECT setval(pg_get_serial_sequence('attendance_records', 'id'), COALESCE((SELECT MAX(id) FROM attendance_records), 1));\n")

    sql_lines.append("-- ------------------------------------------------------------")
    sql_lines.append(f"-- 8. Tutor Reviews ({len(reviews)} records)")
    sql_lines.append("-- ------------------------------------------------------------")
    sql_lines.extend(reviews)
    sql_lines.append("SELECT setval(pg_get_serial_sequence('tutor_reviews', 'id'), COALESCE((SELECT MAX(id) FROM tutor_reviews), 1));\n")

    sql_lines.append("SET session_replication_role = 'origin';")

    output_sql_path = "backend/src/main/resources/data/R__z_meeting_sample_data.sql"
    with open(output_sql_path, "w", encoding="utf-8") as f:
        f.write("\n".join(sql_lines))

    # MongoDB JSON output
    mongo_export = {
        "meeting_session_logs": session_logs,
        "meeting_participant_logs": participant_logs
    }
    mongo_path = "backend/src/main/resources/data/mongo_meeting_logs_seed.json"
    with open(mongo_path, "w", encoding="utf-8") as f:
        json.dump(mongo_export, f, ensure_ascii=False, indent=2)

    # Mongo shell script
    mongo_js = f"""// Seed LiveKit audit logs into MongoDB
const dbName = 'triviettutor';
const conn = new Mongo();
const db = conn.getDB(dbName);

const sessionLogs = {json.dumps(session_logs, ensure_ascii=False, indent=2)};
const participantLogs = {json.dumps(participant_logs, ensure_ascii=False, indent=2)};

print("Seeding meeting_session_logs (" + sessionLogs.length + " records)...");
sessionLogs.forEach(doc => {{
    db.meeting_session_logs.updateOne(
        {{ sessionId: doc.sessionId }},
        {{ $set: doc }},
        {{ upsert: true }}
    );
}});

print("Seeding meeting_participant_logs (" + participantLogs.length + " records)...");
participantLogs.forEach(doc => {{
    db.meeting_participant_logs.updateOne(
        {{ sessionId: doc.sessionId, participantIdentity: doc.participantIdentity }},
        {{ $set: doc }},
        {{ upsert: true }}
    );
}});

print("Meeting logs successfully seeded into MongoDB!");
"""
    mongo_js_path = "backend/src/main/resources/data/mongo_seed.js"
    with open(mongo_js_path, "w", encoding="utf-8") as f:
        f.write(mongo_js)

    print(f"Generated SQL: {output_sql_path}")
    print(f"Generated Mongo JSON: {mongo_path}")
    print(f"Generated Mongo JS script: {mongo_js_path}")
    print(f"Successfully generated 50+ records for all meeting tables!")

if __name__ == "__main__":
    main()
