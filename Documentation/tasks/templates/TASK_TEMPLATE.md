---
id: TASK-000
title: Short Actionable Title
flow: FLOW-01-MVP
step_in_flow: Step 1 of 4 (Descriptive Step Name)
assigned_to: backend-dev
reviewer: tech-lead
status: TODO
created_at: YYYY-MM-DD
updated_at: YYYY-MM-DD
inputs:
  - docs/01-logic/defines/02-swimlane.md
  - docs/05-api-specs/openapi-spec.yaml
outputs:
  - src/backend/controllers/auth_controller.py
dependencies:
  - docs/05-api-specs/openapi-spec.yaml
---

# Task: [TASK-000] Short Actionable Title

## 1. Flow Context
- **Target Flow**: [FLOW-01-MVP](file:///docs/07-planning/03-flows.md#3-mvp-flow-vertical-slice-specification-flow-01-mvp)
- **Position in Flow**: Step 1 of 4.
- **Previous Step**: None (Entry point).
- **Next Step Triggered**: [TASK-002](file:///docs/tasks/backlog/FLOW-01-MVP/TASK-002-backend-endpoints.md).

## 2. Acceptance Criteria (Product Owner)
- [ ] Criterion 1 (Given ... When ... Then ...)
- [ ] Criterion 2 (Explicit error handling and structured error log)
- [ ] Criterion 3 (Validation boundaries and negative test cases covered)

## 3. Technical Constraints (Tech Lead)
- Apply interface structure: declare interface contracts prior to implementation.
- Always catch and log errors using structured loggers; never swallow exceptions.
- Never write placeholder, mock, or hollow code. Produce fully functional logic.
- Retrieve all secrets and configuration values strictly from environment variables.

## 4. Blocker & Escalation Section
- Status: CLEAR (or BLOCKED_BY_DEPENDENCY, PENDING_CLIENT_DECISION)
- Question / Ambiguity Raised: [None]
- PO/BA Preliminary Decision & Proposal: [None]
- Client Decision Link: [None or reference to docs/tasks/CLIENT_QUESTIONS.md#DECISION-xxx]

## 5. Work Execution Checklist (Assignee)
- [ ] Verify input specifications and upstream dependencies.
- [ ] Move ticket to `docs/tasks/in-progress/` while actively working.
- [ ] Implement deliverables matching the target outputs list.
- [ ] Verify functionality against PO Acceptance Criteria.
- [ ] Move ticket to review and notify reviewer.

## 6. Review & Sign-Off (Reviewer)
- [ ] Architecture and interface compliance verified.
- [ ] No hardcoded secrets or unresolved blockers.
- [ ] Move ticket to `docs/tasks/done/` and update `docs/tasks/BOARD.md`.
