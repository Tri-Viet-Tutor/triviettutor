# VNPay Sandbox — cấu hình và nghiệm thu cho cả nhóm

Ngày cập nhật: 25/10/2026. Phạm vi được người dùng yêu cầu trên nhánh `vnpay-sandbox-configuration`: thanh toán một lớp bằng VNPay Sandbox, chuyển hướng tới trang thanh toán do VNPay cung cấp, nhận kết quả và hoàn tiền theo business rules hiện có. Không mở rộng sang thanh toán nhiều lớp hoặc ứng dụng mobile.

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

Frontend chạy với backend Render chung trên nhánh VNPay:

```powershell
# Chạy sau khi checkout nhánh vnpay-sandbox-configuration.
# Nếu đã có .env.local, sửa VITE_API_BASE_URL theo template, không ghi đè file riêng.
Copy-Item frontend/.env.sandbox.example frontend/.env.local
cd frontend
npm ci
npm run dev
```

Template `frontend/.env.sandbox.example` chỉ chứa cấu hình public, tắt preview giả. Các origin được cấu hình trên Render: `http://localhost:5173`, `http://127.0.0.1:5173`, `https://triviettutor-web.vercel.app`, `https://triviettutor.vercel.app`. Thành viên dùng port/domain khác cần bổ sung origin chính xác ở backend. Không đổi cấu hình frontend trong checkout đang phát triển tính năng backend chưa được deploy, ví dụ nhánh ví học viên riêng.

### Backend Render dùng chung

`render.yaml` định nghĩa một backend Docker test dùng Supabase hiện có, plan Free, vùng Singapore và nhánh `vnpay-sandbox-configuration`; không tạo database mới và tắt auto-deploy. Ngày 24/10/2026, người dùng đã chấp thuận deploy vào workspace FPT và lưu DB/JWT/SMTP/VNPay secrets riêng trên Render. Service được tạo qua Render MCP: `srv-dbe98k8ae00c73cc9gl0`, URL `https://triviettutor-sandbox-api.onrender.com`. Việc có URL chưa chứng minh backend đã hoạt động; chỉ chuyển frontend sang backend này sau khi kiểm tra HTTP thành công.

Manifest đặt health check `/api-docs`; service tạo qua MCP hiện dùng TCP health check mặc định vì API tạo service không có trường healthCheckPath. Cần kiểm tra `/api-docs` qua HTTP riêng. Profile `supabase` validate schema và tắt Flyway để không tự migrate database dùng chung. Biến DB/JWT/SMTP/merchant nhập riêng qua secret store, không nằm trong manifest. Giới hạn pool 5 kết nối và cấu hình bộ nhớ JVM phù hợp môi trường test. Điền origin frontend thực tế (bao gồm từng localhost của nhóm) qua FRONTEND_URL/CORS_ALLOWED_ORIGINS, không wildcard.

IPN đã đăng ký: `https://triviettutor-sandbox-api.onrender.com/api/v1/payments/vnpay/ipn`. Ngày 25/10/2026 người dùng xác nhận đã lưu và mở lại thấy đúng URL, GET, HMACSHA512 trong Merchant Admin. Trong Merchant Admin: menu tài khoản → Thông tin tài khoản → dòng website đúng TmnCode của dự án → biểu tượng sửa → IPN Url, GET, HMACSHA512. Mục email thông báo không phải nơi đăng ký IPN. Merchant Admin và SIT Testing dùng các phiên đăng nhập riêng; SIT phục vụ chạy kịch bản kiểm thử.

Nhật ký triển khai: commit `d9f34f9` build Docker thành công; startup ban đầu bị đóng TLS khi kết nối Supabase Session Pooler (SQLState 08006, chưa tới bước xác thực). Cùng cấu hình đã kiểm tra `SELECT 1` thành công bằng psql và JDBC Java 21 từ máy phát triển. Sau cấu hình runtime bên dưới, deploy `dep-dbedooom7kps73dik3kg` đã LIVE lúc 23:29 ngày 24/10/2026 (Asia/Bangkok), kết nối Supabase và validate schema thành công. Đã xác minh IPN public HTTP 200, `RspCode=97` khi không có chữ ký. Giữ `DB_SSL_MODE=require`, không ép phiên bản TLS và tắt SSL debug. Ngày 25/10 đã quan sát cold start sau khi ngủ: Hikari kết nối lại thành công; backend khởi động trong khoảng 93 giây, `/api-docs` và IPN đều trả HTTP 200 sau warm-up.

Đăng ký IPN đã được người dùng xác nhận lưu và mở lại đúng vào ngày 25/10/2026 sau khi công cụ trình duyệt bị gián đoạn. Chưa nghiệm thu một giao dịch Sandbox thành công tạo enrollment thực tế; chuyển hướng tới gateway đã được xác minh riêng bằng preview H2. `VNPAY_SERVER_IP` cho query/refund được đặt riêng trên Render theo IP public thực tế trong Supavisor connection logs (`app_name=viettritutor-backend`, `local=false`), không dùng IP proxy nội bộ. Khi đổi host/vùng hoặc outbound IP thay đổi phải cập nhật biến này. Chưa nghiệm thu query/refund gateway thật vì chưa có giao dịch Sandbox thành công để đối soát.

Deploy cuối bổ sung IP máy chủ: `dep-dbel0jrncjis73ejf790`, LIVE lúc 07:43 ngày 25/10/2026 (Asia/Bangkok). Đã kiểm tra lại IP outbound sau restart vẫn khớp cấu hình và endpoint IPN HTTP 200/RspCode 97. Mã backend đang deploy là `d9f34f9`; các commit tiếp theo chỉ bổ sung manifest/template/tài liệu, không thay đổi Java hoặc frontend checkout. Auto-deploy vẫn tắt.

Runtime Free dùng `-XX:TieredStopAtLevel=1` để giảm chi phí JIT khi cold start và `SPRING_DATASOURCE_HIKARI_INITIALIZATION_FAIL_TIMEOUT=60000` để cho phép thử lại kết nối khởi tạo trong tối đa 60 giây. Hikari mặc định chỉ thử khởi tạo rất ngắn, trong khi Supavisor giới hạn bắt tay TLS 2,5 giây; lần khởi tạo crypto đầu trên CPU nhỏ có thể vượt giới hạn. Backend vẫn phải lấy được kết nối và validate schema trước khi sẵn sàng, không dùng timeout âm/khởi tạo bất đồng bộ để báo healthy giả. Không để SSL debug bật trong cấu hình cuối.

Tham chiếu chẩn đoán: <https://github.com/supabase/supavisor/blob/main/lib/supavisor/client_handler.ex>, <https://github.com/brettwooldridge/HikariCP#infrequently-used>.

Theo tài liệu Render, Free có thể ngủ sau 15 phút không có request. Mở backend và chờ warm-up trước demo; gói này dành cho kiểm thử, không bảo đảm IPN liên tục như production. Chưa có Render CLI thì phải ghi rõ chưa xác minh platform validation, dù đã kiểm tra manifest bằng JSON schema chính thức.

Render Free chặn SMTP outbound trên port 25/465/587. SMTP secrets được lưu riêng nhưng gửi OTP/reset email qua Gmail SMTP hiện không hoạt động trên host này; demo thanh toán bằng tài khoản test đã enabled. Luồng đăng ký mới/gửi email cần cấu hình nhà cung cấp email qua HTTPS hoặc gói host hỗ trợ SMTP sau khi chọn phương án. Không tự đánh dấu email người dùng mới là đã xác thực để vượt giới hạn host.

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

Kết quả đã kiểm tra: 17 automated tests về VNPay/protocol/environment đều pass; frontend build và lint các file thay đổi pass. Smoke test backend Render ngày 25/10: đăng nhập fixture Student thành công, tạo intent 13 cho lớp 7 (120.000đ), nhận URL HTTPS VNPay có chữ ký, hủy intent thành công; DB xác nhận EXPIRED, cancelled=true, không tạo payment. CORS localhost:5173 cho phép, origin ngoài danh sách trả 403. Đây là kiểm tra API; chưa thay thế giao dịch thẻ Sandbox thành công nhận IPN và tự ghi danh.

### Giao dịch thẻ Sandbox để nghiệm thu cuối

Mở backend để warm-up trước, chạy frontend bằng cấu hình backend chung, đăng nhập Student đã xác thực rồi chọn lớp đang nhận đăng ký. Bấm thanh toán để tạo intent mới và tự chuyển sang VNPay. Chọn **Thẻ nội địa và tài khoản ngân hàng → NCB**, dùng bộ thẻ test do VNPay gửi trong email merchant:

| Trường | Giá trị Sandbox |
|---|---|
| Số thẻ | `9704198526191432198` |
| Chủ thẻ | `NGUYEN VAN A` |
| Ngày phát hành | `07/15` |
| OTP test | `123456` |

Hoàn tất trong thời hạn intent (mặc định 5 phút). Sau khi VNPay trả về, kiểm tra trạng thái đã được backend xác nhận, lớp xuất hiện trong lớp đã đăng ký và lịch học được tạo. Đối chiếu database: đúng một Payment COMPLETED, một Enrollment và bộ LearningSchedule tương ứng; gọi lại callback không nhân đôi. Nếu phiên thanh toán cũ đã hết hạn/hủy, tạo yêu cầu mới trong ứng dụng. Không tự sửa chữ ký/response code hoặc ghi Payment COMPLETED bằng SQL để làm bằng chứng nghiệm thu.

- Kiểm tra template cả `.env` và `.env.docker`, importer PowerShell, cấu hình Docker và lỗi startup không lộ secret.
- Test checkout giữ chỗ, retry cùng intent, khác chủ sở hữu, lớp đầy/trùng lịch, intent hết hạn/hủy.
- Test Return không settle; IPN chữ ký/số tiền sai, parameter trùng, IPN lặp, thất bại, thành công đến trễ và REQUIRES_REFUND; callback hợp lệ tạo đúng một payment/enrollment/schedule.
- Test refund thành công, timeout, sai chữ ký/amount/reference, querydr type 01 không hoàn tất refund, không cho retry PENDING.
- Kiểm tra frontend chuyển sang URL provider, tiếp tục sau refresh, trạng thái thành công/thất bại/hủy và đăng nhập lại khi trở về.
- Test tự động dùng credential ngẫu nhiên và database H2 riêng; không gọi gateway thật hoặc sửa Supabase của nhóm.
- Nghiệm thu live chỉ hoàn tất sau khi có merchant credentials, IPN HTTPS đã đăng ký và giao dịch Sandbox thật đi qua VNPay rồi về ứng dụng. Phải báo riêng kết quả automated và live; không ghi live thành công khi chỉ chạy fixture.
