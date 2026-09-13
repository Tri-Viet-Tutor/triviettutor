# Cấu trúc dự án VietTriTutor

Tài liệu mô tả **cách tổ chức mã nguồn** khi triển khai VietTriTutor:

- **Frontend:** React (Vite + TypeScript)
- **Backend:** Java Spring Boot 3

Cấu trúc bám các module nghiệp vụ trong `01-Business-Logic` (vai trò, học phí, lịch, phân công, điểm danh, lương).

---

## 1. Nguyên tắc chia repo

Dùng **monorepo 2 ứng dụng** (phù hợp đồ án SBA301): một thư mục frontend, một thư mục backend, tài liệu nằm cùng repo.

```text
VietTriTutor/
├── documentation/                 # Tài liệu nghiệp vụ & kiến trúc (thư mục hiện tại)
├── frontend/                      # React + Vite + TypeScript
├── backend/                       # Spring Boot 3 + Java 17
├── docker-compose.yml             # Postgres + (tùy chọn) backend/frontend local
└── README.md                      # Hướng dẫn chạy dự án
```

| Thành phần | Công nghệ đề xuất | Lý do |
| :--- | :--- | :--- |
| Frontend | React 18, Vite, TypeScript, React Router, TanStack Query, Axios | SPA theo vai trò, gọi REST. |
| UI | Tailwind CSS + component tự viết (hoặc shadcn/ui) | Nhanh, đồng nhất Admin / Tutor / Student. |
| Auth FE | JWT lưu memory + refresh cookie httpOnly (hoặc localStorage giai đoạn đồ án) | Khớp Spring Security. |
| Backend | Spring Boot 3, Java 17, Spring Web, Spring Data JPA, Spring Security | REST API, phân quyền `ROLE_*`. |
| Database | PostgreSQL | Quan hệ lớp–buổi–enrollment rõ ràng. |
| Migration | Flyway | Version schema theo sprint. |
| API doc | springdoc-openapi (Swagger UI) | FE và tester dùng chung contract. |

Giao tiếp: frontend gọi `https://api.viettritutor.local/api/v1/...`. Không share database cho React.

---

## 2. Frontend — React

```text
frontend/
├── public/
├── src/
│   ├── app/
│   │   ├── App.tsx
│   │   ├── providers.tsx              # QueryClient, Auth, Theme
│   │   └── router.tsx                 # Khai báo route theo role
│   ├── layouts/
│   │   ├── AdminLayout.tsx
│   │   ├── TutorLayout.tsx
│   │   ├── StudentLayout.tsx
│   │   └── AuthLayout.tsx
│   ├── pages/                         # Page mỏng: gắn feature vào layout
│   │   ├── auth/
│   │   │   ├── LoginPage.tsx
│   │   │   └── RegisterPage.tsx
│   │   ├── admin/
│   │   ├── tutor/
│   │   └── student/
│   ├── features/                      # Nghiệp vụ = 1 thư mục
│   │   ├── auth/
│   │   ├── catalog/                   # Học viên xem lớp đang mở
│   │   ├── courses/                   # Admin tạo khóa / lớp
│   │   ├── enrollments/               # Đăng ký + thanh toán
│   │   ├── schedule/                  # Lịch & xin nghỉ
│   │   ├── assignment/                # Phân công gia sư (Admin)
│   │   ├── attendance/                # Điểm danh
│   │   └── payroll/                   # Bảng lương tháng
│   ├── components/                    # UI dùng chung (Button, Modal, DataTable)
│   ├── hooks/
│   ├── lib/
│   │   ├── api.ts                     # Axios instance + interceptor JWT
│   │   ├── queryClient.ts
│   │   └── constants.ts               # SchedulePattern, TimeSlot, ClassType
│   ├── stores/
│   │   └── authStore.ts
│   ├── types/                         # DTO khớp backend
│   │   ├── user.ts
│   │   ├── course.ts
│   │   ├── class.ts
│   │   ├── enrollment.ts
│   │   └── session.ts
│   ├── utils/
│   │   ├── datetime.ts
│   │   └── money.ts
│   ├── styles/
│   │   └── index.css
│   └── main.tsx
├── index.html
├── package.json
├── tsconfig.json
├── vite.config.ts
└── .env.example                       # VITE_API_BASE_URL
```

Mỗi `features/<tên>/` lặp cùng pattern:

```text
features/enrollments/
├── api.ts                 # Gọi REST
├── hooks.ts               # useEnrollClass, useMyEnrollments
├── components/
└── utils.ts               # Tính bậc chiết khấu hiển thị (đối chiếu BR-02)
```

### 2.1. Phân route theo vai trò (BR-01)

| Prefix | Role | Màn hình chính |
| :--- | :--- | :--- |
| `/login`, `/register` | Khách | Đăng nhập / đăng ký |
| `/admin/courses` | `ROLE_ADMIN` | Khóa học, lớp, học phí |
| `/admin/assignments` | `ROLE_ADMIN` | Phân công, cảnh báo trùng lịch |
| `/admin/reschedules` | `ROLE_ADMIN` | Duyệt nghỉ, xếp bù / dạy thay |
| `/admin/payroll` | `ROLE_ADMIN` | Chốt lương tháng |
| `/tutor/availability` | `ROLE_TUTOR` | Lịch rảnh |
| `/tutor/sessions` | `ROLE_TUTOR` | Buổi được gán, điểm danh |
| `/tutor/payroll` | `ROLE_TUTOR` | Xem lương của mình |
| `/student/catalog` | `ROLE_STUDENT` | Lớp đang `ENROLLING` |
| `/student/enrollments` | `ROLE_STUDENT` | Lớp đã mua, thanh toán |
| `/student/schedule` | `ROLE_STUDENT` | Lịch & xin nghỉ |

Route guard: chưa đăng nhập → `/login`. Sai role → `/403`.

### 2.2. Gợi ý thư viện FE

- `react-router-dom` — routing
- `@tanstack/react-query` — cache API
- `axios` — HTTP
- `zustand` — auth session
- `react-hook-form` + `zod` — form tạo lớp / đăng ký
- `date-fns` — xử lý buổi học
- `recharts` (tùy chọn) — dashboard Admin

---

## 3. Backend — Spring Boot

Package gốc: `com.viettritutor`.

Chia **theo module nghiệp vụ** (không nhét toàn bộ entity vào một package `model`). Mỗi module đủ 4 lớp: `api` (controller) → `service` → `repository` + `domain`.

```text
backend/
├── pom.xml
├── src/main/java/com/viettritutor/
│   ├── VietTriTutorApplication.java
│   ├── common/                        # Dùng chung, không chứa nghiệp vụ
│   │   ├── api/
│   │   │   ├── ApiResponse.java
│   │   │   └── PageResponse.java
│   │   ├── exception/
│   │   │   ├── GlobalExceptionHandler.java
│   │   │   ├── BusinessException.java
│   │   │   └── ErrorCode.java         # Ví dụ SCHEDULE_CONFLICT, CLASS_FULL
│   │   └── util/
│   │       └── TimeOverlap.java       # BR-03.30
│   ├── config/
│   │   ├── SecurityConfig.java
│   │   ├── OpenApiConfig.java
│   │   └── CorsConfig.java
│   ├── security/
│   │   ├── jwt/
│   │   │   ├── JwtService.java
│   │   │   └── JwtAuthFilter.java
│   │   └── CurrentUser.java
│   └── modules/
│       ├── auth/
│       │   ├── api/AuthController.java
│       │   ├── service/AuthService.java
│       │   └── dto/
│       ├── user/
│       │   ├── domain/User.java       # roles: ADMIN | TUTOR | STUDENT
│       │   ├── domain/TutorProfile.java
│       │   ├── domain/StudentProfile.java
│       │   ├── api/UserController.java
│       │   ├── service/
│       │   └── repository/
│       ├── catalog/                   # Course + Class (Admin tạo, Student xem)
│       │   ├── domain/Course.java
│       │   ├── domain/ClassGroup.java # "Class" là keyword Java → ClassGroup / CourseClass
│       │   ├── domain/enums/
│       │   │   ├── ClassType.java     # ONE_ON_ONE, GROUP
│       │   │   ├── ClassStatus.java   # DRAFT ... CANCELLED (BR-04)
│       │   │   ├── DeliveryMode.java  # ONLINE, OFFLINE
│       │   │   ├── SchedulePattern.java
│       │   │   └── TimeSlot.java
│       │   ├── api/AdminCourseController.java
│       │   ├── api/CatalogController.java
│       │   ├── service/PricingService.java   # BR-02 bảng chiết khấu
│       │   └── repository/
│       ├── enrollment/
│       │   ├── domain/Enrollment.java
│       │   ├── domain/Payment.java
│       │   ├── api/EnrollmentController.java
│       │   ├── service/EnrollmentService.java
│       │   └── service/StudentConflictService.java
│       ├── schedule/
│       │   ├── domain/Session.java
│       │   ├── domain/LeaveRequest.java
│       │   ├── service/SessionGenerator.java    # Sinh buổi từ pattern
│       │   ├── service/RescheduleService.java
│       │   └── api/
│       ├── assignment/
│       │   ├── domain/Assignment.java
│       │   ├── service/ConflictValidationService.java
│       │   ├── service/AssignmentService.java
│       │   └── api/AdminAssignmentController.java
│       ├── attendance/
│       │   ├── domain/AttendanceRecord.java
│       │   ├── service/AttendanceService.java
│       │   └── api/AttendanceController.java
│       └── payroll/
│           ├── domain/PayrollPeriod.java
│           ├── domain/PayrollLine.java
│           ├── service/PayrollService.java      # BR-02.40
│           └── api/
├── src/main/resources/
│   ├── application.yml
│   ├── application-dev.yml
│   └── db/migration/
│       ├── V1__init_users.sql
│       ├── V2__courses_and_classes.sql
│       ├── V3__enrollments_payments.sql
│       ├── V4__sessions_assignments.sql
│       └── V5__attendance_payroll.sql
└── src/test/java/com/viettritutor/
    ├── modules/assignment/ConflictValidationServiceTest.java
    ├── modules/catalog/PricingServiceTest.java
    └── modules/enrollment/EnrollmentServiceTest.java
```

Tên entity lớp: dùng `CourseClass` (hoặc `ClassGroup`) — **không** đặt `Class` vì trùng keyword Java.

### 3.1. Quan hệ dữ liệu cốt lõi

```text
User 1 ── 1 TutorProfile
User 1 ── 1 StudentProfile

Course 1 ── * CourseClass
CourseClass 1 ── * Session          (sinh từ SchedulePattern + TimeSlot)
CourseClass 1 ── * Enrollment
CourseClass 0..1 ── 1 Assignment    (gia sư chính hiện tại)
Session 0..1 ── 1 User              (gia sư dạy buổi đó; có thể là dạy thay)
Session 1 ── * AttendanceRecord
Enrollment 1 ── * Payment
```

### 3.2. API REST gợi ý (`/api/v1`)

| Method | Đường dẫn | Role | Nghiệp vụ |
| :--- | :--- | :--- | :--- |
| POST | `/auth/login` | Public | Đăng nhập JWT |
| POST | `/auth/register` | Public | Đăng ký học viên |
| CRUD | `/admin/courses` | ADMIN | Khóa học |
| CRUD | `/admin/classes` | ADMIN | Lớp, chuyển trạng thái |
| GET | `/catalog/classes` | STUDENT, ADMIN | Lớp `ENROLLING` còn chỗ |
| POST | `/enrollments` | STUDENT | Đăng ký + tạo thanh toán |
| POST | `/admin/classes/{id}/assign` | ADMIN | Phân công — chặn trùng |
| GET | `/me/sessions` | TUTOR, STUDENT | Lịch của tôi |
| POST | `/sessions/{id}/leave` | TUTOR, STUDENT | Xin nghỉ |
| POST | `/admin/sessions/{id}/makeup` | ADMIN | Xếp buổi bù |
| POST | `/admin/sessions/{id}/substitute` | ADMIN | Dạy thay |
| PUT | `/sessions/{id}/attendance` | TUTOR, ADMIN | Điểm danh |
| GET/POST | `/admin/payroll/{year}/{month}` | ADMIN | Tính / chốt lương |
| GET | `/tutor/payroll` | TUTOR | Xem lương mình |

Mọi API ghi (phân công, đăng ký) trả `409` + `ErrorCode.SCHEDULE_CONFLICT` hoặc `CLASS_FULL` khi vi phạm BR.

### 3.3. Bảo mật

```text
SecurityFilterChain:
  /api/v1/auth/**              permitAll
  /api/v1/catalog/**           authenticated
  /api/v1/admin/**             hasRole('ADMIN')
  /api/v1/tutor/**             hasRole('TUTOR')
  /api/v1/enrollments/**       hasRole('STUDENT')
  còn lại                      authenticated
```

Khớp ma trận BR-01.10: service phải kiểm tra **ownership** (gia sư chỉ điểm danh buổi của mình; học viên chỉ xem enrollment của mình), không dựa mỗi prefix URL.

---

## 4. Biến môi trường

**Frontend** `.env.example`

```env
VITE_API_BASE_URL=http://localhost:8080/api/v1
```

**Backend** `application-dev.yml`

```yaml
server.port: 8080
spring:
  datasource:
    url: jdbc:postgresql://localhost:5432/viettritutor
    username: viettri
    password: ${DB_PASSWORD}
  jpa:
    hibernate:
      ddl-auto: validate
  flyway:
    enabled: true
app:
  jwt:
    secret: ${JWT_SECRET}
    expiration-ms: 86400000
```

Không commit mật khẩu / JWT secret.

---

## 5. Thứ tự dựng code (khớp tài liệu nghiệp vụ)

1. `user` + `auth` — 3 role, JWT, guard FE.
2. `catalog` — Course, CourseClass, enum trạng thái, bảng giá BR-02.
3. `schedule` — sinh `Session` từ mẫu lịch.
4. `enrollment` — thanh toán giả lập (sandbox), chặn trùng lịch học viên, sĩ số, hoàn tiền `FAILED_TO_OPEN`.
5. `assignment` — `ConflictValidationService` (unit test bắt buộc).
6. `attendance` — check-in Offline; Online MVP nhập tay / `meetingUrl`.
7. `payroll` — lương cứng + buổi `COMPLETED`.
8. Video Call SDK — **sau MVP** (BR-04.40).

---

## 6. Ranh giới MVP

| Làm trong MVP | Để giai đoạn sau |
| :--- | :--- |
| Offline tại Trung tâm | SDK Video Call, whiteboard, recording |
| Thanh toán giả lập (chuyển khoản / mock success) | Cổng thanh toán thật (VNPay, MoMo) |
| Một gia sư chính / lớp | Nhiều trợ giảng |
| Phụ huynh = `ROLE_STUDENT` | Tách tài khoản phụ huynh–con |
| Điểm danh QR hoặc nút check-in | Hardware kiosk |

Cấu trúc thư mục trên đã chừa chỗ cho giai đoạn 2 (ví dụ `modules/videocall/`) mà không cần đổi package cốt lõi.
