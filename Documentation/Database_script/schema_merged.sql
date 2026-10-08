-- ================================================================
-- VietTriTutor — Merged Physical Schema (PostgreSQL)
--
-- Nguồn:
--   1) 00-Product-Definition/04-Physical-Data-Model.md  (12 bảng chính thức — giữ nguyên, không sửa)
--   2) Database_script/ERD_conceptual.png               (các thực thể riêng — bổ sung thêm)
--
-- Phần "ERD_conceptual.png — BỔ SUNG" được đánh dấu rõ ở mỗi khối,
-- để phân biệt với phần gốc đã được nhóm chốt trong tài liệu .md.
-- ================================================================


-- ============================================
-- 1. ENUM TYPES
-- ============================================

-- -- Từ 04-Physical-Data-Model.md (gốc) --
CREATE TYPE user_role_enum AS ENUM ('ROLE_ADMIN', 'ROLE_TUTOR', 'ROLE_STUDENT');
CREATE TYPE user_status_enum AS ENUM ('ACTIVE', 'INACTIVE', 'SUSPENDED');
CREATE TYPE tutor_contract_status_enum AS ENUM ('PROBATION', 'OFFICIAL', 'TERMINATED');

CREATE TYPE grade_level_enum AS ENUM ('GRADE_1', 'GRADE_2', 'GRADE_3');
CREATE TYPE class_mode_enum AS ENUM ('ONLINE', 'OFFLINE');
CREATE TYPE course_status_enum AS ENUM ('ACTIVE', 'INACTIVE');

CREATE TYPE class_type_enum AS ENUM ('ONE_ON_ONE', 'GROUP');
CREATE TYPE schedule_pattern_enum AS ENUM ('MON_WED_FRI', 'TUE_THU_SAT', 'SAT_SUN');
CREATE TYPE time_slot_enum AS ENUM ('SLOT_MORNING', 'SLOT_AFTERNOON', 'SLOT_EVENING_1', 'SLOT_EVENING_2');
CREATE TYPE class_status_enum AS ENUM (
    'DRAFT', 'PUBLISHED', 'ENROLLING', 'ASSIGNED',
    'IN_PROGRESS', 'COMPLETED', 'FAILED_TO_OPEN', 'CANCELLED'
);

CREATE TYPE session_status_enum AS ENUM (
    'SCHEDULED', 'PENDING_RESCHEDULE', 'MAKEUP',
    'IN_SESSION', 'COMPLETED', 'ABSENCE_LATE', 'CANCELLED'
);
CREATE TYPE attendance_status_enum AS ENUM ('PRESENT', 'ABSENT', 'LATE', 'EXCUSED');

CREATE TYPE enrollment_status_enum AS ENUM ('ACTIVE', 'CANCELLED', 'REFUNDED');
CREATE TYPE tutor_assignment_status_enum AS ENUM ('ACTIVE', 'TERMINATED');
CREATE TYPE reschedule_request_status_enum AS ENUM ('PENDING', 'APPROVED_MAKEUP', 'APPROVED_SUBSTITUTE', 'REJECTED');
CREATE TYPE transaction_type_enum AS ENUM ('PAYMENT', 'REFUND');
CREATE TYPE payment_method_enum AS ENUM ('VNPAY', 'MOMO', 'BANK_TRANSFER');
CREATE TYPE payment_status_enum AS ENUM ('PENDING', 'SUCCESS', 'FAILED');
CREATE TYPE payroll_status_enum AS ENUM ('DRAFT', 'APPROVED', 'PAID');

-- -- ERD_conceptual.png — BỔ SUNG --
CREATE TYPE order_status_enum AS ENUM ('PENDING_PAYMENT', 'PAID', 'CANCELLED', 'EXPIRED');
CREATE TYPE submission_status_enum AS ENUM ('SUBMITTED', 'LATE', 'GRADED');
CREATE TYPE weekday_enum AS ENUM ('MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN');


-- ============================================
-- 2. CỤM NGƯỜI DÙNG & HỒ SƠ GIA SƯ  (gốc)
-- ============================================

CREATE TABLE users (
    id BIGSERIAL PRIMARY KEY,
    email VARCHAR(100) NOT NULL UNIQUE,
    phone VARCHAR(20) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    role user_role_enum NOT NULL,
    status user_status_enum NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE tutor_profiles (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    base_salary NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (base_salary >= 0),
    session_rate NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (session_rate >= 0),
    specialization VARCHAR(255),
    contract_status tutor_contract_status_enum NOT NULL DEFAULT 'PROBATION',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- -- ERD_conceptual.png — BỔ SUNG: TutorAvailability --
CREATE TABLE tutor_availability (
    id BIGSERIAL PRIMARY KEY,
    tutor_profile_id BIGINT NOT NULL REFERENCES tutor_profiles(id) ON DELETE CASCADE,
    weekday weekday_enum NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_availability_time_order CHECK (start_time < end_time)
);


-- ============================================
-- 3. CỤM KHÓA HỌC, LỚP HỌC & BUỔI HỌC  (gốc + bổ sung Topics)
-- ============================================

CREATE TABLE courses (
    id BIGSERIAL PRIMARY KEY,
    code VARCHAR(50) NOT NULL UNIQUE,
    title VARCHAR(200) NOT NULL,
    grade_level grade_level_enum NOT NULL,
    subject VARCHAR(100) NOT NULL,
    class_mode class_mode_enum NOT NULL,
    total_sessions INT NOT NULL CHECK (total_sessions > 0),
    base_1on1_price NUMERIC(12, 2) NOT NULL CHECK (base_1on1_price > 0),
    status course_status_enum NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- -- ERD_conceptual.png — BỔ SUNG: Topics (Subject "has" Topics) --
CREATE TABLE topics (
    id BIGSERIAL PRIMARY KEY,
    course_id BIGINT NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    sort_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE classes (
    id BIGSERIAL PRIMARY KEY,
    course_id BIGINT NOT NULL REFERENCES courses(id) ON DELETE RESTRICT,
    code VARCHAR(50) NOT NULL UNIQUE,
    class_type class_type_enum NOT NULL,
    schedule_pattern schedule_pattern_enum NOT NULL,
    time_slot time_slot_enum NOT NULL,
    min_capacity INT NOT NULL,
    max_capacity INT NOT NULL,
    current_enrolled INT NOT NULL DEFAULT 0,
    start_date DATE NOT NULL,
    deadline_date DATE NOT NULL,
    status class_status_enum NOT NULL DEFAULT 'DRAFT',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_capacity_range CHECK (min_capacity > 0 AND min_capacity <= max_capacity),
    CONSTRAINT chk_enrolled_limit CHECK (current_enrolled >= 0 AND current_enrolled <= max_capacity),
    CONSTRAINT chk_deadline_before_start CHECK (deadline_date <= start_date)
);

CREATE TABLE sessions (
    id BIGSERIAL PRIMARY KEY,
    class_id BIGINT NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
    session_number INT NOT NULL,
    session_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    meeting_url VARCHAR(500),
    status session_status_enum NOT NULL DEFAULT 'SCHEDULED',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT chk_session_time_order CHECK (start_time < end_time),
    CONSTRAINT uq_class_session_number UNIQUE (class_id, session_number)
);

-- -- ERD_conceptual.png — BỔ SUNG: Session "covers" Topics (M:N) --
CREATE TABLE session_topics (
    session_id BIGINT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    topic_id BIGINT NOT NULL REFERENCES topics(id) ON DELETE CASCADE,
    PRIMARY KEY (session_id, topic_id)
);

-- -- ERD_conceptual.png — BỔ SUNG: Homework (Session "has" Homework) --
CREATE TABLE homeworks (
    id BIGSERIAL PRIMARY KEY,
    session_id BIGINT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    due_date TIMESTAMP WITH TIME ZONE,
    max_score NUMERIC(5, 2) NOT NULL DEFAULT 10 CHECK (max_score > 0),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- -- ERD_conceptual.png — BỔ SUNG: Submission (Student nộp Homework) --
CREATE TABLE submissions (
    id BIGSERIAL PRIMARY KEY,
    homework_id BIGINT NOT NULL REFERENCES homeworks(id) ON DELETE CASCADE,
    student_id BIGINT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    content TEXT,
    file_url VARCHAR(500),
    submitted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    score NUMERIC(5, 2) CHECK (score >= 0),
    feedback TEXT,
    status submission_status_enum NOT NULL DEFAULT 'SUBMITTED',
    CONSTRAINT uq_homework_student_submission UNIQUE (homework_id, student_id)
);


-- ============================================
-- 4. ERD_conceptual.png — BỔ SUNG: GIỎ HÀNG & ĐƠN HÀNG
--    (Cart -> CartItem -> Order -> OrderItem, trước khi thành Enrollment)
-- ============================================

CREATE TABLE carts (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE cart_items (
    id BIGSERIAL PRIMARY KEY,
    cart_id BIGINT NOT NULL REFERENCES carts(id) ON DELETE CASCADE,
    class_id BIGINT NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
    student_id BIGINT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    added_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_cart_item UNIQUE (cart_id, class_id, student_id)
);

CREATE TABLE orders (
    id BIGSERIAL PRIMARY KEY,
    order_code VARCHAR(50) NOT NULL UNIQUE,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    status order_status_enum NOT NULL DEFAULT 'PENDING_PAYMENT',
    total_amount NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (total_amount >= 0),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Price Snapshot: đúng cơ chế đã mô tả ở mục 5, 02-Conceptual-Model.md
CREATE TABLE order_items (
    id BIGSERIAL PRIMARY KEY,
    order_id BIGINT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    class_id BIGINT NOT NULL REFERENCES classes(id) ON DELETE RESTRICT,
    student_id BIGINT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    unit_price_snapshot NUMERIC(12, 2) NOT NULL CHECK (unit_price_snapshot >= 0),
    discount_snapshot NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (discount_snapshot >= 0),
    final_price_snapshot NUMERIC(12, 2) NOT NULL CHECK (final_price_snapshot >= 0),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- -- ERD_conceptual.png — BỔ SUNG: LearningSchedule (lịch mong muốn chọn lúc đặt hàng) --
CREATE TABLE learning_schedules (
    id BIGSERIAL PRIMARY KEY,
    order_item_id BIGINT NOT NULL REFERENCES order_items(id) ON DELETE CASCADE,
    weekday weekday_enum NOT NULL,
    time_slot time_slot_enum NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);


-- ============================================
-- 5. CỤM ĐĂNG KÝ, PHÂN CÔNG & VẬN HÀNH  (gốc, enrollments có thêm 1 cột truy vết)
-- ============================================

CREATE TABLE enrollments (
    id BIGSERIAL PRIMARY KEY,
    student_id BIGINT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    class_id BIGINT NOT NULL REFERENCES classes(id) ON DELETE RESTRICT,
    -- ERD_conceptual.png — BỔ SUNG: liên kết ngược về OrderItem đã tạo ra lượt ghi danh này
    order_item_id BIGINT UNIQUE REFERENCES order_items(id) ON DELETE SET NULL,
    enrolled_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    final_fee NUMERIC(12, 2) NOT NULL CHECK (final_fee > 0),
    status enrollment_status_enum NOT NULL DEFAULT 'ACTIVE',
    CONSTRAINT uq_active_enrollment UNIQUE (student_id, class_id)
);

CREATE TABLE tutor_assignments (
    id BIGSERIAL PRIMARY KEY,
    tutor_id BIGINT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    class_id BIGINT NOT NULL REFERENCES classes(id) ON DELETE RESTRICT,
    assigned_by BIGINT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    assigned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    status tutor_assignment_status_enum NOT NULL DEFAULT 'ACTIVE'
);

CREATE TABLE session_substitutions (
    id BIGSERIAL PRIMARY KEY,
    session_id BIGINT NOT NULL UNIQUE REFERENCES sessions(id) ON DELETE CASCADE,
    original_tutor_id BIGINT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    substitute_tutor_id BIGINT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    assigned_by BIGINT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE reschedule_requests (
    id BIGSERIAL PRIMARY KEY,
    session_id BIGINT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    requested_by BIGINT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    reason TEXT NOT NULL,
    notice_hours_before INT NOT NULL,
    status reschedule_request_status_enum NOT NULL DEFAULT 'PENDING',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE attendances (
    id BIGSERIAL PRIMARY KEY,
    session_id BIGINT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    student_id BIGINT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    status attendance_status_enum NOT NULL DEFAULT 'ABSENT',
    checked_in_at TIMESTAMP WITH TIME ZONE,
    notes VARCHAR(255),
    CONSTRAINT uq_session_student_attendance UNIQUE (session_id, student_id)
);


-- ============================================
-- 6. CỤM TÀI CHÍNH & BẢNG LƯƠNG  (gốc)
-- ============================================

CREATE TABLE payment_transactions (
    id BIGSERIAL PRIMARY KEY,
    enrollment_id BIGINT NOT NULL REFERENCES enrollments(id) ON DELETE RESTRICT,
    student_id BIGINT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
    transaction_type transaction_type_enum NOT NULL DEFAULT 'PAYMENT',
    payment_method payment_method_enum NOT NULL,
    transaction_code VARCHAR(100) NOT NULL UNIQUE,
    status payment_status_enum NOT NULL DEFAULT 'PENDING',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE tutor_payrolls (
    id BIGSERIAL PRIMARY KEY,
    tutor_id BIGINT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    payroll_month CHAR(7) NOT NULL, -- Định dạng YYYY-MM
    base_salary_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (base_salary_amount >= 0),
    total_valid_sessions INT NOT NULL DEFAULT 0 CHECK (total_valid_sessions >= 0),
    session_bonus_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (session_bonus_amount >= 0),
    total_salary_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (total_salary_amount >= 0),
    status payroll_status_enum NOT NULL DEFAULT 'DRAFT',
    approved_by BIGINT REFERENCES users(id) ON DELETE RESTRICT,
    approved_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_tutor_payroll_month UNIQUE (tutor_id, payroll_month)
);


-- ============================================
-- 7. INDEX HIỆU NĂNG CAO
-- ============================================

-- -- Từ 04-Physical-Data-Model.md (gốc) --
CREATE INDEX idx_sessions_conflict_lookup
ON sessions (session_date, start_time, end_time, status);

CREATE INDEX idx_classes_status_lookup
ON classes (status, deadline_date, start_date);

CREATE INDEX idx_sessions_class_id
ON sessions (class_id);

CREATE INDEX idx_tutor_assignments_tutor_status
ON tutor_assignments (tutor_id, status);

CREATE INDEX idx_enrollments_student_status
ON enrollments (student_id, status);

CREATE INDEX idx_payrolls_month_status
ON tutor_payrolls (payroll_month, status);

-- -- ERD_conceptual.png — BỔ SUNG --
CREATE INDEX idx_cart_items_cart_id ON cart_items (cart_id);
CREATE INDEX idx_order_items_order_id ON order_items (order_id);
CREATE INDEX idx_orders_user_status ON orders (user_id, status);
CREATE INDEX idx_homeworks_session_id ON homeworks (session_id);
CREATE INDEX idx_submissions_homework_student ON submissions (homework_id, student_id);
CREATE INDEX idx_topics_course_id ON topics (course_id);
CREATE INDEX idx_tutor_availability_tutor ON tutor_availability (tutor_profile_id, weekday);
