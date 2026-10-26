---
id: TASK-002
title: VNPay & Mock Checkout Flow Hard Conflict Pre-Validation
flow: FLOW-02-ENROLLMENT-PAYMENT
step_in_flow: Step 2 of 4 (Enrollment & Checkout Integrity)
assigned_to: backend-dev
reviewer: tech-lead
status: TODO
created_at: 2026-10-25
updated_at: 2026-10-25
inputs:
  - Documentation/01-Business-Logic/02-Pricing-and-Subscription-Rules.md
  - Documentation/01-Business-Logic/03-Scheduling-and-Conflict-Validation.md
  - Documentation/02-System-Architecture/05-VNPay-Sandbox-Setup.md
outputs:
  - backend/src/main/java/com/viettritutor/service/PaymentIntentService.java
  - backend/src/test/java/com/viettritutor/service/VnpayPaymentIntegrationTest.java
dependencies:
  - backend/src/main/java/com/viettritutor/service/ConflictValidationService.java
---

# Task: [TASK-002] VNPay & Mock Checkout Flow Hard Conflict Pre-Validation

## 1. Flow Context
- **Target Flow**: `FLOW-02-ENROLLMENT-PAYMENT` (Student Enrollment & Payment Verification)
- **Position in Flow**: Step 2 of 4.
- **Previous Step**: `TASK-001`
- **Next Step Triggered**: `TASK-003`

## 2. Acceptance Criteria (Product Owner)
- [ ] Student cannot initiate payment intent if their existing active sessions overlap by $\ge 1$ minute with the target class schedule (`BR-03.31`).
- [ ] Pricing calculation adheres strictly to the progressive enrollment discount matrix:
  - 1 student (`ONE_ON_ONE`): 0% discount ($100\% \times P_{\text{1on1}}$).
  - 2–3 students: 20% discount ($80\% \times P_{\text{1on1}}$).
  - 4–5 students: 35% discount ($65\% \times P_{\text{1on1}}$).
  - 6–8 students: 40% discount ($60\% \times P_{\text{1on1}}$).
- [ ] Successful VNPay IPN or Mock confirmation atomically creates an `Enrollment` with status `ACTIVE` and increments class `currentStudents`.
- [ ] If class reaches capacity (1 for `ONE_ON_ONE`, 8 for `GROUP`), subsequent checkout attempts are rejected with `CLASS_FULL`.

## 3. Technical Constraints (Tech Lead)
- Idempotency key verification on payment webhooks to prevent duplicate enrollment creation on retried IPN calls.
- Strict HMAC-SHA512 checksum validation for VNPay sandbox callbacks.
- Retrieve VNPay hash secrets only from environment variables (`VNPAY_HASH_SECRET`).

## 4. Blocker & Escalation Section
- Status: CLEAR
- Question / Ambiguity Raised: None
- PO/BA Preliminary Decision & Proposal: Multi-class cart checkout is deferred to post-MVP; single-class payment intent is the canonical payment flow.

## 5. Work Execution Checklist (Assignee)
- [ ] Audit `PaymentIntentService` conflict pre-validation logic.
- [ ] Execute `VnpayPaymentIntegrationTest` to ensure HMAC validation and transaction state transitions.
- [ ] Verify frontend checkout handling for error responses in `CheckoutFlow.tsx`.
- [ ] Verify test suite passes with `mvn test-compile`.

## 6. Review & Sign-Off (Reviewer)
- [ ] Idempotency on callback validated.
- [ ] No secrets logged or hardcoded.
- [ ] Ready for production merge.
