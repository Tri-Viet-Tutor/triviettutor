# Đề xuất chuyển ví Bike Exchange sang VietTriTutor

Trạng thái: **ĐÃ ĐƯỢC NGƯỜI DÙNG XÁC NHẬN**, triển khai trên `d_wallet`. Đây là bản khảo sát ban đầu; đặc tả có hiệu lực nằm tại `Documentation/02-System-Architecture/06-Student-Wallet-and-VNPay.md`.

## 1. Kết quả khảo sát

Đã đọc module ví trên nhánh `main` của hai repository do người dùng cung cấp:

- Backend: <https://github.com/NgDai/sport-bike-exchange-be>
- Frontend: <https://github.com/votranngochuu/sport-bike-exchange-fe>

VietTriTutor hiện đã có payment intent cho một lớp, VNPay redirect/IPN/return, giữ chỗ, kiểm tra trùng lịch, tạo payment/enrollment/learning schedule và hoàn tiền qua VNPay. Tài liệu hiện chưa định nghĩa ví giữ số dư, nạp ví hoặc trả học phí bằng số dư. Việc thêm ví là thay đổi nghiệp vụ cần xác nhận theo `AGENTS.md` mục 2.

## 2. Phạm vi đề xuất để xác nhận

1. Một ví VND cho mỗi học viên đã xác thực email; số dư ban đầu bằng 0.
2. Học viên nạp qua VNPay Sandbox; chỉ IPN đã xác minh mới được cộng số dư một lần. Browser return hiển thị kết quả đang được ghi nhận và đọc trạng thái từ backend.
3. Học viên xem số dư và lịch sử nạp, trả học phí, hoàn tiền có phân trang.
4. Checkout một lớp có lựa chọn dùng ví hoặc trả trực tiếp bằng VNPay. Giữ nguyên cách lấy học phí từ server và các điều kiện ghi danh hiện tại. Chưa kết hợp ví và VNPay để trả chung một khoản học phí.
5. Khi trả bằng ví, kiểm tra lại điều kiện lớp, lịch học, giá, quyền sở hữu intent và số dư; trừ ví, ghi sổ, tạo Payment/Enrollment/LearningSchedule trong cùng transaction. Thất bại phải rollback toàn bộ.
6. Hoàn tiền theo phương thức gốc và quy tắc hủy hiện hành: học phí trả bằng ví hoàn vào ví; học phí trả trực tiếp bằng VNPay tiếp tục hoàn qua VNPay. Không tự đổi các khoản VNPay cũ thành số dư ví.
7. Giai đoạn này triển khai backend và web học viên. Rút về ngân hàng, chuyển tiền giữa người dùng, ví lương gia sư và mobile cần đặc tả riêng.
8. Giới hạn nạp tối thiểu/tối đa, thời hạn giao dịch và các lựa chọn số tiền lấy từ cấu hình được backend kiểm tra; cần chốt giá trị khi chuẩn hóa tài liệu. Không chép các mức tiền mẫu từ Bike Exchange thành quy tắc mặc định.
9. Nạp ví không giữ chỗ lớp. Phải định nghĩa riêng cách xử lý khoản nạp đến muộn hoặc chưa xác định; không áp dụng máy móc trạng thái hết hạn của học phí. Mọi khoản tiền provider đã xác nhận phải được lưu và đối soát, không bị bỏ qua.

## 3. Bản đồ tái sử dụng

Các đường dẫn Bike Exchange dưới đây đều tương đối so với repository tương ứng.

| Nguồn | Cách sử dụng tại VietTriTutor |
| --- | --- |
| BE `entities/Wallet.java`, `entities/WalletTransaction.java` | Tái sử dụng ý tưởng một ví/người dùng và lịch sử số dư; đổi sang ID, FK, tên bảng và kiểu tiền theo dự án hiện tại. |
| BE `services/WalletService.java`, `services/WalletTransactionService.java` | Tham khảo nghiệp vụ ghi tăng/giảm và ghi lịch sử; triển khai với khóa chống cập nhật đồng thời, idempotency và quyền của VietTriTutor. |
| BE `controller/WalletController.java` | Tham khảo API đọc ví; không chuyển các endpoint tự cộng tiền hoặc trừ tiền theo số tiền client gửi. |
| BE `repository/IWalletRepository.java`, `repository/IWalletTransactionRepository.java` | Điều chỉnh theo user ID, phân trang và cơ chế lock/unique constraint của dự án đích. |
| FE `src/features/user/components/WalletTab.jsx` | Tái sử dụng bố cục số dư, form nạp, trạng thái tải và làm mới; chuyển sang TypeScript, UI và route học viên hiện tại. |
| FE `src/services/walletService.js` | Tái sử dụng ý tưởng gọi đọc ví/tạo giao dịch nạp; đổi sang API client và response `success/data` của VietTriTutor. |
| BE `controller/PaymentController.java`, `services/VNPayService.java` | Chỉ tham khảo cách liên kết thao tác nạp; ưu tiên mở rộng lớp VNPay hiện có của VietTriTutor, tránh tạo hai bộ xác minh callback. |

Tiền tố package backend nguồn: `src/main/java/com/bicycle/marketplace/`.

## 4. Những điểm cần sửa khi chuyển

- `Wallet.balance`, `WalletTransaction.amount/balance` và các phương thức ví nguồn dùng `double`. Dự án đích cần dùng `BigDecimal`/`NUMERIC` nhất quán, kiểm tra số VND hợp lệ và không cho số dư âm.
- `WalletController` nguồn có `PUT /wallet/add` gọi cộng tiền theo body và `PUT /wallet/withdraw` chỉ trừ số dư. Đây không phải luồng nạp qua VNPay hoặc chi tiền về ngân hàng cần chuyển sang.
- `PaymentController` nguồn gọi `addFundsToUserWallet` từ các handler return. Hàm cộng tiền không nhận reference để kiểm tra một giao dịch đã được ghi nhận trước đó. Luồng mới cần top-up intent lưu trước, reference duy nhất, số tiền/chủ ví cố định và chống callback lặp ở database.
- `IWalletRepository` nguồn chưa khai báo truy vấn khóa ví; thêm transaction đơn thuần chưa đủ chống mất cập nhật khi nhiều giao dịch cùng chạy.
- `walletService.js`/`WalletTab.jsx` nguồn gọi endpoint return và thông báo đã nạp ngay sau request. UI mới phải dựa trên trạng thái đã lưu; không dùng cờ `useRef` trên browser để thay cho chống ghi nhận lặp ở server.
- `PaymentController` nguồn có domain/cổng fallback cụ thể và nhận return URL từ client. Dự án đích phải dùng origin được cho phép, fallback môi trường đã sanitize và không chép cấu hình/credentials nguồn.
- Không mang nghiệp vụ đặt cọc xe, phí đăng bài, ví tài khoản `System`, phí sự kiện hoặc giao dịch mua bán xe sang nghiệp vụ trung tâm gia sư.

## 5. Tài liệu và thiết kế cần hoàn tất sau khi được xác nhận

- Functional requirements, ma trận quyền và business rules cho ví học viên, nạp, thanh toán và hoàn tiền.
- Mô hình conceptual/logical/physical: đề xuất `wallets`, `wallet_topup_intents`, `wallet_transactions`; liên kết với user/payment/refund hiện có. Chốt unique keys, CHECK constraints, FK và migration trước khi code.
- API và UI flow: đọc ví, lịch sử phân trang, tạo/đọc top-up, VNPay IPN/return cho top-up, trả payment intent bằng ví và hoàn tiền đúng nguồn. Các endpoint cụ thể chỉ trở thành contract sau khi cập nhật tài liệu.
- Cơ chế phân biệt reference nạp ví và học phí; chủ sở hữu lấy từ session backend, không lấy từ chuỗi mô tả hoặc body tùy ý.
- Thứ tự khóa nhất quán với luồng thanh toán hiện tại; chống cùng intent được thanh toán bằng hai phương thức; ghi số dư và ledger atomically; tổng hoàn không vượt khoản đã thu.
- Cấu hình môi trường và VNPay Sandbox setup cho callback nạp; không lộ secret ra frontend hoặc log.
- Đồng bộ các đoạn flow/model cũ còn dùng tên bảng hoặc cách tính giá khác với contract fixed-price hiện tại khi sửa tài liệu liên quan.

## 6. Nghiệm thu dự kiến

- Nạp hợp lệ cộng đúng một lần; sai chữ ký/merchant/reference/amount, callback trùng hoặc query parameter trùng không làm sai số dư.
- Return không cộng tiền; đóng browser, reload hoặc đăng nhập lại vẫn đọc được trạng thái nạp.
- Hai giao dịch ví đồng thời không làm mất cập nhật hoặc âm số dư; retry cùng key không trừ/cộng lặp.
- Một payment intent chỉ được thu một lần kể cả khi cạnh tranh giữa ví và VNPay.
- Không đủ số dư, lớp đầy, trùng lịch, sai giá hoặc hết hạn không sinh enrollment và không mất tiền ví.
- Hoàn tiền đúng nguồn, đúng tỷ lệ đã được phép, không hoàn lặp hoặc vượt số đã thu.
- Test tự động dùng database riêng và gateway fixture; nghiệm thu giao dịch Sandbox thật cần merchant hợp lệ và IPN public của đúng backend/database.

Khảo sát này là đọc tĩnh source code và tài liệu. Chưa chạy test hoặc giao dịch Sandbox vì chưa có phần triển khai ví được duyệt.
