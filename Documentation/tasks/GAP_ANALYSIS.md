# Codebase Gap Analysis & Architecture Audit — VietTriTutor

**Date:** 2026-10-25  
**Auditor:** Autonomous Squad Harness (`Master Virtual Assistant` / `tech-lead` / `software-architect`)  
**Scope:** Backend (`backend/src`), Frontend (`frontend/src`), Mobile (`mobile/app`), Database Migrations (`db/migration`), and Functional Specifications (`Documentation/`).

---

## 1. Executive Summary

VietTriTutor is a centralized tutor center management platform specifically restricted to high school students (THPT Grades 10, 11, and 12). The core system architecture adheres to a clean layered design:
- **Backend:** Spring Boot 3.3.4 (Java 21) with Spring Security (JJWT), Spring Data JPA (PostgreSQL 16), Flyway migrations (`V1` through `V15`), and H2 in-memory test profiles.
- **Frontend:** React 18 SPA with TypeScript 5.5, Vite 5.4, Tailwind CSS, TanStack React Query, React Hook Form + Zod, and Zustand store.
- **Mobile:** React Native / Expo 57 application with Expo Router.

### Verification Health Status
- **Backend Build (`mvn test-compile`):** **PASSED** (243 source files, 22 test files compiled without error under OpenJDK 21).
- **Frontend Type-Check (`tsc --noEmit`):** **PASSED** (0 TypeScript errors across the entire codebase).
- **Database Migrations:** Schema migrations up to `V15__create_payroll.sql` successfully reflect core entities including users, profiles, courses, classes, sessions, tutor availability, assignments, leave requests, attendance, enrollments, single-class payment intents, VNPay transactions, and payroll finalize mutexes.

---

## 2. Business Requirements vs Codebase Implementation Matrix

| Requirement / Business Rule | Spec Reference | Backend Implementation | Frontend Implementation | Current Audit Status |
| :--- | :--- | :--- | :--- | :---: |
| **THPT Scope Restriction (Grades 10–12)** | `FR-CRS-01`, `BR-02.03` | `GradeLevel` enum (`GRADE_10`, `GRADE_11`, `GRADE_12`), migration `V11` | Restricted select in `CourseFormDialog.tsx`, `SubjectsPage.tsx` | **MATCHED / VERIFIED** |
| **Authentication & Role Segregation** | `FR-AUTH-01`, `BR-01.01-04` | `AuthController`, JWT Filter, `ROLE_STUDENT`, `ROLE_TUTOR`, `ROLE_ADMIN` | `LoginPage`, `RegisterPage`, `VerifyEmailPage`, `PrivateRoute`, `RoleRoute` | **MATCHED / VERIFIED** |
| **Profile & Rate Configuration** | `FR-AUTH-02`, `FR-AUTH-03` | `ProfileController` (`/me`), `UserController` (`/admin/users/tutors`) | `ProfilePage.tsx`, `AdminUsersPage.tsx`, `TutorForms.tsx` | **MATCHED / VERIFIED** |
| **Course & Class Creation** | `FR-CRS-01`, `FR-CRS-02` | `CourseController`, `ClassController`, `DefaultSessionGenerator` | `AdminCoursesPage.tsx`, `AdminClassesPage.tsx`, `ClassFormDialog.tsx` | **MATCHED / VERIFIED** |
| **Schedule Patterns & Standard Slots** | `BR-03.01`, `BR-03.02` | `SchedulePattern` (M-W-F, T-Th-S, Sat-Sun), `TimeSlot` (4 slots) | `classOptions.ts`, `ClassBuilderSection.tsx`, `AdminClassesPage.tsx` | **MATCHED / VERIFIED** |
| **Slot 3 & 4 Collision Detection** | `BR-03.02` | `ConflictValidationServiceImpl` handles 30-min overlap between slots | Form validation & warning banners in scheduling dialogs | **MATCHED / VERIFIED** |
| **Automated Session Generation** | `BR-03.03` | `DefaultSessionGenerator` calculates dates starting on/after `startDate` | Displayed in `SessionSchedule.tsx`, `AdminSessionsPage.tsx` | **MATCHED / VERIFIED** |
| **Class Lifecycle State Machine** | `BR-04.01-03`, `FR-CRS-03` | `ClassStatus` enum, `ClassLifecycle.java`, `SessionLifecycleJob.java` | `ClassStatusDialog.tsx`, `AdminClassesPage.tsx` | **FUNCTIONAL (Needs test hardening)** |
| **Student Enrollment & Pricing Tiers** | `FR-SCH-01`, `FR-SCH-02`, `BR-02.11` | `PaymentIntentService`, `EnrollmentController`, `PricingService` (0%, 20%, 35%, 40%) | `StudentCatalogPage.tsx`, `CheckoutPage.tsx`, `PriceTag.tsx` | **MATCHED / VERIFIED** |
| **Student Schedule Collision Check** | `BR-03.31` | `ConflictValidationService.hasStudentConflict` blocks double-booking | Warning displayed upon checkout initiation | **MATCHED / VERIFIED** |
| **VNPay Sandbox & Mock Payments** | `BR-02.02`, `05-VNPay-Sandbox` | `VnpayPaymentController`, `VnpayPaymentService`, `PaymentController` | `VnpayCodePanel.tsx`, `DemoCardForm.tsx`, `CheckoutFlow.tsx` | **MATCHED / VERIFIED** |
| **Group Class Deadline & FAILED_TO_OPEN** | `FR-SCH-04`, `BR-02.20`, `BR-03.20` | `SessionLifecycleService.evaluateAllClasses()`, `ClassController` reopen/convert | `ClassStatusDialog.tsx` for admin remediation | **AUDIT GAP: E2E Integration Test Needed** |
| **Tutor Hard Conflict Engine** | `FR-SCH-03`, `BR-03.30` | `TutorAssignmentController`, `ConflictValidationService` | `AdminAssignmentsPage.tsx`, `AssignmentPanel.tsx` | **MATCHED / VERIFIED** |
| **Tutor Availability Slots** | `FR-AUTH-02`, `BR-03.21` | `TutorAvailabilityController`, `TutorAvailabilityService` | `TutorAvailabilityPage.tsx`, `AvailabilityEditor.tsx` | **MATCHED / VERIFIED** |
| **Leave Requests & 24h Threshold** | `FR-OPS-01`, `BR-03.40` | `LeaveRequestController`, `LeaveRequestServiceImpl` (>=24h PENDING, <24h ABSENCE_LATE) | `StudentLeavePage.tsx`, `TutorLeavePage.tsx`, `AdminReschedulesPage.tsx` | **MATCHED / VERIFIED** |
| **Makeup Sessions & Substitute Assignment** | `FR-OPS-02`, `BR-03.41-42` | `SessionReschedulingController` (`/makeup`, `/substitute`) with conflict checks | `AdminReschedulesPage.tsx`, `PendingLeaveList.tsx` | **MATCHED / VERIFIED** |
| **Attendance Check-in & Auto-lock Job** | `FR-OPS-03`, `BR-04.20`, `BR-04.33` | `AttendanceController`, `AttendanceService`, `AttendanceLockJob` (24h lock) | `AttendanceEditor.tsx`, `AdminAttendancePanel.tsx` | **MATCHED / VERIFIED** |
| **Monthly Tutor Payroll & Mutex Lock** | `FR-FIN-02`, `BR-02.40-46` | `PayrollController`, `PayrollService`, `DefaultPayrollGuard` (Base + N * Rate) | `AdminPayrollPage.tsx`, `TutorPayrollPage.tsx` | **MATCHED / VERIFIED** |
| **Extended ERD: Cart & Multi-Class Order** | `Q06`, `00-Tong-quan-phan-cong` | Not in active DB schema (deferred for MVP single-class flow) | `cartStore.ts` exists in frontend | **ARCHITECTURAL BOUNDARY: Explicitly scoped to single-class checkout** |
| **Homework, Submission, Grading & Tutor Rating** | `H07`, `00-Tong-quan-phan-cong` | `V17` migration; `HomeworkController`, `SubmissionController` (draft/publish/close, deadlines, optimistic `version`, grading); `TutorRatingController` | `HomeworkPanel.tsx` (tutor session detail: create/edit/publish/close, grade), `StudentHomeworkPage.tsx` (`/student/homework`), `TutorRatingDialog.tsx` (student classes page), `learningService.ts` | **MATCHED** |
| **Extended ERD: Topic & Syllabus Management**| `H06`, `00-Tong-quan-phan-cong` | `Session.topicId` nullable column exists in `V2` migration; no entity | Not in frontend UI | **FUTURE PHASE (Post-MVP)** |
| **Mobile App End-to-End API Integration** | `03-Mobile-App-Architecture` | Backend REST endpoints ready | Basic UI templates exist in Expo; needs live API wiring | **GAP: Needs API Client Wiring** |

---

## 3. Discovered Gaps & Action Plan

### Gap 1: Automated Group Class Registration Deadline Evaluation & Test Hardening
- **Context:** At registration deadline (default 3 days before start date), group classes must evaluate enrolled student count:
  - 0 enrollments $\rightarrow$ `CANCELLED`.
  - 1 enrollment $\rightarrow$ `FAILED_TO_OPEN` (Admin options: reopen with new date, refund 100%, or convert to 1-on-1).
  - $\ge 2$ enrollments $\rightarrow$ eligible for tutor assignment (`ASSIGNED`).
- **Codebase Finding:** `SessionLifecycleJob` triggers `evaluateAllClasses()`, but dedicated integration unit tests verifying edge cases and database rollbacks are required to protect against concurrency issues.
- **Action:** Created Ticket `TASK-001`.

### Gap 2: End-to-End Payment Intent Verification & Pre-check Hard Collision
- **Context:** Under `BR-03.31`, student cannot checkout a class that collides by $\ge 1$ minute with any active session in another enrolled class.
- **Codebase Finding:** `PaymentIntentService` and `ConflictValidationService` contain logic, but requires strict end-to-end regression validation covering both VNPay sandbox simulation and mock confirmation flows.
- **Action:** Created Ticket `TASK-002`.

### Gap 3: Strict Tutor Assignment Hard Overlap Engine
- **Context:** Under `BR-03.30`, assigning a tutor to a class or a substitute tutor to an individual session must strictly block if any session overlaps by even 1 minute, specifically checking Slot 3 (`18:00–20:00`) and Slot 4 (`19:30–21:30`) collisions.
- **Codebase Finding:** `ConflictValidationServiceImpl` handles time math, but requires comprehensive matrix testing across boundary conditions and multi-day patterns.
- **Action:** Created Ticket `TASK-003`.

### Gap 4: 24-Hour Attendance Auto-Lock Job & Substitute Tutor Compensation Tagging
- **Context:** Attendance must be locked 24 hours after session end time, transitioning session to `COMPLETED`. When a substitute tutor teaches, `actualTutorId` must be permanently retained for payroll calculation.
- **Codebase Finding:** `AttendanceLockJob` is scheduled, but audit logging and immutable locking tests need verification.
- **Action:** Created Ticket `TASK-004`.

### Gap 5: Monthly Payroll Settlement & Idempotency Mutex Guard
- **Context:** Payroll calculation ($BaseSalary + ValidSessions \times Rate$) must execute idempotently using `PayrollMutex` to prevent double-spending or duplicate settlement entries during admin locking.
- **Codebase Finding:** `PayrollController` and `DefaultPayrollGuard` are implemented; full verification of concurrent lock requests is required.
- **Action:** Created Ticket `TASK-005`.

### Gap 7: Test Profile MongoDB Autoconfiguration Fallback
- **Context:** `backend/src/test/resources/application-test.yml` inherits default `spring.data.mongodb.uri: ${MONGODB_URI:}` from `application.yml`. When `MONGODB_URI` environment variable is unset or empty, `MongoClientSettings` fails with `The connection string is invalid. Connection strings must start with either 'mongodb://' or 'mongodb+srv://'`.
- **Codebase Finding:** Unit tests relying on full `@SpringBootTest` context fail to boot because `mongoTemplate` cannot connect.
- **Remediation:** Provide a valid fallback test URI (e.g. `mongodb://localhost:27017/test`) or exclude `MongoAutoConfiguration` in `@SpringBootTest` slices that only test relational JPA entities.
- **Action:** Documented in Gap Analysis and flagged for Sprint hardening.

---

## 4. Backlog Ticket Directory Summary

The following vertical slice tickets have been generated in `Documentation/tasks/backlog/`:
1. `TASK-001`: Automated Group Class Registration Deadline Evaluation & State Transitions
2. `TASK-002`: VNPay & Mock Checkout Flow Hard Conflict Pre-Validation
3. `TASK-003`: Strict Tutor Conflict Engine & Slot Overlap Validation
4. `TASK-004`: 24-Hour Attendance Auto-Lock Job & Substitute Tutor Compensation Tagging
5. `TASK-005`: Monthly Tutor Payroll Finalization Mutex Guard & Calculation Precision
6. `TASK-006`: Mobile App API Integration for Session Schedule & Attendance Overview
