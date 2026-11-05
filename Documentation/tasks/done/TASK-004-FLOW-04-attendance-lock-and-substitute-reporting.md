---
id: TASK-004
title: 24-Hour Attendance Auto-Lock Job & Substitute Tutor Compensation Tagging
flow: FLOW-04-OPERATIONS-ATTENDANCE
step_in_flow: Step 4 of 4 (Operations & Attendance Integrity)
assigned_to: backend-dev
reviewer: tech-lead
status: DONE
created_at: 2026-10-25
updated_at: 2026-10-29
inputs:
  - Documentation/01-Business-Logic/04-Matching-and-Class-Management.md
  - Documentation/02-System-Architecture/02-Backend-Architecture-and-API-Specification.md
outputs:
  - backend/src/main/java/com/viettritutor/service/AttendanceLockJob.java
  - backend/src/main/java/com/viettritutor/service/AttendanceService.java
  - backend/src/test/java/com/viettritutor/service/AttendanceLockJobTest.java
dependencies:
  - backend/src/main/java/com/viettritutor/entity/Attendance.java
---

# Task: [TASK-004] 24-Hour Attendance Auto-Lock Job & Substitute Tutor Compensation Tagging

## 1. Flow Context
- **Target Flow**: `FLOW-04-OPERATIONS-ATTENDANCE` (Attendance & Class Operations)
- **Position in Flow**: Step 4 of 4.
- **Previous Step**: `TASK-003`
- **Next Step Triggered**: `TASK-005`

## 2. Acceptance Criteria (Product Owner)
- [x] Tutors submit attendance (`PRESENT`, `ABSENT`, `LATE`, `EXCUSED`) while session is `IN_SESSION` or within 24 hours of session end time.
- [x] Exactly 24 hours after session end time, `AttendanceLockJob` automatically transitions session status to `COMPLETED` and locks student attendance records.
- [x] If a substitute tutor was assigned via `POST /api/v1/admin/sessions/{sessionId}/substitute`, the `actualTutorId` field on `Session` is preserved for subsequent payroll attribution.
- [x] Locked attendance records cannot be modified by Tutors; only Admin may submit audited corrections via `PATCH /api/v1/admin/sessions/{sessionId}/attendance/{recordId}`.

## 3. Technical Constraints (Tech Lead)
- Idempotent execution of `AttendanceLockJob` scheduled runner.
- Enforce audit trails for administrative overrides.
- Use structured logging with sessionId and affected record counts.

## 4. Blocker & Escalation Section
- Status: CLEAR
- Question / Ambiguity Raised: None
- PO/BA Preliminary Decision & Proposal: In group classes, an individual student absence does not cancel the group session.

## 5. Work Execution Checklist (Assignee)
- [x] Audit `AttendanceLockJob` query criteria for elapsed sessions.
- [x] Add unit/mock tests verifying lock threshold and substitute tutor assignment preservation.
- [x] Verify test suite compiles cleanly via `mvn test-compile`.

### Completion Notes (2026-10-29, branch `fix/flows/attendance-payroll`)
- `AttendanceLockJob` only selects unprocessed sessions whose end + 24h has passed (`SessionRepository.findAttendanceLockCandidates`); sessions in a finalized payroll month are marked processed instead of failing every run.
- Auto-lock completes sessions with full attendance and teaching evidence; incomplete ones stay `IN_SESSION` and are flagged for admin review (payroll then blocks until resolved).
- Tutors can keep editing a `COMPLETED`, unlocked session until end + 24h (BR-04.33 / FR-OPS-03); finalized payroll is still protected by `PayrollGuard`.
- Admin corrections: `PATCH /admin/sessions/{id}/attendance/{recordId}` and `PUT /admin/sessions/{id}/attendance/students/{studentId}` (creates the missing record); `PATCH /admin/sessions/{id}/actual-tutor` corrects who taught a started session and resets teaching confirmation.
- Tests: `AttendanceLockJobTest`, `AttendanceEditWindowTest`, `ActualTutorServiceTest`, `AttendanceLockCandidatesTest`.

## 6. Review & Sign-Off (Reviewer)
- [ ] 24-hour cutoff logic verified.
- [ ] Security access boundaries enforced.
