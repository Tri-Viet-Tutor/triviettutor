# VNPay Sandbox — cấu hình và nghiệm thu cho cả nhóm

Ngày cập nhật: 24/10/2026. Phạm vi được người dùng yêu cầu trên nhánh `vnpay-sandbox-configuration`: thanh toán một lớp bằng VNPay Sandbox, chuyển hướng tới trang thanh toán do VNPay cung cấp, nhận kết quả và hoàn tiền theo business rules hiện có. Không mở rộng sang thanh toán nhiều lớp hoặc ứng dụng mobile.

## 1. Contract và trải nghiệm thanh toán

1. Học viên đã xác thực email chọn lớp ENROLLING, còn chỗ và có đủ các buổi SCHEDULED trong tương lai.
2. POST `/api/v1/payment-intents` với `{classGroupId}` và `Idempotency-Key` lấy học phí từ server. Tạo quote chưa giữ chỗ.
3. POST `/api/v1/payment-intents/{id}/vnpay` kiểm tra điều kiện lần nữa, giữ chỗ tới expiry và trả `paymentUrl` đã ký. Frontend lưu intent theo tài khoản rồi tự chuyển trình duyệt tới URL này. Hiển thị liên kết tiếp tục nếu trình duyệt chưa điều hướng; không nhập thẻ/OTP hoặc tạo QR thanh toán giả trong ứng dụng.
4. VNPay trả trình duyệt về origin frontend đã được cho phép + `VNPAY_RETURN_PATH`. Return chỉ xác minh chữ ký và đọc trạng thái đã lưu; tuyệt đối không tự ghi nhận đã thu tiền.
5. IPN GET `/api/v1/payments/vnpay/ipn` xác minh HMAC SHA512, merchant, reference, số tiền và thời điểm. Chỉ IPN hợp lệ mới tạo Payment/Enrollment/LearningSchedule atomically. Callback lặp không ghi nhận hai lần; tiền đến sau khi hủy/hết hạn hoặc không thể ghi danh phải được lưu REQUIRES_REFUND.
6. Frontend poll trạng thái đang chờ, cho phép tải lại thủ công; sau thành công làm mới danh sách ghi danh/lịch học. Phiên đăng nhập hết hạn khi quay về phải giữ đường dẫn checkout nội bộ và query VNPay qua đăng nhập, không chấp nhận redirect sang origin khác.
7. Bật VNPay mà thiếu/sai cấu hình phải báo rõ tên biến thiếu khi backend khởi động, không in khóa bí mật. Tắt VNPay vẫn cho backend khởi động; API trả PAYMENT_GATEWAY_DISABLED như hiện tại.
   Khi browser return có kết quả đã xác minh nhưng IPN chưa đến, UI phân biệt thông báo thành công/hủy/thất bại từ VNPay với trạng thái ghi nhận cuối cùng trong database. Không hiển thị đã ghi danh chỉ dựa trên return.
8. Proxy phải chuyển đúng địa chỉ IP client. Chỉ bật xử lý forwarded headers khi backend ở sau reverse proxy tin cậy có lọc/ghi đè các header này; mặc định không tin header do trình duyệt tự gửi.

## 2. Thông tin bắt buộc từ VNPay

Đăng ký merchant test tại <https://sandbox.vnpayment.vn/devreg/>. Chủ tài khoản tự nhập email, mật khẩu mới và CAPTCHA. VNPay gửi TmnCode và HashSecret qua email. Các giá trị này không thể tự sinh trong code và không dùng khóa demo tìm trên Internet.

Tài liệu chính thức:

- Thanh toán, Return và IPN: <https://sandbox.vnpayment.vn/apis/docs/thanh-toan-pay/pay.html>
- Query/refund: <https://sandbox.vnpayment.vn/apis/docs/truy-van-hoan-tien/querydr%26refund.html>

Giữ secrets trong `.env` riêng hoặc secret store của host backend. Chỉ chia sẻ cho thành viên vận hành backend qua kênh riêng; không commit, không đưa vào biến `VITE_*` hoặc log. Commit template, script và tài liệu để mỗi thành viên có cùng quy trình.

## 3. Các biến môi trường

| Biến | Ý nghĩa |
|---|---|
| `VNPAY_ENABLED` | Chỉ đặt true sau khi có credential hợp lệ |
| `VNPAY_TMN_CODE` | Mã merchant test do VNPay cấp (8 ký tự chữ/số) |
| `VNPAY_HASH_SECRET` | Khóa ký do VNPay cấp |
| `VNPAY_PAYMENT_URL` | URL trang thanh toán Sandbox, lấy từ template |
| `VNPAY_API_URL` | URL API query/refund Sandbox, lấy từ template |
| `VNPAY_RETURN_PATH` | `/student/checkout`; đường dẫn nội bộ, không phải domain |
| `VNPAY_SERVER_IP` | IP máy chủ gọi query/refund theo cấu hình VNPay; không phải URL |
| `VNPAY_TIMEOUT_SECONDS` | Timeout API, mặc định 30 giây |
| `PAYMENT_INTENT_TTL_MINUTES` | Thời hạn quote/giữ chỗ, mặc định 5 phút |
| `VNPAY_PUBLIC_BACKEND_URL` | Origin HTTPS public của backend dùng để hướng dẫn/kiểm tra IPN; không được gửi như một tham số tùy ý trong URL pay |
| `FRONTEND_URL` | Origin fallback của frontend |
| `CORS_ALLOWED_ORIGINS` | Các origin frontend chính xác, phân tách dấu phẩy; không wildcard |
| `SERVER_FORWARD_HEADERS_STRATEGY` | `none` mặc định; `framework` khi proxy tin cậy xử lý forwarded headers |

## 4. Chạy trong nhóm

### Dùng backend Sandbox chung (khuyến nghị để demo nhóm)

Một backend public HTTPS + một database + một bộ merchant nhận IPN. Mọi frontend của nhóm trỏ `VITE_API_BASE_URL` về backend này (kèm `/api/v1`); backend cho phép từng origin frontend trong CORS. Với Vite, đặt biến trong `frontend/.env.local` rồi restart frontend. Với Docker, đặt biến trong `.env.docker` rồi tạo lại container frontend. Frontend dùng backend chung không cần biết merchant secret hoặc database password. URL IPN đăng ký với VNPay phải là `VNPAY_PUBLIC_BACKEND_URL` + `/api/v1/payments/vnpay/ipn`, truy cập không qua login/protection. Backend nhận IPN phải sử dụng cùng database chứa intent và cùng merchant/secret đã ký URL pay.

Không chia sẻ một merchant rồi thay IPN lần lượt về các máy dùng database khác nhau. Trình duyệt có thể quay về localhost của thành viên qua Return URL nhưng IPN phải tới đúng backend chung. Một origin frontend mới chỉ có hiệu lực sau khi cập nhật CORS và khởi động lại backend.

### Phương án chuẩn bị: backend Render

`render.yaml` định nghĩa một backend Docker test dùng Supabase hiện có, plan Free, vùng Singapore và nhánh `vnpay-sandbox-configuration`; không tạo database mới và tắt auto-deploy. Đây là cấu hình chuẩn bị, chưa tạo dịch vụ. Chỉ triển khai sau khi người dùng chọn workspace và chấp thuận publish backend/cung cấp secrets cho host. Nếu repo private, chủ repo phải cấp Render quyền đọc Git trước khi deploy.

Health check dùng `/api-docs`; profile `supabase` validate schema và tắt Flyway để không tự migrate database dùng chung. Biến DB/JWT/SMTP/merchant nhập riêng qua secret store, không nằm trong manifest. Giới hạn pool 5 kết nối và cấu hình bộ nhớ JVM phù hợp môi trường test. Điền origin frontend thực tế (bao gồm từng localhost của nhóm) qua FRONTEND_URL/CORS_ALLOWED_ORIGINS, không wildcard. Sau deploy mới lấy URL HTTPS thực tế để đăng ký IPN; không đoán trước tên miền dịch vụ.

Theo tài liệu Render, Free có thể ngủ sau 15 phút không có request. Mở backend và chờ warm-up trước demo; gói này dành cho kiểm thử, không bảo đảm IPN liên tục như production. Chưa có Render CLI thì phải ghi rõ chưa xác minh platform validation, dù đã kiểm tra manifest bằng JSON schema chính thức.

Tài liệu Render: <https://render.com/docs/blueprint-spec>, <https://render.com/docs/free>.

### Mỗi người chạy backend riêng

Mỗi thành viên dùng merchant test riêng và URL HTTPS public riêng (host dev hoặc tunnel do thành viên cấu hình), đăng ký IPN tương ứng với VNPay. Localhost không nhận được callback từ server VNPay. Không có tunnel URL nào được hardcode trong source.

### Khởi tạo cấu hình

```powershell
# Backend chạy trực tiếp, dùng Supabase đã cấu hình trong .env
./scripts/configure-vnpay-sandbox.ps1 -EnvironmentFile .env
# Điền TmnCode/HashSecret và public backend URL trong .env rồi kiểm tra:
./scripts/check-vnpay-sandbox.ps1 -EnvironmentFile .env
./scripts/start-backend.ps1 -Profile supabase

# Docker: database local, KHÔNG tự dùng dữ liệu đã seed trên Supabase
./scripts/init-docker-env.ps1
./scripts/configure-vnpay-sandbox.ps1 -EnvironmentFile .env.docker
# Điền credential rồi kiểm tra và tạo lại container để nhận biến mới:
./scripts/check-vnpay-sandbox.ps1 -EnvironmentFile .env.docker
docker compose --env-file .env.docker up -d --build backend frontend
```

Script khởi tạo chỉ bổ sung biến thiếu từ template, không ghi đè secrets đã có, không tự tạo credential merchant và không tự bật thanh toán khi chưa có credential. `check-vnpay-sandbox.ps1 -CheckIpn` kiểm tra endpoint public phản hồi acknowledgement VNPay cho request không có chữ ký; không tạo giao dịch. Kiểm tra này không thay cho xác nhận URL đã được VNPay đăng ký.

## 5. Hoàn tiền và trạng thái chưa xác định

Lưu request refund trước khi gọi VNPay; timeout hoặc phản hồi không xác minh được giữ PENDING. Chỉ phản hồi có chữ ký, đúng merchant/reference/type/amount và xác nhận hoàn tất mới tăng tiền hoàn và thu hồi quyền học. Mã querydr 00 chỉ xác nhận truy vấn thành công, không tự chứng minh đã hoàn tiền. Phản hồi về giao dịch thanh toán gốc (type 01, amount gốc) không được dùng để hoàn tất hoặc cho retry một refund một phần. Phản hồi refund type 02/03 phải khớp số tiền refund và có transaction number riêng. Trường hợp VNPay không cung cấp bằng chứng đủ rõ qua querydr cần đối chiếu merchant portal/support; không suy diễn đã hoàn hoặc gửi lại mù.

## 6. Nghiệm thu

### Preview local không chạm database của nhóm

`scripts/start-vnpay-preview.ps1` chạy backend với profile test, database H2 trong bộ nhớ và tài khoản/lớp test sinh mới. Merchant thật được đọc từ `.env` riêng, nên có thể xác minh chuyển hướng tới trang Sandbox thật trước khi có backend public. Thông tin đăng nhập preview ghi vào file tạm đã được Git bỏ qua trong `outputs/vnpay-preview/`. Không dùng tài khoản này ngoài preview. Dừng server sẽ mất toàn bộ dữ liệu H2. Preview chỉ bind backend vào loopback; không dùng server này làm backend chung hoặc mở nó ra Internet.

Script đọc origin frontend từ `FRONTEND_URL`; có thể đặt `VNPAY_PREVIEW_FRONTEND_ORIGIN` khi test một cổng khác. Chạy frontend bình thường với proxy trỏ tới cổng backend preview. Không chạy preview và backend chính trên cùng cổng. Trước khi trả lại máy cho người dùng, dừng các server preview do agent tạo nếu người dùng không yêu cầu giữ lại.

```powershell
./scripts/start-vnpay-preview.ps1 -Port 8080
# Terminal khác:
cd frontend
npm run dev
```

### Checklist

- Kiểm tra template cả `.env` và `.env.docker`, importer PowerShell, cấu hình Docker và lỗi startup không lộ secret.
- Test checkout giữ chỗ, retry cùng intent, khác chủ sở hữu, lớp đầy/trùng lịch, intent hết hạn/hủy.
- Test Return không settle; IPN chữ ký/số tiền sai, parameter trùng, IPN lặp, thất bại, thành công đến trễ và REQUIRES_REFUND; callback hợp lệ tạo đúng một payment/enrollment/schedule.
- Test refund thành công, timeout, sai chữ ký/amount/reference, querydr type 01 không hoàn tất refund, không cho retry PENDING.
- Kiểm tra frontend chuyển sang URL provider, tiếp tục sau refresh, trạng thái thành công/thất bại/hủy và đăng nhập lại khi trở về.
- Test tự động dùng credential ngẫu nhiên và database H2 riêng; không gọi gateway thật hoặc sửa Supabase của nhóm.
- Nghiệm thu live chỉ hoàn tất sau khi có merchant credentials, IPN HTTPS đã đăng ký và giao dịch Sandbox thật đi qua VNPay rồi về ứng dụng. Phải báo riêng kết quả automated và live; không ghi live thành công khi chỉ chạy fixture.
