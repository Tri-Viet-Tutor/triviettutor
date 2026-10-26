---
id: TASK-006
title: Mobile App API Integration for Session Schedule & Attendance Overview
flow: FLOW-EXT-MOBILE
step_in_flow: Step 1 of 2 (Mobile Client Connectivity)
assigned_to: frontend-dev
reviewer: tech-lead
status: TODO
created_at: 2026-10-25
updated_at: 2026-10-25
inputs:
  - Documentation/02-System-Architecture/03-Mobile-App-Architecture-and-Screens.md
  - Documentation/02-System-Architecture/02-Backend-Architecture-and-API-Specification.md
outputs:
  - mobile/services/api.ts
  - mobile/app/(tabs)/schedule.tsx
dependencies:
  - mobile/services/authContext.tsx
---

# Task: [TASK-006] Mobile App API Integration for Session Schedule & Attendance Overview

## 1. Flow Context
- **Target Flow**: `FLOW-EXT-MOBILE` (Mobile Client Integration)
- **Position in Flow**: Step 1 of 2.
- **Previous Step**: `TASK-005`
- **Next Step Triggered**: None.

## 2. Acceptance Criteria (Product Owner)
- [ ] Connect mobile application to backend `/api/v1/me/sessions` using stored Bearer token from `expo-secure-store`.
- [ ] Mobile schedule screen renders upcoming, today's, and past completed sessions with status badges.
- [ ] For online sessions, render clickable meeting link to open Zoom/Meet in external browser.
- [ ] Gracefully handle expired JWT by prompting re-login or clearing cached credentials.

## 3. Technical Constraints (Tech Lead)
- Use Expo Router safe navigation.
- Strictly consume existing backend REST endpoints without altering DTO schema.
- Follow TypeScript typing guidelines.

## 4. Blocker & Escalation Section
- Status: CLEAR
- Question / Ambiguity Raised: None
- PO/BA Preliminary Decision & Proposal: Attendance marking on mobile remains tutor-only; students have read-only view.

## 5. Work Execution Checklist (Assignee)
- [ ] Wire up axios/fetch client in `mobile/services/api.ts`.
- [ ] Bind live data into `mobile/app/(tabs)/schedule.tsx`.
- [ ] Verify TypeScript types in mobile workspace.

## 6. Review & Sign-Off (Reviewer)
- [ ] No hardcoded backend URLs (use environment config).
- [ ] Responsive UI verified.
