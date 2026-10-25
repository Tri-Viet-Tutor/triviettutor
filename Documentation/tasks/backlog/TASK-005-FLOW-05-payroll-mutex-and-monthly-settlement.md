---
id: TASK-005
title: Monthly Tutor Payroll Finalization Mutex Guard & Calculation Precision
flow: FLOW-05-PAYROLL
step_in_flow: Step 1 of 2 (Payroll Settlement & Audit)
assigned_to: backend-dev
reviewer: tech-lead
status: TODO
created_at: 2026-10-25
updated_at: 2026-10-25
inputs:
  - Documentation/01-Business-Logic/02-Pricing-and-Subscription-Rules.md
  - Documentation/02-System-Architecture/02-Backend-Architecture-and-API-Specification.md
outputs:
  - backend/src/main/java/com/viettritutor/service/PayrollService.java
  - backend/src/main/java/com/viettritutor/controller/PayrollController.java
  - backend/src/test/java/com/viettritutor/service/PayrollMutexTest.java
dependencies:
  - backend/src/main/java/com/viettritutor/entity/PayrollMutex.java
---

# Task: [TASK-005] Monthly Tutor Payroll Finalization Mutex Guard & Calculation Precision

## 1. Flow Context
- **Target Flow**: `FLOW-05-PAYROLL` (Tutor Monthly Payroll Settlement)
- **Position in Flow**: Step 1 of 2.
- **Previous Step**: `TASK-004`
- **Next Step Triggered**: None (Final flow milestone).

## 2. Acceptance Criteria (Product Owner)
- [ ] Monthly payroll calculation strictly enforces formula `BR-02.40`:
  $$\text{Total Salary} = \text{Base Salary} + (\text{Valid Completed Sessions} \times \text{Session Rate})$$
- [ ] Valid completed sessions include only sessions in status `COMPLETED` where the tutor was the actual assigned instructor (`actualTutorId == tutorId`), properly crediting substitute teaching and excluding cancelled sessions.
- [ ] Finalizing payroll via `POST /api/v1/admin/payroll/{year}/{month}/finalize` acquires database-level `PayrollMutex` lock to prevent race conditions or double-calculation during simultaneous admin clicks.
- [ ] Once finalized (`PAYROLL_LOCKED`), subsequent preview requests return the finalized frozen snapshot.

## 3. Technical Constraints (Tech Lead)
- Use optimistic/pessimistic lock on `PayrollMutex` table.
- Non-admin tutors accessing `GET /api/v1/tutor/payroll` can only view their own itemized compensation.
- Maintain Java 21 compile compatibility.

## 4. Blocker & Escalation Section
- Status: CLEAR
- Question / Ambiguity Raised: None
- PO/BA Preliminary Decision & Proposal: Payroll runs per calendar month; partial months are prorated strictly by actual completed session count.

## 5. Work Execution Checklist (Assignee)
- [ ] Review `PayrollService` calculation and mutex acquisition.
- [ ] Implement concurrency test for parallel finalization calls.
- [ ] Verify test suite passing via `mvn test-compile`.

## 6. Review & Sign-Off (Reviewer)
- [ ] Mathematical precision and mutex safety verified.
- [ ] Ready for production merge.
