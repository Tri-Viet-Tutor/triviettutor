# CẤU TRÚC DỰ ÁN VIETTRITUTOR (AIVES)
> **Tài liệu tham chiếu nhanh (Quick Reference)** dành cho Developer và AI Agent khi làm việc trong repository.

---

## 1. CÂY THƯ MỤC TỔNG THỂ (WORKSPACE DIRECTORY STRUCTURE)

```text
triviettutor/
├── backend/                      # Spring Boot 3.3.4 (Java 21) REST API
│   ├── src/main/java/com/viettritutor/
│   │   ├── common/              # ApiResponse, BaseEntity, Exception handling (ErrorCode)
│   │   ├── config/              # App configs (Security, Recaptcha, CORS, Mail)
│   │   ├── controller/          # REST Controllers (/api/v1/...)
│   │   ├── dto/                 # Request/Response DTOs (auth, payment, class, tutor, etc.)
│   │   ├── entity/              # JPA Entities (User, ClassGroup, Enrollment, Payment, etc.)
│   │   ├── enums/               # Domain Enums (Role, SessionStatus, PaymentStatus, ...)
│   │   ├── repository/          # Spring Data JPA Repositories
│   │   ├── security/            # JWT Filters, UserDetails, CurrentUser annotation
│   │   └── service/             # Business Logic Interfaces & Impls (impl/)
│   ├── src/main/resources/
│   │   ├── application.yml      # Cấu hình môi trường & Spring settings
│   │   └── db/migration/        # Flyway SQL migrations (V1__ -> V12__...)
│   ├── pom.xml                  # Maven dependencies & build plugins
│   ├── .env.example             # Mẫu biến môi trường Backend
│   └── .env                     # Biến môi trường cục bộ (KHÔNG commit)
│
├── frontend/                     # React 18 + TypeScript + Vite + Tailwind CSS
│   ├── src/
│   │   ├── app/                 # App root, Router provider
│   │   ├── components/          # Reusable UI components (Button, Modal, Input, Recaptcha, ...)
│   │   ├── constants/           # Routes, config constants
│   │   ├── features/            # Feature-Driven Modules (auth, catalog, checkout, portal, ...)
│   │   │   ├── auth/            # Login, Register, Forgot Password, OTP verification
│   │   │   ├── catalog/         # Course listing, grade filters, subject search
│   │   │   ├── checkout/        # Tuition payment flow, shopping cart
│   │   │   └── portal/          # Student / Tutor / Admin portal common components
│   │   ├── hooks/               # Custom React hooks
│   │   ├── layouts/             # RootLayout, StudentLayout, AdminLayout, TutorLayout
│   │   ├── lib/                 # Axios instance (`api.ts`), react-query client
│   │   ├── pages/               # Page components grouped by role (public, student, tutor, admin)
│   │   ├── stores/              # Zustand state stores (authStore, cartStore)
│   │   ├── types/               # TypeScript type definitions & API contracts
│   │   └── utils/               # Formatting, currency, date helpers
│   ├── package.json             # NPM dependencies (Node >= 22.23.2, npm >= 10.9.8)
│   ├── tailwind.config.ts       # Tailwind CSS design tokens & colors
│   ├── vite.config.ts           # Vite build config
│   ├── .env.example             # Mẫu biến môi trường Frontend
│   └── .env                     # Biến môi trường Frontend (VITE_API_URL, VITE_RECAPTCHA_*)
│
├── mobile/                       # React Native (Expo) mobile client
│   ├── app/                     # Expo Router file-based screens
│   ├── components/              # Mobile UI components
│   └── package.json             # Mobile dependencies
│
├── Documentation/                # SOURCE OF TRUTH - ĐẶC TẢ HỆ THỐNG
│   ├── 00-Product-Definition/   # Yêu cầu chức năng (FR), Mô hình khái niệm/logic/vật lý
│   ├── 01-Business-Logic/       # Quy tắc nghiệp vụ (BR-01 User, BR-02 Pricing, BR-03 Schedule, BR-04 Class)
│   ├── 02-System-Architecture/  # Kiến trúc hệ thống, cấu trúc thư mục, API Specification chuẩn
│   └── 03-Backend-Task-Allocation/ # Phân chia công việc thành viên (01-Quang, 02-Huu)
│
├── scripts/                      # PowerShell automation scripts (start-backend, db migrations, ...)
├── docker-compose.yml            # Docker setup cho PostgreSQL, pgAdmin cục bộ
├── AGENTS.md                     # Quy tắc cốt lõi bắt buộc dành cho Agent (Single Source of Truth, No Hardcoding)
└── STRUCTURE.md                  # File này - Bản đồ tra cứu nhanh kiến trúc dự án
```

---

## 2. HƯỚNG DẪN THỰC THI (COMMAND EXECUTION & CWD)

> ⚠️ **LƯU Ý QUAN TRỌNG VỀ THƯ MỤC LÀM VIỆC (CWD):**  
> Thư mục gốc repo không có `pom.xml` hay `package.json`. Phải chạy đúng thư mục con hoặc chỉ định cờ đường dẫn.

### 2.1. Backend (Spring Boot)
- **Thư mục làm việc:** `c:\...\triviettutor\backend`
- **Khởi chạy ứng dụng:**
  ```powershell
  cd backend
  mvn spring-boot:run
  # Hoặc chạy từ root:
  mvn -f backend/pom.xml spring-boot:run
  ```
- **Chạy Tests:**
  ```powershell
  cd backend
  mvn test
  # Hoặc:
  mvn -f backend/pom.xml test
  ```
- **Biến môi trường Backend (`backend/.env`):**
  - Đọc tự động bởi Spring Boot qua file cấu hình `application.yml`.
  - Cần có: `SERVER_PORT`, `APP_PROFILE`, `DB_URL`, `DB_USERNAME`, `DB_PASSWORD`, `JWT_SECRET`, `CORS_ALLOWED_ORIGINS`, `FRONTEND_URL`.
  - Module reCAPTCHA: `RECAPTCHA_ENABLED`, `RECAPTCHA_SITE_KEY`, `RECAPTCHA_SECRET_KEY`, `RECAPTCHA_BYPASS_KEY`.

### 2.2. Frontend (React + Vite)
- **Thư mục làm việc:** `c:\...\triviettutor\frontend`
- **Cài đặt & chạy dev server:**
  ```powershell
  cd frontend
  npm install
  npm run dev
  ```
- **Kiểm tra TypeScript & Lint:**
  ```powershell
  cd frontend
  npm run type-check
  npm run build
  ```
- **Biến môi trường Frontend (`frontend/.env`):**
  - `VITE_API_BASE_URL=http://localhost:8080/api/v1`
  - `VITE_RECAPTCHA_SITE_KEY=...` (để trống thì frontend tự động bypass khi dev)

---

## 3. PHÂN CHIA NHÁNH & MODULES ĐANG PHÁT TRIỂN

| Nhánh | Trách nhiệm | Mô tả chi tiết |
|:---|:---|:---|
| `main` | Production / Stable | Nhánh ổn định chính của dự án. |
| `payment_enrollment_refunds` | Thành viên Hữu | Module thanh toán học phí (Mock payment), Enrollment, Quản lý hoàn tiền (Refund). Không áp dụng SePay. |
| `f-recaptcha` | Thành viên Cường / Quang | **Nhánh hiện tại**: Tích hợp Google reCAPTCHA v2 (Checkbox) cho các màn hình Auth (`/login`, `/register`, `/forgot-password`), hỗ trợ Bypass Key cho môi trường Dev/Test. |

---

## 4. QUY TRÌNH PHÁT TRIỂN BẮT BUỘC (DEVELOPER GUIDELINES)

1. **Docs First - Code Later**: Mọi thay đổi về endpoint, model, luồng nghiệp vụ phải đối chiếu và cập nhật vào `Documentation/` trước khi viết mã nguồn.
2. **Tuyệt đối không Hardcode (No Hardcoding)**:
   - Backend: Mọi URL, port, credentials đọc từ `application.yml` + `${ENV_VAR}`.
   - Frontend: Sử dụng `import.meta.env.VITE_*` hoặc `window.location.origin`. Không bao giờ dùng wildcard `*` trong origin/URL.
3. **Phân tách trách nhiệm**:
   - Nhánh `f-recaptcha` KHÔNG chứa mã nguồn SePay hay can thiệp vào module Payment của bạn Hữu.
   - Mọi tính năng CAPTCHA đều hỗ trợ cờ tắt/mở (`enabled: false`) và bypass token để không làm đứt gãy luồng CI/CD và dev cục bộ.
