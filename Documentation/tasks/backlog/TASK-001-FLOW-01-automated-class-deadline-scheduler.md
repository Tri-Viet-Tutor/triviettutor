---
id: TASK-001
title: Automated Group Class Registration Deadline Evaluation & State Transitions
flow: FLOW-01-COURSE-CLASS
step_in_flow: Step 1 of 4 (Class Lifecycle Hardening)
assigned_to: backend-dev
reviewer: tech-lead
status: TODO
created_at: 2026-10-25
updated_at: 2026-10-25
inputs:
  - Documentation/00-Product-Definition/01-Functional-Requirements.md
  - Documentation/01-Business-Logic/04-Matching-and-Class-Management.md
  - Documentation/02-System-Architecture/02-Backend-Architecture-and-API-Specification.md
outputs:
  - backend/src/main/java/com/viettritutor/service/SessionLifecycleService.java
  - backend/src/test/java/com/viettritutor/service/SessionLifecycleServiceTest.java
dependencies:
  - backend/src/main/java/com/viettritutor/entity/ClassGroup.java
---

# Task: [TASK-001] Automated Group Class Registration Deadline Evaluation & State Transitions

## 1. Flow Context
- **Target Flow**: `FLOW-01-COURSE-CLASS` (Course & Class Lifecycle Management)
- **Position in Flow**: Step 1 of 4.
- **Previous Step**: None (Entry point for lifecycle hardening).
- **Next Step Triggered**: `TASK-002` (Enrollment & Checkout).

## 2. Acceptance Criteria (Product Owner)
- [ ] Given a `GROUP` class in `ENROLLING` status where current UTC/local time has crossed `registrationDeadline`:
  - If `currentEnrollments == 0`, class status automatically transitions to `CANCELLED`.
  - If `currentEnrollments == 1`, class status automatically transitions to `FAILED_TO_OPEN` and emits audit warning for Admin remediation.
  - If `currentEnrollments >= 2`, class status remains eligible and ready for Admin tutor assignment (`ASSIGNED`).
- [ ] For `FAILED_TO_OPEN` classes, Admin endpoints `/api/v1/admin/classes/{classId}/reopen` and `/api/v1/admin/classes/{classId}/convert-to-one-on-one` must function deterministically without corrupted session schedules.
- [ ] Background job `SessionLifecycleJob` execution is strictly idempotent; re-running it multiple times must not alter previously finalized classes.

## 3. Technical Constraints (Tech Lead)
- Follow existing Spring Boot layered architecture in `com.viettritutor.service`.
- Handle transaction boundaries with `@Transactional`.
- Do not hardcode database dates; inject and utilize `Clock` or service-level time providers.
- Maintain test-compile and test pass integrity under Java 21 (`mvn test-compile`).

## 4. Blocker & Escalation Section
- Status: CLEAR
- Question / Ambiguity Raised: None
- PO/BA Preliminary Decision & Proposal: Group threshold invariants strictly follow BR-02.10 (min 2, max 8).

## 5. Work Execution Checklist (Assignee)
- [ ] Verify existing methods in `SessionLifecycleService` and `ClassLifecycle`.
- [ ] Move ticket to `Documentation/tasks/in-progress/` when active.
- [ ] Write integration test cases in `SessionLifecycleServiceTest.java` verifying 0, 1, and >=2 enrollment deadline triggers.
- [ ] Verify test execution via `mvn test-compile` and relevant unit tests.
- [ ] Move ticket to `Documentation/tasks/done/` and update `Documentation/tasks/BOARD.md`.

## 6. Review & Sign-Off (Reviewer)
- [ ] Architecture and interface compliance verified.
- [ ] All tests passing cleanly.
- [ ] Ready for production merge.
