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
├── backend/                       # Spring Boot 3 + Java 21
├── docker-compose.yml             # Postgres + (tùy chọn) backend/frontend local
└── README.md                      # Hướng dẫn chạy dự án
```

| Thành phần | Công nghệ đề xuất | Lý do |
| :--- | :--- | :--- |
| Frontend | React 18, Vite, TypeScript, React Router, TanStack Query, Axios | SPA theo vai trò, gọi REST. |
| UI | Tailwind CSS + component tự viết (hoặc shadcn/ui) | Nhanh, đồng nhất Admin / Tutor / Student. |
| Auth FE | JWT lưu memory + refresh cookie httpOnly (hoặc localStorage giai đoạn đồ án) | Khớp Spring Security. |
| Backend | Spring Boot 3, Java 21, Spring Web, Spring Data JPA, Spring Security | REST API, phân quyền `ROLE_*`. |
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

Package gốc: `com.viettritutor`. Backend dùng **kiến trúc phân tầng (package by layer)**, phù hợp cấu trúc thực hành SBA301. Các chức năng chạy trong cùng một ứng dụng Spring Boot và dùng chung PostgreSQL.

Luồng xử lý: **`controller` → `service` → `repository` → database**. Entity ánh xạ bảng dữ liệu; DTO mô tả request/response của API.

Cấu trúc đang triển khai:

```text
backend/
├── pom.xml                            # Spring Boot 3, Java 21
├── src/main/java/com/viettritutor/
│   ├── VietTriTutorApplication.java   # Package gốc để Spring quét các tầng
│   ├── common/
│   │   ├── api/                       # ApiResponse, PageResponse
│   │   └── exception/                 # BusinessException, ErrorCode, handler
│   ├── config/                        # Security, CORS, OpenAPI, Clock
│   ├── security/
│   │   ├── CurrentUser.java
│   │   └── jwt/                       # JwtService, JwtAuthFilter
│   ├── controller/
│   │   ├── AuthController.java
│   │   └── SessionController.java
│   ├── dto/
│   │   ├── auth/                      # AuthRequest, RegisterRequest, AuthResponse
│   │   └── schedule/                  # MeetingUrlRequest, SessionResponse
│   ├── entity/
│   │   ├── User.java
│   │   ├── Session.java
│   │   ├── LearningSchedule.java
│   │   └── SessionGenerationLock.java
│   ├── enums/                         # SessionStatus, LearningScheduleStatus,
│   │                                  # SchedulePattern, TimeSlot
│   ├── repository/
│   │   ├── UserRepository.java
│   │   ├── SessionRepository.java
│   │   ├── LearningScheduleRepository.java
│   │   └── SessionGenerationLockRepository.java
│   └── service/
│       ├── AuthService.java
│       ├── UserDetailsServiceImpl.java
│       ├── SessionQueryService.java
│       ├── LearningScheduleService.java
│       ├── SessionGenerator.java
│       ├── DefaultSessionGenerator.java
│       ├── SessionGenerationSpec.java
│       ├── SessionDateCalculator.java
│       ├── SessionLifecycleService.java
│       ├── SessionLifecycleJob.java
│       ├── ClassLifecycle.java
│       └── ClassTeachingCompletedEvent.java
├── src/main/resources/
│   ├── application.yml
│   ├── application-dev.yml
│   └── db/migration/
│       ├── V1__init_users.sql
│       └── V2__create_session_schedule.sql
└── src/test/java/com/viettritutor/
    ├── ApplicationContextTest.java
    ├── controller/ApiCompatibilityTest.java
    ├── repository/SessionRepositoryTest.java
    └── service/                       # Kiểm thử sinh lịch, truy vấn và vòng đời
```

Quy tắc tổ chức:

- `controller`: khai báo endpoint, nhận/validate request và gọi service; không truy cập repository trực tiếp.
- `service`: xử lý nghiệp vụ, ownership và transaction. Job lịch học và các hợp đồng tích hợp nghiệp vụ nằm ở tầng này.
- `repository`: khai báo truy vấn và khóa dữ liệu qua Spring Data JPA.
- `entity`: JPA entity ánh xạ bảng dữ liệu.
- `enums`: enum nghiệp vụ dùng chung giữa controller, DTO, service và entity. `ErrorCode` tiếp tục ở `common.exception` vì gắn với cơ chế xử lý lỗi.
- `dto`: nhóm theo chức năng (`auth`, `schedule`, sau này có thể thêm `catalog`, `enrollment`...) để giữ tên và hợp đồng API rõ ràng.
- `common`: response và exception dùng chung; `security` và `config` chứa xác thực và cấu hình kỹ thuật.
- Test đặt trong package tương ứng với tầng được kiểm thử.

Các chức năng `catalog`, `enrollment`, `assignment`, `attendance`, `payroll` bên dưới là kế hoạch phát triển. Khi triển khai, thêm class vào các tầng trên, ví dụ `controller.AdminCourseController`, `service.PricingService`, `entity.Course`, `repository.CourseRepository`, `dto.catalog.*`.

Việc chuyển package giữ nguyên HTTP method, URL, request/response, phân quyền, nghiệp vụ và schema database. Các endpoint hiện có:

| Method | URL |
| :--- | :--- |
| POST | `/api/v1/auth/register` |
| POST | `/api/v1/auth/login` |
| GET | `/api/v1/me/sessions` |
| GET | `/api/v1/admin/sessions` |
| GET | `/api/v1/sessions/{sessionId}` |
| PUT | `/api/v1/admin/sessions/{sessionId}/meeting-url` |

Chạy `mvn clean verify` trong thư mục `backend` để kiểm tra source sau khi chuyển package và đóng gói ứng dụng. `ApiCompatibilityTest` kiểm tra các endpoint trên qua MockMvc, Spring Security, service và JPA. Test dùng H2; migration và khóa đặc thù PostgreSQL cần được kiểm tra riêng trên PostgreSQL.

Tên entity lớp: dùng `CourseClass` hoặc `ClassGroup` để tránh nhầm với `java.lang.Class`.

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

Giai đoạn 2 tiếp tục thêm chức năng vào các tầng hiện có, ví dụ `controller.VideoCallController`, `service.VideoCallService` và `dto.videocall`, mà không cần đổi package gốc.
