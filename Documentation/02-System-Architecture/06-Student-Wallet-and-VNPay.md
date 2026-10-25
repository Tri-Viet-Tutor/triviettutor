# Ví học viên và VNPay Sandbox

Trạng thái: được người dùng xác nhận ngày 24/10/2026, triển khai trên nhánh `d_wallet`. Đặc tả này bổ sung luồng ví vào contract thanh toán một lớp hiện có; ưu tiên nội dung này cho nghiệp vụ ví.

## Phạm vi và nguồn tái sử dụng

Một ví VND cho mỗi học viên đã xác thực email; số dư ban đầu 0. Backend và web hỗ trợ nạp qua VNPay Sandbox, lịch sử có phân trang, trả trọn học phí một lớp bằng ví, và hoàn học phí về phương thức gốc. Giữ thanh toán VNPay trực tiếp. Chưa có rút tiền, chuyển tiền, kết hợp hai phương thức cho một khoản học phí, ví lương gia sư hoặc mobile.

Nguồn: [Bike Exchange backend](https://github.com/NgDai/sport-bike-exchange-be), [frontend](https://github.com/votranngochuu/sport-bike-exchange-fe), nhánh main. Chuyển ý tưởng Wallet/WalletTransaction, dịch vụ đọc ví và ghi sổ, cùng bố cục WalletTab và walletService; đổi sang package, user ID, TypeScript, ApiResponse và giao diện của VietTriTutor. Không chuyển endpoint cộng tiền trực tiếp, rút tiền giả lập, domain/secret, nghiệp vụ xe hoặc callback return cộng số dư. Chi tiết khảo sát tại outputs/wallet-migration-proposal.md.

## Business rules và quyền

- Chỉ ROLE_STUDENT đã kích hoạt được đọc ví/lịch sử, tạo/đọc top-up, xác minh return thuộc chính mình và trả học phí bằng ví. Admin hoàn học phí theo quyền hiện tại; không có API sửa số dư tùy ý.
- Ví được tạo lười khi đọc hoặc ghi lần đầu dưới khóa user; UNIQUE student_id bảo đảm một ví. Số tiền dùng BigDecimal/NUMERIC(15,0), VND nguyên, dương, số dư không âm và không vượt NUMERIC(15,0).
- Nạp: tạo intent trước khi redirect, lấy chủ ví từ session. Amount, merchant, reference và return URL được cố định phía server. Idempotency-Key bắt buộc; cùng key/body trả cùng intent, khác body trả IDEMPOTENCY_CONFLICT. Retry không kéo dài expiry. Số dư tăng đúng số tiền nạp, không thu phí nạp. Khi gateway tắt vẫn đọc được trạng thái đã lưu; không cấp URL thanh toán mới.
- WALLET_TOPUP_MIN_AMOUNT mặc định 10000 VND, WALLET_TOPUP_MAX_AMOUNT mặc định 50000000 VND, WALLET_TOPUP_TTL_MINUTES mặc định 15. Giới hạn tối đa cấu hình không vượt 9999999999 VND (tham số VNPay amount có tối đa 12 chữ số sau nhân 100). Backend trả giới hạn cho UI; không hardcode preset amounts.
- Reference top-up là WLT + UUID không dấu gạch, tách reference học phí TVT. Cùng merchant dùng IPN hiện có GET /api/v1/payments/vnpay/ipn, dispatch theo prefix rồi xác minh đầy đủ. Callback không cần JWT.
- IPN xác minh HMAC SHA512, merchant, reference, amount khớp intent, hai status code, transaction number dương và payment date không trước lúc tạo hoặc quá tương lai trên 1 phút. Reject parameter trùng. Provider transaction number và ledger topup_id duy nhất.
- Chỉ IPN hợp lệ mới cộng ví, ghi ledger và chuyển top-up COMPLETED trong một transaction. Return chỉ xác minh/đọc; không cộng tiền. Callback success lặp trả mã 02, amount sai 04, unknown reference 01, chữ ký sai 97, lỗi xử lý 99, đã ghi nhận 00.
- PENDING quá expiry hiển thị EXPIRED, không tạo URL tiếp tục mới. Không giữ chỗ lớp khi nạp. Success đã xác minh đến muộn vẫn cộng ví đúng một lần, kể cả intent đã hiển thị EXPIRED hoặc từng nhận failure; không bỏ khoản thu thực. Callback failure sau success không đảo số dư. Pending không đồng nghĩa đã thu tiền.
- Checkout ví dùng payment intent hiện có: khóa class, user, intent theo thứ tự của hệ thống; reload sau lock; chặn intent đã gắn vnpay_reference. Kiểm tra pending/expiry/cancelled, giá hiện hành, lớp/capacity/lịch, số dư trước khi ghi tiền. Không tự nạp hoặc trả phần thiếu.
- Trừ ví + ledger TUITION + Payment(method=WALLET, COMPLETED) + Enrollment ACTIVE + LearningSchedule cùng transaction. Bất kỳ lỗi nào rollback toàn bộ. Một intent chỉ có một Payment UNIQUE, không thể đồng thời thu qua ví và VNPay. Retry thanh toán ví đã thành công trả cùng payment/enrollment.
- Hoàn học phí WALLET dùng tỷ lệ/hạn hủy hiện tại, làm tròn VND HALF_UP; tăng đúng số dư ví học viên, ledger REFUND, Refund COMPLETED, cập nhật payment refunded total và thu hồi learning access atomically. Mỗi payment/enrollment chỉ một refund theo contract hiện có, retry không cộng lặp. Không phụ thuộc mock-enabled.
- Học phí VNPAY vẫn dùng provider refund API; không cộng ví từ refund đó. Học phí MOCK giữ hành vi test hiện có.

## Dữ liệu và concurrency

Migration V16 (sau V15 payroll) thêm:
- wallets: id BIGSERIAL PK, student_id FK users UNIQUE NOT NULL, balance NUMERIC(15,0) CHECK balance >= 0, created_at.
- wallet_topup_intents: id PK, student_id FK users, amount NUMERIC(15,0) > 0, status PENDING/COMPLETED/FAILED, reference UNIQUE, provider_transaction_no UNIQUE nullable, return_url, created_at/expires_at, paid_at. CHECK completed có paid_at/provider number; các trạng thái khác không có. Expiry > created. Status EXPIRED là giá trị đọc tính toán, không lưu.
- wallet_transactions: id PK, wallet_id FK, type TOPUP/TUITION/REFUND, amount > 0, balance_after >= 0, topup_id/payment_id/refund_id FK riêng UNIQUE, description, created_at. CHECK đúng một FK tương ứng type; ledger append-only qua service. Debit chỉ với TUITION, hai type còn lại credit.
- Mở payment_method_valid để nhận WALLET; thêm CREATE_TOPUP và CONFIRM_WALLET vào payment_operations operation CHECK và enum. Không sửa migration đã chạy.
- Index lịch sử (wallet_id, id), top-up (student_id, id), FK tham chiếu. RLS bật theo chuẩn bảng backend hiện có; không cấp client Supabase quyền ghi ví.

Khóa user tuần tự bảo vệ cả tạo ví và ghi số dư; thao tác lớp giữ class trước, user theo ID tăng dần, intent/enrollment/payment rồi mới ví. Top-up IPN khóa user trước rồi top-up rồi ví, không lấy class lock. Payment operation idempotency được đọc/ghi dưới cùng user lock. UNIQUE constraints là hàng rào bổ sung, mọi lỗi rollback.

## API (prefix /api/v1)

| Method/path | Request | Response data |
| --- | --- | --- |
| GET /wallet | STUDENT | walletId, balance, currency=VND, minTopupAmount, maxTopupAmount |
| GET /wallet/transactions?page=0&size=20 | STUDENT, size 1..100 | PageResponse: transactionId, type, amount, balanceAfter, description, createdAt |
| POST /wallet/topups | {amount}, Idempotency-Key, Origin | 201: topupId, amount, status, reference, paymentUrl (null khi kết thúc/hết hạn), expiresAt, paidAt |
| GET /wallet/topups/{id} | STUDENT owner | cùng dữ liệu top-up đã lưu |
| GET /wallet/vnpay/return | VNPay query, STUDENT owner | cùng dữ liệu, không settle |
| POST /payment-intents/{id}/wallet | Idempotency-Key, STUDENT owner | PaymentConfirmationResponse hiện có |

Response API thường theo ApiResponse success/data; IPN dùng VnpayIpnResponse. Lỗi mới: WALLET_INSUFFICIENT_FUNDS (409), WALLET_INVALID_TOPUP_AMOUNT (400), WALLET_TOPUP_NOT_FOUND (404), WALLET_BALANCE_LIMIT (409); dùng chung lỗi quyền, gateway, signature, idempotency, giá/lịch/expiry hiện có.

## Cấu hình, UI và triển khai

WALLET_VNPAY_RETURN_PATH mặc định /student/wallet; trả về origin từ Origin đã khớp danh sách CORS/FRONTEND_URL, fallback môi trường đã sanitize. Dùng chung VNPAY_*; không tạo merchant credentials. Callback chỉ có một IPN đăng ký trên merchant. Các cấu hình ví có mặt trong application.yml, env examples và docker-compose khi chạy Docker.

Web route /student/wallet và menu Ví của tôi: thẻ số dư/tên, form nạp VND nhận min/max từ server, redirect thật tới VNPay, kết quả về hiển thị pending/failed/completed/expired, polling pending có giới hạn và nút làm mới, lịch sử phân trang. Hiển thị pending cho đến khi IPN ghi nhận. Giữ top-up theo tài khoản trong sessionStorage để phục hồi sau reload; return có thể phục hồi bằng signed query khi storage mất. Login hết hạn lưu route nội bộ /student/wallet và nguyên query, không cho external redirect. Xóa query sau khi xác minh thành công; retry lỗi xác minh vẫn giữ query.

Checkout cho chọn VNPay hoặc ví, hiển thị balance, link nạp ví nếu thiếu tiền; không tự redirect nạp rồi tự mua lớp khi quay lại. Sau thanh toán/hoàn ví refresh balance, payment, enrollment, schedule. Form đang xử lý chặn gửi lặp ở UI; server vẫn phải chống trùng.

Migration chỉ chuẩn bị trong repo; không tự thay đổi database dùng chung. Profile supabase validate sẽ yêu cầu áp migration mới trước khi chạy. Kiểm thử H2 riêng, không dùng live credentials hoặc ghi dữ liệu chung.

## Nghiệm thu

Test nạp/return/IPN success/failure/duplicate/late/invalid signature/merchant/amount/duplicate params, ownership, amount bounds, idempotency conflict; concurrent topups và wallet debit; class full/price/conflict/expiry/insufficient funds không mất tiền; race wallet/VNPay cho cùng intent; refund đúng ví và không lặp, mock tắt vẫn refund WALLET; regression direct VNPay/refund. Build/type/lint web; browser kiểm tra menu/form/checkout. Live Sandbox chỉ xác nhận khi giao dịch thật nhận IPN trên backend public cùng database.

### Preview độc lập để kiểm tra giao diện

`scripts/start-wallet-preview.ps1 -FrontendOrigin <origin frontend loopback>` chạy WalletPreviewServer trong test sources, không nạp `.env`, dùng H2 trong bộ nhớ và merchant fixture ngẫu nhiên với URL gateway `.test.invalid`. Port backend mặc định 0 để hệ điều hành chọn cổng trống. Tài khoản dùng một lần, cổng thực tế và class ID nằm trong `outputs/wallet-preview/session.json` (Git bỏ qua). Ví fixture có 200000 VND giả được ghi nhận qua service IPN, lớp test học phí 100000 VND. Trỏ `VITE_API_PROXY_TARGET` tới backend preview rồi chạy frontend tại origin đã truyền. Preview kiểm tra giao diện/ghi sổ; không thể thanh toán tại gateway thật. Dừng server sẽ mất dữ liệu. Dừng các tiến trình preview sau nghiệm thu nếu người dùng không yêu cầu giữ lại.

Kết quả nghiệm thu 25/10/2026 và cách chạy test: [Wallet verification](../../outputs/wallet-verification.md).
