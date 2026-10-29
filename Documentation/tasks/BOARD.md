# Project Task Board

This board represents the central state of all work orders organized by **Flows (Vertical Slices)**. The autonomous software development squad operates on this board, delivering end-to-end functionality to the **Client** (Stakeholder).

---

## 1. Flow Pipeline Overview

| Flow Identifier | Flow Name | Total Tasks | Completed | Active Step | Status |
| :--- | :--- | :---: | :---: | :--- | :---: |
| **`FLOW-AUDIT`** | Codebase Gap Analysis & Backlog Mapping | 1 | 1 / 1 | Completed | **DONE** |
| **`FLOW-01-COURSE-CLASS`** | Class Lifecycle & Automated Deadline Evaluation | 1 | 0 / 1 | Step 1 (`TASK-001`) | **READY** |
| **`FLOW-02-ENROLLMENT-PAYMENT`**| Student Checkout & Conflict Pre-Validation | 1 | 0 / 1 | Step 2 (`TASK-002`) | **READY** |
| **`FLOW-03-TUTOR-ASSIGNMENT`** | Tutor Assignment & Hard Overlap Engine | 1 | 0 / 1 | Step 3 (`TASK-003`) | **READY** |
| **`FLOW-04-OPERATIONS-ATTENDANCE`**| 24h Attendance Auto-Lock & Substitute Tracking | 1 | 1 / 1 | Completed | **DONE** |
| **`FLOW-05-PAYROLL`** | Monthly Payroll Settlement & Mutex Locking | 1 | 1 / 1 | Completed | **DONE** |
| **`FLOW-EXT-MOBILE`** | Mobile Client Session Schedule Integration | 1 | 0 / 1 | Step 1 (`TASK-006`) | **READY** |

---

## 2. Active Flow: `FLOW-01-COURSE-CLASS` Board

### Backlog (Pending Execution)
- [`TASK-001`](backlog/TASK-001-FLOW-01-automated-class-deadline-scheduler.md): Automated Group Class Registration Deadline Evaluation & State Transitions (`backend-dev`)
- [`TASK-002`](backlog/TASK-002-FLOW-02-vnpay-sandbox-checkout-e2e-verification.md): VNPay & Mock Checkout Flow Hard Conflict Pre-Validation (`backend-dev`)
- [`TASK-003`](backlog/TASK-003-FLOW-03-tutor-assignment-overlap-validation.md): Strict Tutor Conflict Engine & Slot Overlap Validation (`backend-dev`)
- [`TASK-006`](backlog/TASK-006-FLOW-EXT-mobile-api-client-and-session-view.md): Mobile App API Integration for Session Schedule & Attendance Overview (`frontend-dev`)

### In Progress (Active Subagents)
- None

### In Review (Awaiting Review & Sign-Off)
- None

### Done (Signed-Off Deliverables)
- [`FLOW-AUDIT`](GAP_ANALYSIS.md): Comprehensive Codebase Audit across backend, frontend, mobile, and database migrations.
- [`TASK-004`](done/TASK-004-FLOW-04-attendance-lock-and-substitute-reporting.md): 24-Hour Attendance Auto-Lock Job & Substitute Tutor Compensation Tagging (`backend-dev`)
- [`TASK-005`](done/TASK-005-FLOW-05-payroll-mutex-and-monthly-settlement.md): Monthly Tutor Payroll Finalization Mutex Guard & Calculation Precision (`backend-dev`)

---

## 3. Pending Client Decisions

Items requiring high-level business direction or approval from the **Client** are consolidated by the PO/BA into [CLIENT_QUESTIONS.md](CLIENT_QUESTIONS.md).

| Decision ID | Target Flow | Topic | PO/BA Recommendation | Client Status |
| :--- | :--- | :--- | :--- | :--- |
| - | - | All requirements clear from Documentation specs | - | **CLEAR** |

---

## 4. Autonomous Squad Responsibility Directory

- **Client (User)**: Primary stakeholder. Communicates feedback directly to BA; reviews high-level proposals when desired.
- **Business Analyst (`business-analyst`)**: Directly interfaces with Client, logs meeting minutes in [CLIENT_BA_ALIGNMENT.md](CLIENT_BA_ALIGNMENT.md), updates use cases, and briefs PM on task adjustments.
- **Product Owner (`product-owner`)**: Holds full decision-making authority in the squad to prevent delays; enforces invariants and business rules.
- **Project Manager (`project-manager`)**: Flow orchestration, task assignment, status updates across ticket folders and this board.
- **Tech Lead (`tech-lead`)**: Directs implementation in code files (`src/`), audits codebase to prevent duplicates, reviews code quality. No code definition in markdown.
- **Backend Developer (`backend-dev`)**: Production implementation directly in backend source files.
- **Frontend Developer (`frontend-dev`)**: Production implementation directly in frontend source files.
- **QA Engineer (`qa-engineer`)**: Verifies working code against acceptance criteria.
