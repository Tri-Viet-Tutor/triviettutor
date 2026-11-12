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
| Backend     | Spring Boot 3, Java 21, Spring Web, Spring Data JPA, Spring Security      |
| Database    | PostgreSQL on Supabase Cloud (shared team database)                        |
| Migration   | Flyway                                                                     |
| API Docs    | springdoc-openapi (Swagger UI @ `/swagger-ui.html`)                        |
| Auth        | JWT (Bearer token)                                                         |
| Dev Infra   | Docker Compose (frontend + backend + LiveKit; DB on Supabase)              |

---

## Project Structure

```
triviettutor/
├── Documentation/          # Business rules & architecture docs
├── frontend/               # React + Vite + TypeScript SPA
├── backend/                # Spring Boot 3 REST API
├── db/                     # Seed data for local database
├── docker-compose.yml      # Frontend + backend + LiveKit containers (DB is Supabase)
├── .env.example            # Environment template for Docker and the backend
└── README.md
```

The backend uses a layered package structure under `com.viettritutor`:
`controller` → `service` → `repository`, with JPA models in `entity`, shared business enums in `enums`,
feature-specific request/response classes in `dto/auth` and `dto/schedule`,
and shared `common`, `config`, and `security` packages.
See the [project structure guide](Documentation/02-System-Architecture/01-Project-Structure-React-SpringBoot.md#3-backend--spring-boot)
for package responsibilities and the implemented endpoints.

Run `mvn clean verify` from `backend` to execute the unit, repository, application
context, and HTTP API compatibility tests and build the application JAR.

---

## Quick Start

### Prerequisites

- **Docker Desktop** (runs frontend, backend and LiveKit)
- Access to the team's Supabase project (`fwoxupsupabpepgveqhr`) and its database password
- For running without Docker: **Java 21** and **Node.js 22.23.2** + npm 10.9.8

There is no local PostgreSQL. Every teammate connects to the same Supabase database,
so data created by one person is visible to everyone.

```
Docker Compose (your machine)            Internet (TLS)
  frontend :5173 ──► backend :8080 ──────────────────► Supabase PostgreSQL
                     backend ──► livekit :7880          MongoDB Atlas (meeting logs)
```

### 1. Clone the repository

```bash
git clone <repository-url>
cd triviettutor
```

### 2. Create `.env` from the template

```bash
cp .env.example .env
# or on Windows: ./scripts/init-docker-env.ps1   (also generates JWT_SECRET)
```

Fill in `.env` (it is git-ignored, never commit it):

| Variable      | Where to get it |
|---------------|-----------------|
| `DB_URL`      | Supabase Dashboard → **Connect** → **Session pooler**, port `5432`. Format: `jdbc:postgresql://<pooler-host>:5432/postgres?sslmode=require` |
| `DB_USERNAME` | `postgres.fwoxupsupabpepgveqhr` (session pooler user) |
| `DB_PASSWORD` | Database password, shared privately by the team lead |
| `JWT_SECRET`  | Any random string of 32+ bytes (`openssl rand -hex 32`); use the same value as the team if tokens must be shared |
| `MONGODB_URI` | MongoDB connection string (local host: `mongodb://localhost:27017/triviettutor`, Docker: `mongodb://mongodb:27017/triviettutor`) |

Use the **session pooler**, not the direct host `db.<ref>.supabase.co` (IPv6 only, usually
unreachable from Docker Desktop) and not the transaction pooler on port `6543` (breaks
prepared statements). Keep `DB_POOL_SIZE` small (default `5`) because everyone shares the
pooler's connection limit.

### 3. Start everything

```bash
docker compose up -d --build
```

- App: `http://localhost:5173`
- API: `http://localhost:8080/api/v1`
- Swagger UI: `http://localhost:8080/swagger-ui.html`
- LiveKit: `ws://localhost:7880`

Check the backend log with `docker compose logs -f backend`. After changing `.env`, run
`docker compose up -d --force-recreate backend frontend`.

### 4. Database schema (migrations)

The `supabase` profile does not run Flyway on startup, so one person applies shared
migrations deliberately instead of every container racing to change the schema:

```powershell
./scripts/migrate-database.ps1 -Action Info      # show applied/pending migrations
./scripts/migrate-database.ps1 -Action Migrate   # apply pending migrations
```

### Running without Docker

```powershell
./scripts/start-backend.ps1 -Profile supabase    # reads the same root .env
cd frontend; npm install; npm run dev
```

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

## VNPay Sandbox

Use the [team setup and acceptance guide](Documentation/02-System-Architecture/05-VNPay-Sandbox-Setup.md).
The merchant secret belongs only in an ignored backend `.env` file or the backend host's secret store.

```powershell
./scripts/configure-vnpay-sandbox.ps1 -EnvironmentFile .env
# Fill merchant credentials in .env, then set VNPAY_ENABLED=true.
./scripts/check-vnpay-sandbox.ps1 -EnvironmentFile .env
./scripts/start-backend.ps1 -Profile supabase
```

For Docker, use the same root `.env` and recreate the backend container after changes.
Checkout redirects to the real VNPay Sandbox page. Enrollment is confirmed by signed IPN callbacks;
the browser return alone cannot enroll a student. A public HTTPS backend registered with VNPay is
required for end-to-end settlement. Team members sharing one merchant must use the same IPN backend
and database, or obtain separate sandbox merchants for independent backends.

---

## Contributing

Each team member should work on a feature branch named `feature/<module>-<short-description>`.  
Example: `feature/enrollment-conflict-guard`

Open a Pull Request to `main` and request at least one review before merging.
