# Client Questions & Decision Registry

This document serves as the communication bridge between the autonomous software development squad and the **Client** (Human Stakeholder). 

Whenever business decisions or requirement trade-offs require Client confirmation, the **Product Owner / Business Analyst (PO/BA)** logs the item here with preliminary analysis and a recommended option. The Client reviews this document and inputs answers or approves recommendations.

---

## 1. Pending Decisions (Awaiting Client Response)

### [DECISION-001] Refresh Token Transport Mechanism (Web vs Mobile)
- **Date Raised**: 2026-10-24
- **Target Flow / Task**: FLOW-01-MVP / TASK-001
- **Context & Impact**: 
  The OpenAPI contract and Authentication service introduce `/api/v1/auth/refresh` to enable seamless token renewal without forcing users to re-enter credentials. We must align on the refresh token transport mechanism across the web frontend (React SPA) and mobile frontend (React Native Expo).
- **BA Proposals & Options**:
  - [x] **Option A (Recommended - Hybrid Strategy)**: The backend supports `refreshToken` received either in the JSON payload or via an HttpOnly, Secure, SameSite=Lax cookie (`refreshToken`). The web SPA utilizes the secure cookie mechanism (immune to browser XSS attacks), while the mobile app stores the token in `Expo.SecureStore` and submits it in the request body.
  - [ ] **Option B (Pure JSON Body)**: Pure request body for both web and mobile (`{ "refreshToken": "..." }`). Simpler implementation, but places refresh tokens in `localStorage` on the web, creating XSS exfiltration vulnerability.
  - [ ] **Option C (Pure HttpOnly Cookie)**: Strict cookie-only transport for both web and mobile. Requires custom cookie jar configuration on React Native.
- **Client Decision**: [Client types answer or signs off on Option A here]
- **Status**: PENDING_CLIENT_RESPONSE

### [DECISION-002] Refresh Token Rotation (RTR) & Persistence Strategy
- **Date Raised**: 2026-10-24
- **Target Flow / Task**: FLOW-01-MVP / TASK-001
- **Context & Impact**:
  Currently, the backend generates stateless JWT access tokens and does not persist tokens in PostgreSQL. To support secure token refresh, session revocation, and multi-device logout, we must decide on the persistence model.
- **BA Proposals & Options**:
  - [x] **Option A (Recommended - Stateful RTR with PostgreSQL)**: Implement a `refresh_tokens` table via Flyway (`id`, `user_id`, `token_hash`, `expires_at`, `revoked`, `family_id`). Each token refresh rotates the token. If an already revoked token is used, all tokens in the family are immediately revoked (theft detection).
  - [ ] **Option B (Stateless Refresh JWT)**: Long-lived self-contained JWT (7 days). Cannot be revoked prior to natural expiration without adding a Redis/in-memory blocklist.
- **Client Decision**: [Client types answer or signs off on Option A here]
- **Status**: PENDING_CLIENT_RESPONSE

### [DECISION-003] Standardized Error Envelope Field Alignment (`code` vs `errorCode`)
- **Date Raised**: 2026-10-24
- **Target Flow / Task**: FLOW-01-MVP / TASK-001
- **Context & Impact**:
  The existing backend [`ApiResponse.java`](file:///C:/Edisk/dow/Tai_lieu/ky7/sba/triviettutor/backend/src/main/java/com/viettritutor/common/api/ApiResponse.java) returns `errorCode` and lacks a `timestamp` property. The enterprise OpenAPI specification standardizes on `code`, `message`, `timestamp`, and `details`.
- **BA Proposals & Options**:
  - [x] **Option A (Recommended - Dual Compatibility)**: Update `ApiResponse<T>` to expose both `code` and `errorCode` (via Jackson alias/getter) and add an ISO-8601 `timestamp` field. Preserves backward compatibility with existing frontend code while fully satisfying OpenAPI standards.
  - [ ] **Option B (Preserve `errorCode` Only)**: Keep existing `errorCode` without adding `code` or `timestamp`. Deviates slightly from enterprise OpenAPI template.
- **Client Decision**: [Client types answer or signs off on Option A here]
- **Status**: PENDING_CLIENT_RESPONSE

---

## 2. Resolved Decisions (Signed Off by Client)

| Decision ID | Topic | Selected Decision | Sign-off Date | Status |
| :--- | :--- | :--- | :--- | :--- |
| `DECISION-000` | Squad Operating Model | Autonomous Squad with User as Client/Stakeholder | 2026-10-24 | RESOLVED |
