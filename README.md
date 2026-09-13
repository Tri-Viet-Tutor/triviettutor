# VietTriTutor

**VietTriTutor** is a centralized tutoring center management system built as the capstone project for SBA301 at FPT University (Fall 2026).

It manages courses, class scheduling, student enrollments, tutor assignments, attendance, and payroll — all in one platform.

---

## Tech Stack

| Layer       | Technology                                                                 |
|-------------|----------------------------------------------------------------------------|
| Frontend    | React 18, Vite, TypeScript, React Router v6, TanStack Query v5, Axios     |
| UI          | Tailwind CSS, shadcn/ui                                                    |
| State       | Zustand (auth session)                                                     |
| Forms       | React Hook Form + Zod                                                      |
| Backend     | Spring Boot 3, Java 17, Spring Web, Spring Data JPA, Spring Security      |
| Database    | PostgreSQL 16                                                              |
| Migration   | Flyway                                                                     |
| API Docs    | springdoc-openapi (Swagger UI @ `/swagger-ui.html`)                        |
| Auth        | JWT (Bearer token)                                                         |
| Dev Infra   | Docker Compose (PostgreSQL + pgAdmin)                                      |

---

## Project Structure

```
triviettutor/
├── Documentation/          # Business rules & architecture docs
├── frontend/               # React + Vite + TypeScript SPA
├── backend/                # Spring Boot 3 REST API
├── docker-compose.yml      # Local dev database (PostgreSQL + pgAdmin)
├── .env.example            # Backend environment variable template
└── README.md
```

---

## Quick Start

### Prerequisites

- **Java 17+** (e.g., Temurin / OpenJDK)
- **Node.js 20+** + npm
- **Docker Desktop** (for local database)

### 1. Clone the repository

```bash
git clone <repository-url>
cd triviettutor
```

### 2. Start the database

```bash
docker compose up -d
```

PostgreSQL is available at `localhost:5432`  
pgAdmin UI is available at `http://localhost:5050`

### 3. Configure backend environment

```bash
# Copy the example and fill in your values
cp .env.example .env
```

Set `DB_PASSWORD` and `JWT_SECRET` in `.env`.

### 4. Run the backend

```bash
cd backend
./mvnw spring-boot:run -Dspring-boot.run.profiles=dev
```

API: `http://localhost:8080/api/v1`  
Swagger UI: `http://localhost:8080/swagger-ui.html`

### 5. Run the frontend

```bash
cd frontend
npm install
npm run dev
```

App: `http://localhost:5173`

---

## User Roles

| Role            | Code            | Responsibilities                                               |
|-----------------|-----------------|----------------------------------------------------------------|
| Admin           | `ROLE_ADMIN`    | Create courses/classes, manage fees, assign tutors, payroll    |
| Tutor           | `ROLE_TUTOR`    | Set availability, attend sessions, record attendance           |
| Student/Parent  | `ROLE_STUDENT`  | Browse classes, enroll, pay, track schedule                    |

---

## API Base URL

```
http://localhost:8080/api/v1
```

All protected routes require `Authorization: Bearer <token>` header.

---

## 9-Week Development Roadmap

| Week | Sprint Goal                                                                      |
|------|----------------------------------------------------------------------------------|
| 1    | Project setup, DB migration V1 (users), JWT auth, login/register UI             |
| 2    | `catalog` module — Course & ClassGroup CRUD, enums, pricing table (BR-02)       |
| 3    | `schedule` module — SessionGenerator from SchedulePattern, session list UI      |
| 4    | `enrollment` module — payment flow (mock), conflict guard, class capacity       |
| 5    | `assignment` module — ConflictValidationService, assign tutor, conflict UI      |
| 6    | `attendance` module — check-in (Offline), attendance record, session lifecycle  |
| 7    | `payroll` module — monthly payroll calculation (BR-02.40), admin payroll UI     |
| 8    | Integration & polishing — role-based guards, dashboards, error handling         |
| 9    | Testing, bug fixes, deployment prep, presentation                               |

---

## Environment Variables

See [`.env.example`](.env.example) for the full list of required variables.

---

## Contributing

Each team member should work on a feature branch named `feature/<module>-<short-description>`.  
Example: `feature/enrollment-conflict-guard`

Open a Pull Request to `main` and request at least one review before merging.
