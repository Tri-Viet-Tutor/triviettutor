---
id: TASK-003
title: Strict Tutor Conflict Engine & Slot Overlap Validation
flow: FLOW-03-TUTOR-ASSIGNMENT
step_in_flow: Step 3 of 4 (Tutor Matching & Conflict Engine)
assigned_to: backend-dev
reviewer: tech-lead
status: DONE
created_at: 2026-10-25
updated_at: 2026-10-29
inputs:
  - Documentation/01-Business-Logic/03-Scheduling-and-Conflict-Validation.md
  - Documentation/02-System-Architecture/02-Backend-Architecture-and-API-Specification.md
outputs:
  - backend/src/main/java/com/viettritutor/service/ConflictValidationService.java
  - backend/src/main/java/com/viettritutor/service/impl/ConflictValidationServiceImpl.java
  - backend/src/test/java/com/viettritutor/service/ConflictValidationServiceTest.java
dependencies:
  - backend/src/main/java/com/viettritutor/entity/TutorAssignment.java
---

# Task: [TASK-003] Strict Tutor Conflict Engine & Slot Overlap Validation

## 1. Flow Context
- **Target Flow**: `FLOW-03-TUTOR-ASSIGNMENT` (Tutor Assignment & Conflict Prevention)
- **Position in Flow**: Step 3 of 4.
- **Previous Step**: `TASK-002`
- **Next Step Triggered**: `TASK-004`

## 2. Acceptance Criteria (Product Owner)
- [x] Assigning a tutor via `POST /api/v1/admin/classes/{classId}/assign` must check all generated sessions of the class against the tutor's existing assignments.
- [x] If any session collides by $\ge 1$ minute with any active teaching commitment of the tutor, assignment is strictly blocked and returns `409 Conflict` with collision details.
- [x] Slot 3 (`18:00–20:00`) and Slot 4 (`19:30–21:30`) have a 30-minute collision; the conflict engine must block cross-assignment of these slots on identical calendar days (`BR-03.02`).
- [x] Reassigning a class via `PUT /api/v1/admin/classes/{classId}/reassign` updates only future `SCHEDULED` sessions and preserves past completed session records.

## 3. Technical Constraints (Tech Lead)
- Use standard overlap formula: `startA < endB && startB < endA`.
- Ignore sessions in status `CANCELLED`.
- Acquire pessimistic lock on tutor assignment during transaction to prevent concurrent race condition assignments.

## 4. Blocker & Escalation Section
- Status: CLEAR
- Question / Ambiguity Raised: None
- PO/BA Preliminary Decision & Proposal: Tutor Availability slots are treated as preference hints; the definitive source of conflict blocking is actual Session & Assignment records.

## 5. Work Execution Checklist (Assignee)
- [x] Verify `ConflictValidationServiceImpl` against boundary times (e.g. 10:00 end and 10:00 start is contiguous and NOT a conflict).
- [x] Add unit test suite in `ConflictValidationServiceTest` covering 30-min slot overlap and contiguous boundary conditions.
- [x] Ensure `mvn test-compile` passes cleanly.

## 6. Review & Sign-Off (Reviewer)
- [x] Overlap algorithm boundary math verified.
- [x] Edge cases covered in test suite.

## 7. Completion Notes (2026-10-29)
- Verified in code: `ConflictValidationServiceImpl` uses `startA < endB && startB < endA`, ignores `CANCELLED` sessions on both sides; assignment/reassignment lock the class, tutor and session rows (`findForUpdate` / `findClassSessionsForUpdate`); `TutorAssignmentServiceImpl.reassign` only moves future `SCHEDULED`/`PENDING_RESCHEDULE` sessions.
- Covered by `ConflictValidationServiceTest` (slot 3/4 overlap, contiguous boundary, 1-minute overlap, cancelled ignored) and `TutorAssignmentServiceTest`.
- Follow-up (branch `fix/flows/rescheduling-makeup-meeting`): reassign now resolves the replaced tutor's pending leave on moved sessions (approved as `SUBSTITUTE`, session back to `SCHEDULED`, audited); makeups possible for cancelled sessions without a leave request and after a cancelled makeup; meeting tokens restricted to the session's join window and actual tutor; covered by `SessionReschedulingServiceTest`.
