# Physical Data Model (Mô hình Dữ liệu Vật lý - PostgreSQL DDL)

Tài liệu này chi tiết hóa **Mô hình Dữ liệu Vật lý (Physical Data Model)** cho hệ thống **VietTriTutor**, nhắm trực tiếp vào hệ quản trị cơ sở dữ liệu **PostgreSQL 15+** (được sử dụng với Java Spring Boot 3 & Spring Data JPA/Flyway).

Mô hình vật lý định nghĩa chính xác: Kiểu dữ liệu vật lý (Data Types), Khóa chính tự tăng (Identity Bigserial), Khóa ngoại kèm hành vi tham chiếu (`ON DELETE RESTRICT/CASCADE`), Bảng chỉ mục Index phục vụ tối ưu hóa truy vấn chặn trùng lịch (Hard Conflict Query) và các ràng buộc kiểm tra toàn vẹn (`CHECK Constraints`).

---

## 1. Các Kiểu Liệt Kê Vật Lý (PostgreSQL Custom ENUM Types)

```sql
-- 1. Vai trò & Trạng thái người dùng
CREATE TYPE user_role_enum AS ENUM ('ROLE_ADMIN', 'ROLE_TUTOR', 'ROLE_STUDENT');
CREATE TYPE user_status_enum AS ENUM ('ACTIVE', 'INACTIVE', 'SUSPENDED');
CREATE TYPE tutor_contract_status_enum AS ENUM ('PROBATION', 'OFFICIAL', 'TERMINATED');

-- 2. Cấp học & Hình thức khóa học
CREATE TYPE grade_level_enum AS ENUM ('GRADE_1', 'GRADE_2', 'GRADE_3');
CREATE TYPE class_mode_enum AS ENUM ('ONLINE', 'OFFLINE');
CREATE TYPE course_status_enum AS ENUM ('ACTIVE', 'INACTIVE');

-- 3. Loại lớp & Mẫu lịch định kỳ
CREATE TYPE class_type_enum AS ENUM ('ONE_ON_ONE', 'GROUP');
CREATE TYPE schedule_pattern_enum AS ENUM ('MON_WED_FRI', 'TUE_THU_SAT', 'SAT_SUN');
CREATE TYPE time_slot_enum AS ENUM ('SLOT_MORNING', 'SLOT_AFTERNOON', 'SLOT_EVENING_1', 'SLOT_EVENING_2');
CREATE TYPE class_status_enum AS ENUM (
    'DRAFT', 'PUBLISHED', 'ENROLLING', 'ASSIGNED', 
    'IN_PROGRESS', 'COMPLETED', 'FAILED_TO_OPEN', 'CANCELLED'
);

-- 4. Trạng thái buổi học & Điểm danh
CREATE TYPE session_status_enum AS ENUM (
    'SCHEDULED', 'PENDING_RESCHEDULE', 'MAKEUP', 
    'IN_SESSION', 'COMPLETED', 'ABSENCE_LATE', 'CANCELLED'
);
CREATE TYPE attendance_status_enum AS ENUM ('PRESENT', 'ABSENT', 'LATE', 'EXCUSED');

-- 5. Trạng thái Đăng ký & Tài chính
CREATE TYPE enrollment_status_enum AS ENUM ('ACTIVE', 'CANCELLED', 'REFUNDED');
CREATE TYPE tutor_assignment_status_enum AS ENUM ('ACTIVE', 'TERMINATED');
CREATE TYPE reschedule_request_status_enum AS ENUM ('PENDING', 'APPROVED_MAKEUP', 'APPROVED_SUBSTITUTE', 'REJECTED');
CREATE TYPE transaction_type_enum AS ENUM ('PAYMENT', 'REFUND');
CREATE TYPE payment_method_enum AS ENUM ('VNPAY', 'MOMO', 'BANK_TRANSFER');
CREATE TYPE payment_status_enum AS ENUM ('PENDING', 'SUCCESS', 'FAILED');
CREATE TYPE payroll_status_enum AS ENUM ('DRAFT', 'APPROVED', 'PAID');
```

---

## 2. Lược Đồ Bảng Vật Lý & Ràng Buộc Khóa (DDL Statements)

### 2.1. Cụm Người dùng & Hồ sơ Gia sư

```sql
-- Bảng users
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

-- Bảng tutor_profiles
CREATE TABLE tutor_profiles (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    base_salary NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (base_salary >= 0),
    session_rate NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (session_rate >= 0),
    specialization VARCHAR(255),
    contract_status tutor_contract_status_enum NOT NULL DEFAULT 'PROBATION',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);
```

### 2.2. Cụm Khóa học, Lớp học & Buổi học

```sql
-- Bảng courses
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

-- Bảng classes
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

-- Bảng sessions
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
```

### 2.3. Cụm Đăng ký, Phân công & Vận hành

```sql
-- Bảng enrollments
CREATE TABLE enrollments (
    id BIGSERIAL PRIMARY KEY,
    student_id BIGINT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    class_id BIGINT NOT NULL REFERENCES classes(id) ON DELETE RESTRICT,
    enrolled_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    final_fee NUMERIC(12, 2) NOT NULL CHECK (final_fee > 0),
    status enrollment_status_enum NOT NULL DEFAULT 'ACTIVE',
    CONSTRAINT uq_active_enrollment UNIQUE (student_id, class_id)
);

-- Bảng tutor_assignments
CREATE TABLE tutor_assignments (
    id BIGSERIAL PRIMARY KEY,
    tutor_id BIGINT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    class_id BIGINT NOT NULL REFERENCES classes(id) ON DELETE RESTRICT,
    assigned_by BIGINT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    assigned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    status tutor_assignment_status_enum NOT NULL DEFAULT 'ACTIVE'
);

-- Bảng session_substitutions
CREATE TABLE session_substitutions (
    id BIGSERIAL PRIMARY KEY,
    session_id BIGINT NOT NULL UNIQUE REFERENCES sessions(id) ON DELETE CASCADE,
    original_tutor_id BIGINT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    substitute_tutor_id BIGINT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    assigned_by BIGINT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Bảng reschedule_requests
CREATE TABLE reschedule_requests (
    id BIGSERIAL PRIMARY KEY,
    session_id BIGINT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    requested_by BIGINT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    reason TEXT NOT NULL,
    notice_hours_before INT NOT NULL,
    status reschedule_request_status_enum NOT NULL DEFAULT 'PENDING',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Bảng attendances
CREATE TABLE attendances (
    id BIGSERIAL PRIMARY KEY,
    session_id BIGINT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    student_id BIGINT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    status attendance_status_enum NOT NULL DEFAULT 'ABSENT',
    checked_in_at TIMESTAMP WITH TIME ZONE,
    notes VARCHAR(255),
    CONSTRAINT uq_session_student_attendance UNIQUE (session_id, student_id)
);
```

### 2.4. Cụm Tài chính & Bảng lương

```sql
-- Bảng payment_transactions
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

-- Bảng tutor_payrolls
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
```

---

## 3. Thiết Kế Chỉ Mục Hiệu Năng Cao (Database Indexes Strategy)

Để đảm bảo hiệu năng xử lý đặc biệt là logic **Kiểm tra chặn trùng lịch (Hard Conflict Validation - BR-03.30)** diễn ra tức thì dưới 10ms:

```sql
-- 1. Index tối ưu hóa truy vấn chặn trùng lịch cho Gia sư & Học viên
-- Giúp Backend quét tức thì các ca học giao nhau về thời gian
CREATE INDEX idx_sessions_conflict_lookup 
ON sessions (session_date, start_time, end_time, status);

CREATE INDEX idx_classes_status_lookup 
ON classes (status, deadline_date, start_date);

-- 2. Index hỗ trợ truy vấn các buổi học của một Lớp
CREATE INDEX idx_sessions_class_id 
ON sessions (class_id);

-- 3. Index hỗ trợ truy vấn phân công gia sư active
CREATE INDEX idx_tutor_assignments_tutor_status 
ON tutor_assignments (tutor_id, status);

-- 4. Index hỗ trợ tra cứu lịch học của học viên active
CREATE INDEX idx_enrollments_student_status 
ON enrollments (student_id, status);

-- 5. Index hỗ trợ chốt bảng lương theo tháng
CREATE INDEX idx_payrolls_month_status 
ON tutor_payrolls (payroll_month, status);
```
