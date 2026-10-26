# Wallet migration verification — 25/10/2026

Branch: `d_wallet`. User approved reusing the Bike Exchange wallet backend/frontend and the student wallet scope. Existing unrelated uncommitted work was preserved. Verification only migrated a disposable local database.

## Implementation

- Student wallet, exact whole-VND balance and append-only transaction history.
- Durable VNPay top-up intents, owner-only reads and return verification, shared IPN dispatch with tuition.
- Atomic wallet tuition payment and original-wallet refunds, including student cancellation and admin exceptions.
- Web route/menu `/student/wallet`, server-configured top-up limits, pending recovery/polling and paginated ledger.
- Checkout method selection, balance display, top-up link and refresh after money movement.
- V16 schema, checks/unique/FK/indexes/RLS, environment templates, Docker settings and PowerShell environment import.
- Approved product/data/API/UI documentation at [Student wallet contract](../Documentation/02-System-Architecture/06-Student-Wallet-and-VNPay.md).

## Sources adapted

The following files were retrieved through the connected GitHub tools from the supplied repositories' main branches. Logic was adapted to VietTriTutor; unsafe direct balance edits, floating point money and return-driven credits were replaced.

| Source | Target |
| --- | --- |
| NgDai/sport-bike-exchange-be: entities/Wallet.java | backend entity/Wallet.java; one owner and exact balance |
| NgDai/sport-bike-exchange-be: entities/WalletTransaction.java | entity/WalletTransaction.java; immutable source-linked ledger |
| NgDai/sport-bike-exchange-be: services/WalletService.java | WalletService, WalletTopupService, WalletPaymentService and existing local refund service |
| votranngochuu/sport-bike-exchange-fe: src/features/user/components/WalletTab.jsx | StudentWalletPage.tsx; balance card, funding form, refresh and result |
| votranngochuu/sport-bike-exchange-fe: src/services/walletService.js | walletService.ts; typed API client and existing ApiResponse |

## Automated evidence

| Check | Result |
| --- | --- |
| Backend compile | Passed |
| H2: WalletIntegrationTest (initial 15 wallet cases), VnpayPaymentIntegrationTest (7), VnpayProtocolTest (4), EnvironmentLoadingTest (6) | 32 passed, zero failures/errors |
| Fresh local PostgreSQL 18.4: Flyway migrations V1–V16 (V8 absent in repository history) | Passed, schema at V16; no shared database access |
| Final WalletIntegrationTest against migrated PostgreSQL schema, Hibernate validate | 17 passed, zero failures/errors |
| Frontend production build/type check | Passed |
| Frontend ESLint | Passed |
| Prettier on wallet/checkout changes | Passed |
| git diff --check | Passed |

PostgreSQL checks include actual unique/FK/CHECK constraints and user/intent locks, duplicate and independent simultaneous top-ups, concurrent debits without overspending, competing wallet/VNPay checkout, rollback on insufficient balance, ownership, signatures, amounts, idempotency, expiry/cancellation/price/schedule rejection and original-owner refund replay. Additional cases cover pending reads with the gateway disabled and admin partial refund after class assignment.

The PostgreSQL suite can be run with an already migrated disposable loopback database named wallet_test and role wallet_test:
`mvn -f backend/pom.xml -Dtest=WalletIntegrationTest -Dwallet.test.database-url=<isolated JDBC URL> test`.
The test refuses non-loopback/non-wallet_test targets. The default suite uses its own H2 database and does not connect to PostgreSQL.

## Browser evidence

Used the real React UI and Spring Boot controllers on loopback with an H2 preview; no request interception or mocked browser API.

1. Opened student wallet while logged out and signed in with the generated disposable student account.
2. Verified wallet balance 200000 VND and the initial top-up ledger.
3. Amount 9999 disabled funding; amount 10000 enabled funding, matching limits returned by the backend.
4. Selected wallet payment and a class priced at 100000 VND; success created an active enrollment and learning schedule.
5. Wallet showed balance 100000 VND with one tuition debit.
6. Cancelled the enrollment before the deadline with a test reason.
7. Wallet returned to 200000 VND with exactly three ledger entries: top-up +200000, tuition -100000, refund +100000.
8. Checkout showed the persisted refund result, and browser console had no error entries.

Screenshot: [student-wallet-preview.png](../Documentation/assets/student-wallet-preview.png). All displayed amounts/account data in this image are disposable fixtures.

## Limits and rollout

- Live VNPay Sandbox top-up has not been claimed as tested. A real test requires valid merchant credentials and the registered public IPN to the same backend/database.
- Apply V16 to the intended development/shared database before running a Hibernate validate profile. This task only migrated the disposable local PostgreSQL cluster.
- Preview Java and frontend servers and local PostgreSQL are stopped after verification. The user's other servers are not stopped.
- The frontend build reports the existing large-bundle warning; build succeeds.
- Repeatable isolated UI preview: `scripts/start-wallet-preview.ps1 -FrontendOrigin <frontend loopback origin>`. Generated credentials/session and screenshots are under the ignored outputs/wallet-preview directory.
