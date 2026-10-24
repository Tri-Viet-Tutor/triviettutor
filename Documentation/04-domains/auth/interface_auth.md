# Domain Parent Interface: Authentication & Identity (`auth`)

This document defines the architectural contract, shared domain models, and token lifecycle for the **Authentication & Identity Domain** of VietTriTutor, adhering to [oop-doc-architecture](file:///C:/Users/Cuong/.gemini/config/skills/oop-doc-architecture/SKILL.md).

---

## 1. Dependencies & Context

- **Domain Scope**: Identity verification, credential authentication, JWT token issuance, refresh rotation, email verification, and password recovery.
- **Root Index**: [System Documentation Index](file:///docs/README.md)
- **Business Rules**: [BR-01: User Roles and Permissions](file:///docs/01-Business-Logic/01-User-Roles-and-Permissions.md)
- **Backend Architecture**: [Backend API Specification](file:///docs/02-System-Architecture/02-Backend-Architecture-and-API-Specification.md)

---

## 2. Implementations & Component Directory

| Layer | Component Class / Interface | Responsibility |
| :--- | :--- | :--- |
| **Controller** | [`AuthController`](file:///backend/src/main/java/com/viettritutor/controller/AuthController.java) | REST endpoint exposition under `/api/v1/auth/*` |
| **Service Contract** | [`AuthService`](file:///backend/src/main/java/com/viettritutor/service/AuthService.java) | Domain boundary interface for authentication operations |
| **Service Concrete** | [`AuthServiceImpl`](file:///backend/src/main/java/com/viettritutor/service/impl/AuthServiceImpl.java) | Business logic execution, BCrypt verification, transactional handling |
| **Security / JWT** | [`JwtService`](file:///backend/src/main/java/com/viettritutor/security/jwt/JwtService.java) | Cryptographic token signing, claim parsing, expiration checks |
| **Persistence** | [`UserRepository`](file:///backend/src/main/java/com/viettritutor/repository/UserRepository.java) | Entity storage for accounts |
| **Verification** | [`EmailVerificationRepository`](file:///backend/src/main/java/com/viettritutor/repository/EmailVerificationRepository.java) | Storage for 6-digit email OTPs |
| **Password Reset** | [`PasswordResetTokenRepository`](file:///backend/src/main/java/com/viettritutor/repository/PasswordResetTokenRepository.java) | Storage for secure password reset tokens |

---

## 3. Shared Domain Models

### 3.1. `UserPrincipal`
Represents an authenticated user within the system execution context:
```typescript
interface UserPrincipal {
  id: number;
  email: string;
  fullName: string;
  role: UserRole;
  enabled: boolean;
}
```

### 3.2. `AuthTokens`
Represents the cryptographic authorization token pair:
```typescript
interface AuthTokens {
  accessToken: string;
  refreshToken?: string;
  tokenType: "Bearer";
  expiresIn: number; // TTL in seconds (e.g. 86400 for 24h)
  user: UserPrincipal;
}
```

### 3.3. `TokenRefreshResponse`
Payload returned upon successful access token renewal:
```typescript
interface TokenRefreshResponse {
  accessToken: string;
  tokenType: "Bearer";
  expiresIn: number;
}
```

### 3.4. `LoginCredentials`
Payload submitted to establish an authenticated session:
```typescript
interface LoginCredentials {
  email: string;     // Must be valid email format
  password: string;  // Plaintext password for BCrypt verification
}
```

### 3.5. `TokenRefreshPayload`
Payload submitted when refreshing an access token via request body:
```typescript
interface TokenRefreshPayload {
  refreshToken?: string; // Optional if provided via HttpOnly secure cookie
}
```

---

## 4. Domain Enums

### 4.1. `UserRole`
Defines system authority levels:
- `ROLE_ADMIN`: Center administrator with full operational management rights.
- `ROLE_TUTOR`: Center tutor assigned to specific classes.
- `ROLE_STUDENT`: Student or parent responsible for class registration and payment.

### 4.2. `TokenStatus`
Defines token validity states:
- `ACTIVE`: Token is valid, signature verified, and within expiration window.
- `EXPIRED`: Token has passed its `exp` timestamp.
- `REVOKED`: Token was explicitly invalidated (e.g., password reset, user logout).
- `REFRESHED`: Refresh token has been consumed and rotated.

### 4.3. `AuthErrorCode`
Standardized error codes returned across authentication flows:
- `INVALID_CREDENTIALS`: HTTP 401 — Incorrect email or password.
- `ACCOUNT_NOT_VERIFIED`: HTTP 403 — Email address has not yet been confirmed via OTP.
- `USER_NOT_FOUND`: HTTP 404 — User account does not exist.
- `EMAIL_ALREADY_EXISTS`: HTTP 409 — An account with this email is already registered.
- `INVALID_OTP`: HTTP 400 — Verification OTP is incorrect.
- `OTP_EXPIRED`: HTTP 400 — Verification OTP has exceeded 10-minute validity.
- `INVALID_RESET_TOKEN`: HTTP 400 — Password reset token not found or already used.
- `RESET_TOKEN_EXPIRED`: HTTP 400 — Password reset token has expired (15 minutes TTL).
- `INVALID_REFRESH_TOKEN`: HTTP 401 — Refresh token is invalid, expired, or malformed.
- `ACCESS_DENIED`: HTTP 403 — Insufficient role permissions for target endpoint.

---

## 5. Domain Boundary Contract (`AuthService`)

```java
public interface AuthService {
    /** Authenticates user by email/password and issues JWT access token */
    AuthResponse login(AuthRequest request);

    /** Refreshes an expired access token using a valid refresh token */
    TokenRefreshResponse refresh(RefreshTokenRequest request);

    /** Registers a new student account and dispatches verification OTP */
    RegisterResponse register(RegisterRequest request);

    /** Verifies registration OTP and activates student account */
    AuthResponse verifyEmail(VerifyEmailRequest request);

    /** Resends verification OTP to unverified account */
    RegisterResponse resendVerification(ResendVerificationRequest request);

    /** Generates password reset token and sends email link */
    void forgotPassword(ForgotPasswordRequest request);

    /** Validates reset token and updates password */
    void resetPassword(ResetPasswordRequest request);
}
```

---

## 6. Invariants & Security Rules

1. **Password Hashing**: Passwords MUST always be salted and hashed using BCrypt. Plaintext passwords must never be logged or persisted.
2. **Registration Invariant**: Public registration is strictly restricted to `ROLE_STUDENT` (BR-01.04). `ROLE_ADMIN` and `ROLE_TUTOR` accounts can only be provisioned by an administrator.
3. **Configuration Isolation**: JWT secrets (`app.jwt.secret`) and token expiration times (`app.jwt.expiration-ms`) must be read exclusively from environment variables.
4. **Envelope Uniformity**: All API responses must strictly conform to the `ApiResponse<T>` envelope containing `success`, `data`, `message`, and `errorCode`.
