# Role Handover Protocol

This document defines the handover contract between subagents during the lifecycle of a feature.

## 1. Handover Chains

```text
[Product Owner]
       | (Requirements & Acceptance Criteria)
       v
[Project Manager]
       | (Task Tickets & Dependency Graph)
       v
[Software Architect]
       | (System Context & Domain Parent Interfaces)
       v
[Tech Lead]
       | (OpenAPI Spec & Data Schemas)
      / \
     /   \
    v     v
[Backend] [Frontend]
    \     /
     \   /
      v v
  [QA Engineer]
       | (Verification Report)
       v
[Project Manager] -> [Done]
```

## 2. Handover Checklists by Stage

### Stage 1: PO to PM
- [ ] Product vision and business rules defined in `docs/00-product/`.
- [ ] Use cases and swimlanes defined in `docs/01-logic/`.
- [ ] Every use case has Given-When-Then acceptance criteria.

### Stage 2: PM to Architect & Tech Lead
- [ ] Epics mapped to bounded contexts in `docs/07-planning/03-epics-modules.md`.
- [ ] Technical prerequisite tasks created in `docs/tasks/backlog/`.

### Stage 3: Architect to Tech Lead
- [ ] C4 System Context updated in `docs/03-technical/01-system-context.md`.
- [ ] Domain parent interface defined in `docs/04-domains/<domain>/interface_<domain>.md`.
- [ ] Architectural decisions recorded in `docs/03-technical/adrs/`.

### Stage 4: Tech Lead to Backend & Frontend
- [ ] OpenAPI schema updated in `docs/05-api-specs/openapi-spec.yaml`.
- [ ] Database schema or entity interfaces defined.
- [ ] Error codes and status codes cataloged in `docs/05-api-specs/api-guidelines.md`.

### Stage 5: Developers to QA Engineer
- [ ] Backend endpoints active and error logging configured.
- [ ] Frontend routes and all UI states (Loading, Error, Empty, Populated) implemented.
- [ ] Task ticket moved to review stage.

### Stage 6: QA Engineer to PM
- [ ] Acceptance criteria checklist verified in `docs/08-testing/`.
- [ ] Any defects logged as separate bug tickets in `docs/tasks/backlog/`.
- [ ] Ticket signed off and moved to `docs/tasks/done/`.
