# Project Task Board

This board represents the central state of all work orders organized by **Flows (Vertical Slices)**. The autonomous software development squad operates on this board, delivering end-to-end functionality to the **Client** (Stakeholder).

---

## 1. Flow Pipeline Overview

| Flow Identifier | Flow Name | Total Tasks | Completed | Active Step | Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **`FLOW-01-MVP`** | MVP Authentication & Core Slice | 4 | 0 / 4 | Step 1 (Contracts) | IN_PROGRESS |
| **`FLOW-02-PROFILE`** | User Profile & Session Flow | 0 | 0 / 0 | Scheduled | BACKLOG |

---

## 2. Active Flow: `FLOW-01-MVP` Board

### Backlog (Pending Execution)
- [TASK-001](backlog/FLOW-01-MVP/TASK-001-api-contracts.md): Define OpenAPI Schemas & Domain Parent Interface (`assigned_to: tech-lead`)
- [TASK-002](backlog/FLOW-01-MVP/TASK-002-backend-endpoints.md): Implement Authentication Service & Endpoints (`assigned_to: backend-dev`)
- [TASK-003](backlog/FLOW-01-MVP/TASK-003-frontend-view.md): Build Login View, State & API Client Hook (`assigned_to: frontend-dev`)
- [TASK-004](backlog/FLOW-01-MVP/TASK-004-qa-verification.md): Validate End-to-End Flow against Acceptance Criteria (`assigned_to: qa-engineer`)

### In Progress (Active Subagents)
- None

### In Review (Awaiting Review & Sign-Off)
- None

### Done (Signed-Off Deliverables)
- None

---

## 3. Pending Client Decisions

Items requiring high-level business direction or approval from the **Client** are consolidated by the PO/BA into [CLIENT_QUESTIONS.md](CLIENT_QUESTIONS.md).

| Decision ID | Target Flow | Topic | PO/BA Recommendation | Client Status |
| :--- | :--- | :--- | :--- | :--- |
| - | - | No active blockers pending client | - | CLEAR |

---

## 4. Autonomous Squad Responsibility Directory

- **Client (User)**: Primary stakeholder. Communicates feedback directly to BA; reviews high-level proposals when desired.
- **Business Analyst (`business-analyst`)**: Directly interfaces with Client, logs meeting minutes in [CLIENT_BA_ALIGNMENT.md](CLIENT_BA_ALIGNMENT.md), updates use cases, and briefs PM on task adjustments.
- **Product Owner (`product-owner`)**: Holds full decision-making authority in the squad to prevent delays; enforces invariants and business rules.
- **Project Manager (`project-manager`)**: Flow orchestration, task assignment, status updates across ticket folders and this board.
- **Software Architect (`software-architect`)**: System architecture, C4 diagrams, bounded contexts, parent interfaces, ADRs.
- **Tech Lead (`tech-lead`)**: OpenAPI specifications, schema validation, code review checklists.
- **Backend Developer (`backend-dev`)**: Endpoints, data persistence, business logic execution, structured logging.
- **Frontend Developer (`frontend-dev`)**: User interfaces, state machines, API integration.
- **QA Engineer (`qa-engineer`)**: Test matrices, edge cases, end-to-end verification and sign-off.
