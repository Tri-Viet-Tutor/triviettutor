# Main Business Flows (Happy Path Workflows)

Tài liệu này hệ thống hóa các **Luồng Nghiệp vụ Chính (Main Flows / Happy Paths)** của hệ thống **VietTriTutor**.
Mỗi luồng mô tả hành trình lý tưởng từ khi bắt đầu đến khi hoàn tất thành công, liên kết chặt chẽ giữa Hành động Người dùng, Phản hồi Hệ thống, Thay đổi Trạng thái Dữ liệu (State Transitions) và Các Bảng bị tác động.

---

## 1. Bản Đồ 5 Luồng Chính Trong Hệ Thống (Happy Path Map)

```mermaid
flowchart LR
    F1[Flow 1:\nKhởi tạo Khóa & Mở Lớp] --> F2[Flow 2:\nHọc viên Đăng ký & Đóng tiền]
    F2 --> F3[Flow 3:\nAdmin Phân công Gia sư]
    F3 --> F4[Flow 4:\nVận hành Buổi học & Điểm danh]
    F4 --> F5[Flow 5:\nChốt Bảng Lương Gia sư]
```

---

## 2. Chi tiết Từng Luồng Nghiệp Vụ Chính (Detailed Flows)

### 2.1. Flow 1: Tạo Khóa Học, Lớp Học & Tự Động Sinh Buổi Học (Course & Class Setup)

**Mục tiêu**: Admin thiết lập chương trình học và mở các lớp đón học viên đăng ký.

```mermaid
sequenceDiagram
    autonumber
    actor Admin as Admin Trung Tâm
    participant FE as Web Admin (React)
    participant BE as Backend (Spring Boot)
    participant DB as Database (PostgreSQL)

    Admin->>FE: 1. Tạo Khóa học (Toán 12, Cấp 3, 24 buổi, Giá 1-1: 8tr)
    FE->>BE: POST /api/v1/admin/courses
    BE->>DB: INSERT INTO courses (code, title, grade_level, total_sessions, base_1on1_price)
    DB-->>BE: Course Created (ID: 101)

    Admin->>FE: 2. Tạo Lớp Nhóm (Mẫu 2-4-6, Ca Tối 18:00-20:00, Sĩ số 2-8, Khai giảng 01/10)
    FE->>BE: POST /api/v1/admin/classes
    Note over BE: Tính toán 24 ngày học khớp Thứ 2-4-6 từ ngày 01/10
    BE->>DB: INSERT INTO classes (course_id, class_type, schedule_pattern, time_slot, status='DRAFT')
    BE->>DB: INSERT INTO sessions (class_id, session_number, session_date, start_time, end_time, status='SCHEDULED')
    DB-->>BE: 24 Sessions Generated

    Admin->>FE: 3. Nhấn "Công bố & Mở đăng ký"
    FE->>BE: PATCH /api/v1/admin/classes/{id}/publish-and-enroll
    BE->>DB: UPDATE classes SET status = 'ENROLLING'
    BE-->>FE: Lớp xuất hiện trên Trang chủ cho học viên
```

- **Thay đổi trạng thái**: `classes.status`: `DRAFT` $\rightarrow$ `ENROLLING`.
- **Dữ liệu sinh ra**: 1 bản ghi `courses`, 1 bản ghi `classes`, 24 bản ghi `sessions` (`SCHEDULED`).

---

### 2.2. Flow 2: Học Viên Khám Phá, Đăng Ký & Thanh Toán (Enrollment & Payment)

**Mục tiêu**: Học viên tìm kiếm lớp phù hợp, kiểm tra không bị trùng lịch cá nhân, thanh toán 100% và nhận biên lai ghi danh.

```mermaid
sequenceDiagram
    autonumber
    actor Student as Học Viên / Phụ Huynh
    participant FE as Web Student (React)
    participant BE as Backend (Spring Boot)
    participant Gateway as Cổng Thanh Toán (VNPAY)
    participant DB as Database (PostgreSQL)

    Student->>FE: 1. Tìm kiếm lớp Toán 12 (Thứ 2-4-6, Ca tối 18:00)
    FE->>BE: GET /api/v1/public/classes?status=ENROLLING
    BE-->>FE: Danh sách lớp còn chỗ

    Student->>FE: 2. Nhấn "Đăng ký học"
    FE->>BE: POST /api/v1/student/enrollments/pre-check
    Note over BE: Kiểm tra Hard Conflict: Quét lịch cá nhân học viên xem có trùng buổi nào không (BR-03.31)
    BE->>DB: SELECT sessions từ các lớp active của học viên
    DB-->>BE: Không trùng lịch
    Note over BE: Tính học phí theo sĩ số hiện tại + 1 (BR-02.11). Ví dụ: Lớp đang 2 người -> Người thứ 3 đóng chiết khấu 20%
    BE-->>FE: Học phí cần đóng (VD: 6.400.000 VNĐ) & Payment URL

    Student->>Gateway: 3. Quét mã QR thanh toán học phí thành công
    Gateway->>BE: 4. Webhook IPN Callback (Giao dịch thành công)
    BE->>DB: INSERT INTO payment_transactions (amount, status='SUCCESS')
    BE->>DB: INSERT INTO enrollments (student_id, class_id, final_fee, status='ACTIVE')
    BE->>DB: UPDATE classes SET current_enrolled = current_enrolled + 1
    BE-->>Student: Gửi Email / Thông báo xác nhận ghi danh thành công
```

- **Thay đổi trạng thái**: 
  - `classes.current_enrolled` tăng thêm 1. (Nếu đạt 8 $\rightarrow$ chuyển `status = 'FULL'`).
- **Dữ liệu sinh ra**: 1 bản ghi `enrollments`, 1 bản ghi `payment_transactions`.

---

### 2.3. Flow 3: Trung Tâm Phân Công Gia Sư Vào Lớp (Tutor Assignment & Conflict Check)

**Mục tiêu**: Tại hạn chốt đăng ký, lớp nhóm đạt sĩ số hợp lệ ($\ge 2$ học viên), Admin phân công Gia sư Trung tâm phụ trách lớp mà không bị trùng lịch dạy.

```mermaid
sequenceDiagram
    autonumber
    actor Admin as Admin Trung Tâm
    participant FE as Web Admin (React)
    participant BE as Backend (Spring Boot)
    participant DB as Database (PostgreSQL)

    Admin->>FE: 1. Xem danh sách lớp đến hạn chốt (Sĩ số: 5 học viên >= 2)
    Admin->>FE: 2. Chọn Gia sư Thầy Nam cho Lớp Toán 12
    FE->>BE: POST /api/v1/admin/classes/{id}/assign-tutor { tutorId: 201 }

    Note over BE: Hard Conflict Validation (BR-03.30):<br/>Quét toàn bộ 24 sessions của lớp với mọi ca dạy active của Thầy Nam
    BE->>DB: Query lịch dạy Thầy Nam giao nhau với 24 sessions
    DB-->>BE: Giao nhau = 0 ca (Không trùng lịch)

    BE->>DB: INSERT INTO tutor_assignments (tutor_id, class_id, status='ACTIVE')
    BE->>DB: UPDATE classes SET status = 'ASSIGNED'
    BE-->>FE: Phân công thành công!

    Note over BE,DB: Tự động cập nhật 24 buổi học vào Calendar của Gia sư & 5 Học viên
    BE-->>Admin: Gửi thông báo đến Gia sư & Học viên
```

- **Thay đổi trạng thái**: `classes.status`: `ENROLLING` $\rightarrow$ `ASSIGNED`.
- **Dữ liệu sinh ra**: 1 bản ghi `tutor_assignments` (`ACTIVE`).

---

### 2.4. Flow 4: Vận Hành Buổi Học & Điểm Danh (Session Execution & Attendance)

**Mục tiêu**: Lớp học bước vào giai đoạn khai giảng (`IN_PROGRESS`), gia sư giảng dạy buổi học và chốt điểm danh.

```mermaid
sequenceDiagram
    autonumber
    actor Tutor as Gia Sư Trung Tâm
    actor Student as Học Viên
    participant FE as App / Web (React)
    participant BE as Backend (Spring Boot)
    participant DB as Database (PostgreSQL)

    Note over BE: Đến ngày khai giảng: Scheduler chuyển classes sang 'IN_PROGRESS'
    Note over BE: Đến giờ học (Thứ 2, 18:00): Scheduler chuyển session sang 'IN_SESSION'

    alt Lớp Offline
        Tutor->>Student: Dạy trực tiếp tại cơ sở Trung tâm
        Tutor->>FE: Mở giao diện Điểm danh Buổi 1
        Tutor->>FE: Đánh dấu: 4 bạn PRESENT, 1 bạn LATE (vào sau 15p)
        FE->>BE: POST /api/v1/tutor/sessions/{id}/attendance
    else Lớp Online (MVP)
        Tutor->>FE: Nhấp "Vào lớp học" (Mở link Zoom/Meet trong session.meeting_url)
        Student->>FE: Nhấp "Vào lớp học"
        Tutor->>FE: Nhập điểm danh tay danh sách tham dự
        FE->>BE: POST /api/v1/tutor/sessions/{id}/attendance
    end

    BE->>DB: UPSERT INTO attendances (session_id, student_id, status)
    
    Note over BE: Sau 24h kể từ khi kết thúc ca học (BR-04.33, BR-04.34):
    BE->>DB: UPDATE sessions SET status = 'COMPLETED'
    Note over DB: Buổi học này chính thức trở thành "Buổi dạy hợp lệ" tính lương
```

- **Thay đổi trạng thái**: `sessions.status`: `SCHEDULED` $\rightarrow$ `IN_SESSION` $\rightarrow$ `COMPLETED`.
- **Dữ liệu sinh ra**: 5 bản ghi `attendances`.

---

### 2.5. Flow 5: Quyết Toán & Chốt Bảng Lương Gia Sư Hàng Tháng (Monthly Payroll Settlement)

**Mục tiêu**: Cuối tháng dương lịch, hệ thống tự động tổng hợp số buổi dạy thực tế để tạo bảng lương minh bạch cho từng Gia sư.

```mermaid
sequenceDiagram
    autonumber
    actor Admin as Admin Trung Tâm
    actor Tutor as Gia Sư Trung Tâm
    participant Scheduler as System Cron Scheduler
    participant BE as Backend (Spring Boot)
    participant DB as Database (PostgreSQL)

    Note over Scheduler: Đêm ngày cuối cùng của tháng (23:59 ngày 31)
    Scheduler->>BE: Trigger Job: Tính lương tháng (VD: 2026-10)
    
    loop Duyệt từng Gia sư Active
        BE->>DB: Lấy base_salary và session_rate từ tutor_profiles
        BE->>DB: Đếm số buổi 'COMPLETED' mà gia sư trực tiếp dạy (bao gồm cả dạy thay)
        Note over BE: Áp dụng công thức BR-02.40:<br/>Lương = Lương cứng + (Số buổi hợp lệ * session_rate)
        BE->>DB: INSERT INTO tutor_payrolls (tutor_id, payroll_month, base_salary_amount, total_valid_sessions, total_salary_amount, status='DRAFT')
    end

    Admin->>BE: Đăng nhập Dashboard Lương, xem và rà soát bảng lương
    Admin->>BE: Nhấn "Phê duyệt & Chốt bảng lương"
    BE->>DB: UPDATE tutor_payrolls SET status = 'APPROVED', approved_by = Admin.id
    
    Tutor->>BE: Đăng nhập xem Bảng lương cá nhân tháng 10
    BE-->>Tutor: Hiển thị minh bạch: Lương cứng, Danh sách 20 ca đã dạy, Tổng nhận
```

- **Thay đổi trạng thái**: `tutor_payrolls.status`: `DRAFT` $\rightarrow$ `APPROVED` $\rightarrow$ `PAID`.
- **Dữ liệu sinh ra**: Bản ghi `tutor_payrolls` tương ứng cho từng gia sư.
