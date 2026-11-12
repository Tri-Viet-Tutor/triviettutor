-- ==============================================================================
-- VietTriTutor: Script xoa sach du lieu Khoa hoc, Lop hoc va Lich hoc
-- Muc dich: Lam sach du lieu de test tao lop / xep lich tranh ScheduleConflictException
-- Giu lai: users, subjects, student_profiles, tutor_profiles, wallets, app_settings, flyway_schema_history
-- ==============================================================================

TRUNCATE TABLE
    attendance_changes,
    attendance_records,
    attendance_roster,
    cart_items,
    carts,
    class_changes,
    class_conversions,
    enrollments,
    homework_answers,
    homework_changes,
    homework_questions,
    homework_submissions,
    submission_attachments,
    submission_changes,
    homeworks,
    learning_files,
    learning_schedules,
    leave_requests,
    notifications,
    order_items,
    order_request_keys,
    orders,
    payment_intents,
    payment_operations,
    payments,
    payroll_disputes,
    payroll_finalize_keys,
    payroll_lines,
    payroll_mutex,
    payroll_periods,
    refunds,
    session_changes,
    session_generation_locks,
    sessions,
    tutor_assignments,
    tutor_reviews,
    class_groups,
    courses
RESTART IDENTITY CASCADE;

