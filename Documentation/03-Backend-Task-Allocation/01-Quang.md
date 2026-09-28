# Giao việc Backend — Quang

Quang phụ trách tài khoản, danh mục/lớp, giao dịch học phí và bảng lương. **55 SP cốt lõi + 21 SP mở rộng ERD = 76 SP**. Đọc [quy ước, quyết định dữ liệu và contract chung](00-Tong-quan-phan-cong.md) trước triển khai; phối hợp với [Hữu](02-Huu.md).

## 1. Q01 — Tài khoản, profile và nền tảng chung (8 SP)

**Business Process:** khách đăng ký → tài khoản Student → đăng nhập nhận JWT → cập nhật profile; Admin tạo gia sư → nhập hợp đồng/đơn giá → gia sư đăng nhập. Liên quan FR-AUTH-01/02/03.

- [ ] Rà soát và bổ sung test login/register đã có; public register luôn ROLE_STUDENT, không cho body nâng quyền.
- [ ] Map TutorProfile/StudentProfile theo V1: PK profile đồng thời FK users.id; tạo user/profile trong cùng transaction.
- [ ] User list có filter role/search; profile cá nhân chỉ sửa trường được phép. Lương/đơn giá chỉ Admin sửa, không đi qua PUT /me.
- [ ] Chuẩn hóa 401/403, duplicate email khi hai request đồng thời, password không xuất hiện trong DTO/log.
- [ ] Duy trì ApiResponse, PageResponse, error registry, security route/method, OpenAPI nền tảng.

| ID | API | Quyền | Input chính → Output | Nguồn |
|---|---|---|---|---|
| Q-A01 | POST `/auth/login` | Public | email,password → accessToken,user | Có code |
| Q-A02 | POST `/auth/register` | Public | email,password,fullName → accessToken,user | Có code |
| Q-A03 | GET `/me` | U | JWT → hồ sơ của mình | Spec |
| Q-A04 | PUT `/me` | U | fullName,phone,address/bio theo role → hồ sơ | Spec |
| Q-A05 | GET `/admin/users` | A | role,search,page,size → page user | Spec |
| Q-A06 | POST `/admin/users/tutors` | A | email,password,fullName,baseSalary,sessionRate,bio → tutor | Spec |
| Q-A07 | PUT `/admin/users/{userId}/tutor-profile` | A | baseSalary,sessionRate,bio → profile | Spec |

**Nghiệm thu:** register gửi role ADMIN vẫn không được nâng quyền; email trùng trả lỗi; Student không gọi API Admin; T/S không đọc profile nhạy cảm của người khác; lỗi đăng nhập không lộ password. Có source hiện tại không có nghĩa Q01 được tính làm mới toàn bộ.

## 2. Q02 — Danh mục, giá và vòng đời lớp (13 SP)

**Business Process:** Admin tạo Subject/Course → tạo lớp DRAFT → công bố → gọi Hữu sinh lịch → mở ENROLLING → chốt sĩ số → phân công → IN_PROGRESS → COMPLETED. Liên quan FR-CRS-01/02/03, FR-SCH-01/04, BR-02/03/04.

- [ ] Subject là môn; Course chứa chương trình, tổng buổi, giá theo hình thức/cấp học; ClassGroup chứa loại lớp, pattern, slot, ngày/hạn đăng ký.
- [ ] 1-1 min=max=1; nhóm min=2/max=8; deadline mặc định trước khai giảng 3 ngày. FULL là cờ suy ra, không trạng thái mới.
- [ ] PricingService dùng giá server và snapshot phí; bậc 2–3:20%, 4–5:35%, 6–8:40%, 1-1:0%. Chốt riêng giá người đầu tiên của nhóm theo mục quyết định chung.
- [ ] Công bố gọi `ensureGenerated`, thất bại rollback; không nhận tiền nếu chưa ENROLLING/không đủ lịch.
- [ ] Không cho PATCH status bỏ qua payment/assignment; sau có enrollment không đổi hình thức. Không sửa giá snapshot đã thu.
- [ ] Job đến hạn: nhóm 0 người CANCELLED, 1 người FAILED_TO_OPEN; ≥2 chờ Admin gán gia sư. Job chạy lại không xử lý lặp.
- [ ] FAILED_TO_OPEN: mở lại với ngày mới qua dịch vụ kiểm tra lịch của Hữu; hoặc hoàn tiền; chuyển 1-1 cần đồng ý học viên và quyết định chênh lệch phí, không tự thu thêm.
- [ ] Hủy lớp có học viên gọi refund orchestration và hủy buổi qua service Hữu, không xóa bảng liên quan.

| ID | API | Quyền | Input chính → Output | Nguồn |
|---|---|---|---|---|
| Q-A08 | POST `/admin/courses` | A | name,subjectId,gradeLevel,basePrice1on1,deliveryMode,totalSessions → course | Spec; subjectId/giá cần đồng bộ DTO |
| Q-A09 | GET `/admin/courses` | A | search,active,page,size → page course | Spec |
| Q-A10 | PUT `/admin/courses/{courseId}` | A | trường course được sửa → course | Spec |
| Q-A11 | PATCH `/admin/courses/{courseId}/toggle` | A | active mong muốn → course | Spec; đề xuất set giá trị để retry an toàn |
| Q-A12 | POST `/admin/classes` | A | courseId,classType,deliveryMode,pattern,slot,startDate,deadline → lớp DRAFT | Spec |
| Q-A13 | PATCH `/admin/classes/{classId}/status` | A | status,reason → lớp sau chuyển | Spec |
| Q-A14 | GET `/admin/classes` | A | courseId,status,page,size → page lớp | Spec |
| Q-A15 | GET `/catalog/classes` | U | subjectId,gradeLevel,mode,pattern,page,size → lớp mở và giá dự kiến | Spec |
| Q-A16 | GET `/catalog/classes/{classId}` | U | classId → lớp,lịch,giá,còn chỗ | Spec |
| Q-A17 | POST `/admin/subjects` | A | code,name → subject | Mới, ERD |
| Q-A18 | PUT `/admin/subjects/{subjectId}` | A | name,active → subject | Mới, ERD |
| Q-A19 | GET `/subjects` | U | active,search,page,size → subject page | Mới, ERD |
| Q-A20 | POST `/admin/classes/{classId}/reopen` | A | startDate,deadline → lớp/lịch mới sau kiểm tra | Mới, bổ sung FR-SCH-04 |
| Q-A21 | POST `/admin/classes/{classId}/convert-to-one-on-one` | A | consentReference,feeResolution → lớp và kết quả xử lý phí | Mới, bổ sung FR-SCH-04 |

**Nghiệm thu:** trạng thái không hợp lệ trả 422; lớp 1-1 không nhận người thứ hai; nhóm không quá 8; catalog không lộ lớp DRAFT; không thay đổi giá đã thu; mở lại lớp không tạo hai bộ lịch active; conversion thiếu chứng cứ đồng ý bị chặn.

## 3. Q03 — Thanh toán, ghi danh, hủy và hoàn tiền (21 SP)

**Business Process:** chọn lớp → kiểm tra quyền/trạng thái/sĩ số/lịch → tạo payment intent → thanh toán mock thành công → kiểm tra lại và tạo Enrollment ACTIVE → cấp quyền học. Khi hủy hợp lệ → hoàn tiền → giảm sĩ số đúng một lần. FR-SCH-02, FR-FIN-01, BR-02.01–33.

### Các việc cần làm

- [ ] Tách payment intent khỏi Enrollment ACTIVE. BR yêu cầu chỉ ghi danh khi trả tiền thành công; đặc tả cũ mâu thuẫn ở điểm này.
- [ ] Giai đoạn một lớp: payment intent lưu student,class,amount,status,expiresAt,idempotencyKey; thất bại/hết hạn không tạo Enrollment.
- [ ] Giai đoạn Order: intent thuộc Order, tái sử dụng cùng nghiệp vụ; bổ sung FK/migration, không duy trì hai nguồn số dư.
- [ ] Check trùng lịch học viên qua engine Hữu và danh sách enrollment mình cung cấp; kiểm tra lại khi xác nhận trả tiền.
- [ ] Tạo ACTIVE và tăng sĩ số trong một transaction có khóa lớp + học viên; unique enrollment active, unique payment reference, unique nguồn OrderItem.
- [ ] Giá hết hiệu lực phải báo giá mới, không âm thầm thay số tiền đã được người dùng đồng ý. Mock xác nhận chỉ có hiệu lực trong môi trường demo/test.
- [ ] Mock failure/retry không thu tiền thật. Nếu sau này có gateway: server xác minh chữ ký/amount/order; không dùng success flag do client gửi làm chứng cứ trả tiền.
- [ ] Hủy trước deadline và chưa ASSIGNED hoàn 100%; FAILED_TO_OPEN hoặc Admin hủy trước khai giảng hoàn 100%; ngoại lệ sau ASSIGNED cần Admin và lý do.
- [ ] Lưu refund transaction/audit; unique yêu cầu refund, không hoàn vượt số đã thu; không xóa payment/enrollment.
- [ ] Cung cấp EnrollmentQuery; không cho lịch/attendance/homework thấy intent chưa trả tiền.

### API và xử lý đặc tả cũ

Luồng mới dưới đây thay cặp tạo enrollment/pay trước đây. Quang cập nhật OpenAPI/FE cùng PR. Nếu phải giữ tương thích, giữ adapter mỏng và đánh deprecated; không tạo ACTIVE sớm để giữ nguyên response cũ.

| ID | API | Quyền | Input chính → Output | Nguồn |
|---|---|---|---|---|
| Q-A22 | POST `/payment-intents` | S | classGroupId + Idempotency-Key → intentId,amount,status,expiresAt | Thay thế POST `/enrollments` |
| Q-A23 | POST `/payment-intents/{intentId}/confirm-mock` | S sở hữu | Idempotency-Key → payment,ACTIVE enrollment | Thay thế POST `/enrollments/{enrollmentId}/pay` |
| Q-A24 | GET `/enrollments/my` | S | status,page,size → enrollment của mình | Spec |
| Q-A25 | DELETE `/enrollments/{enrollmentId}` | S sở hữu | reason → trạng thái hủy/hoàn | Spec |
| Q-A26 | POST `/admin/enrollments/{enrollmentId}/refund` | A | reason,refundPercentage + key → refund | Spec; server kiểm tra mức được phép |
| Q-A27 | GET `/admin/payments` | A | status,from,to,page,size → giao dịch | Mới, bổ sung FR-FIN-01 |
| Q-A28 | GET `/payments/{paymentId}` | A hoặc S sở hữu | paymentId → payment/status/refund | Mới |
| Q-A29 | GET `/admin/classes/{classId}/enrollments` | A | status,page,size → học viên ghi danh | Mới |

**Test bắt buộc:** trả tiền thất bại không ghi danh; pay lặp trả cùng kết quả; hai request tranh chỗ cuối chỉ một thành công; một học viên đồng thời trả hai lớp trùng giờ không có hai enrollment xung đột; hủy/refund lặp không giảm sĩ số hai lần; sửa amount phía client không ảnh hưởng giá server; sai chủ sở hữu trả 403/404 theo quy ước chung.

## 4. Q04 — Bảng lương gia sư (8 SP)

**Business Process:** lấy buổi COMPLETED hợp lệ từ Hữu → nhóm theo actualTutor và tháng thực dạy → preview → Admin finalize → Tutor xem bảng của mình. FR-FIN-02, BR-02.40–46.

- [ ] Công thức theo BR hiện tại: baseSalary + completedSessions × sessionRate; completedSessions chỉ gồm buổi thực dạy hợp lệ của gia sư. Thống kê cả CANCELLED để đối soát số buổi không dạy, nhưng không trừ CANCELLED thêm khỏi completedSessions.
- [ ] Bảng lương hiển thị buổi được phân công, buổi thực dạy COMPLETED, buổi CANCELLED, buổi người khác dạy thay và buổi chưa chốt. Lưu lý do hủy/người dạy dự kiến tại thời điểm hủy để quy đúng gia sư; CANCELLED không tự đồng nghĩa gia sư có lỗi.
- [ ] Dạy thay chỉ tính cho người thực dạy. Buổi gốc hủy không tính; buổi bù tính theo ngày thực dạy.
- [ ] Snapshot baseSalary,rate,session IDs và tổng tiền khi finalize; unique(year,month), unique(period,tutor), chi tiết session không lặp.
- [ ] GET preview chỉ đọc/tính, không tạo dữ liệu như tác dụng phụ; job cuối tháng có thể chuẩn bị DRAFT, chỉ Admin finalize.
- [ ] Chặn chỉnh dữ liệu dạy ảnh hưởng kỳ FINALIZED; thay đơn giá sau chốt không làm đổi số cũ. Chính sách thay đơn giá giữa tháng cần chốt trước tính lương thật.

| ID | API | Quyền | Input chính → Output | Nguồn |
|---|---|---|---|---|
| Q-A30 | GET `/admin/payroll/{year}/{month}` | A | kỳ hợp lệ → preview/bảng đã chốt,chi tiết | Spec |
| Q-A31 | POST `/admin/payroll/{year}/{month}/finalize` | A | Idempotency-Key → FINALIZED payroll | Spec |
| Q-A32 | GET `/tutor/payroll` | T | year,month,page,size → lương của mình | Spec |

**Nghiệm thu:** kế hoạch 10 buổi, thực dạy 8 COMPLETED và 2 CANCELLED, đơn giá 200.000đ → tiền buổi = 1.600.000đ; báo cáo vẫn hiển thị 2 buổi hủy, không tính `(8 − 2) × 200.000`. Buổi dạy thay trả cho người thực dạy; buổi bù tính tháng thực dạy, buổi gốc hủy không được tính lần nữa. Finalize lặp không sinh hai kỳ; Tutor chỉ xem lương mình. Theo BR hiện có, lương cứng vẫn giữ nếu 0 buổi; nếu nhóm muốn trừ lương cứng hoặc phạt nghỉ thì cần bổ sung chính sách riêng, chưa mặc định áp dụng.

**Hai cách diễn đạt cùng một phép tính:** nếu kỳ đã kết thúc và 10 buổi chỉ gồm 8 buổi thực dạy cùng 2 buổi hủy, có thể tính từ tổng dự kiến: `(10 − 2) × đơn giá`, hoặc từ kết quả thực tế: `8 × đơn giá`. Khi có buổi chưa chốt, dạy thay, buổi bù qua tháng, không được lấy tổng phân công trừ mỗi CANCELLED rồi coi phần còn lại đều đã dạy. Nguồn trả tiền cuối cùng vẫn là các buổi COMPLETED hợp lệ theo người thực dạy.

## 5. Q06/Q07 — Cart, Order, checkout nhiều lớp và đối soát (21 SP)

**Mở rộng từ ảnh ERD; API/trường/state sau đây là đề xuất.** Logical model gửi bổ sung dùng `CartItem.subject_id`, còn `OrderItem.class_id`. Vì vậy cart hiện chọn môn; trước checkout phải chọn lớp cụ thể cho từng môn và kiểm tra lớp thuộc môn đó. Baseline cũ cart chọn thẳng lớp ở các checklist/API dưới đây là phương án thay đổi schema, không phải cấu trúc đã có trong ảnh. Xem [đối chiếu logical model](00-Tong-quan-phan-cong.md#10-đối-chiếu-logical-model-gửi-bổ-sung).

**Business Process:** thêm lớp vào cart → kiểm tra và báo giá → checkout tạo Order/OrderItem snapshot → mock pay → Enrollment cho từng item → cart bỏ các item đã mua → xem lịch sử. Đơn nhiều lớp dùng nguyên tắc tất cả thành công hoặc không lớp nào được ghi danh.

- [ ] Unique cart theo student, unique(cart,class); không thêm lớp đã ghi danh; kiểm tra cả trùng giữa các lớp trong cùng cart.
- [ ] Theo logical model mới: `Orders.student_id` là owner; `Orders.total_amount` là total; đã có `status`, `created_at`. `OrderItem.class_id` xác định lớp, `OrderItem.unit_price` lưu giá chốt của lớp tại lúc đặt. `currency`, `expires_at`, `idempotency_key`, giá gốc và tỷ lệ giảm là cột đề xuất bổ sung, không phải cột đang có trong ảnh; nếu chỉ VND có thể quy định currency ở cấp hệ thống.
- [ ] “Snapshot giá” nghĩa là lưu giá giao dịch vào `OrderItem.unit_price`; không đọc giá Class hiện tại để tính lại đơn cũ. `class_id` chỉ là tham chiếu lớp, không phải snapshot toàn bộ lớp. Muốn giữ tên/mã lớp tại lúc mua thì bổ sung trường snapshot riêng.
- [ ] “Tổng do server tính”: client gửi môn/lớp được chọn; backend lấy `Class.tuition_fee` hoặc áp dụng PricingService đã thống nhất, tính giá từng item, lưu `unit_price`, rồi cộng thành `Orders.total_amount`. Không nhận tổng/discount từ client làm số tiền phải thu. Nếu `tuition_fee` đã là giá cuối thì không giảm giá lần nữa.
- [ ] Ví dụ lớp A giá 1.000.000đ và lớp B giá 1.500.000đ: backend lưu hai unit_price đó và total_amount=2.500.000đ. Client gửi total=1đ không làm thay đổi số tiền. Sau này lớp A tăng giá, đơn đã chốt vẫn giữ unit_price=1.000.000đ.
- [ ] Order state đề xuất PENDING_PAYMENT → PAID hoặc EXPIRED/CANCELLED; sau hoàn dùng PARTIALLY_REFUNDED/REFUNDED. Payment giữ các lần thử, chỉ một lần thành công hợp lệ cho cùng nghĩa vụ thu.
- [ ] Không giữ chỗ trong MVP: pre-check checkout chỉ tham khảo; khi confirm khóa toàn bộ lớp theo ID, kiểm tra lại giá/chỗ/lịch và tạo tất cả enrollment atomically. Nếu thiếu chỗ trả 409, mock không ghi thành công.
- [ ] Nếu làm cổng tiền thật sau này: phải bổ sung giữ chỗ/expiry hoặc quy trình hoàn bù khi tiền đã thu nhưng không ghi danh; không coi rollback DB là hoàn tiền ngoài hệ thống.
- [ ] Retry checkout/pay/cancel/refund có kết quả ổn định; đối soát `paid order items ↔ enrollments`, tiền thu/trả và sĩ số. Lưu error/audit để truy lỗi, không log bí mật.
- [ ] Hoàn một item không hủy enrollment khác cùng Order; xử lý lớp hủy hàng loạt theo item.

| ID | API | Quyền | Input chính → Output | Nguồn |
|---|---|---|---|---|
| Q-A33 | GET `/cart` | S | JWT → cart,items,giá dự kiến,cảnh báo | Mới ERD |
| Q-A34 | POST `/cart/items` | S | classGroupId → cart item | Mới ERD |
| Q-A35 | DELETE `/cart/items/{itemId}` | S sở hữu | itemId → cart cập nhật | Mới ERD |
| Q-A36 | DELETE `/cart/items` | S | JWT → cart rỗng | Mới ERD |
| Q-A37 | POST `/orders/checkout` | S | cartVersion + Idempotency-Key → order,items,total,expiry | Mới ERD |
| Q-A38 | GET `/orders/my` | S | status,page,size → order page | Mới ERD |
| Q-A39 | GET `/orders/{orderId}` | A/S sở hữu | id → order,items,payments,enrollments | Mới ERD |
| Q-A40 | POST `/orders/{orderId}/payments/mock` | S sở hữu | key → payment,order,enrollment IDs | Mới ERD |
| Q-A41 | POST `/orders/{orderId}/cancel` | S sở hữu | reason → hủy đơn chưa trả | Mới ERD |
| Q-A42 | GET `/admin/orders` | A | studentId,status,from,to,page,size → order page | Mới ERD |

**Nghiệm thu:** 2 lớp hợp lệ → 1 order/2 items/2 enrollments; một lớp hết chỗ → không ghi danh lớp nào; hai lớp trùng nhau trong cart bị chặn; checkout lặp không tạo nhiều đơn; cart thay đổi sau tạo order không đổi snapshot; hoàn một item đúng số tiền và giữ item còn lại.

## 6. Q05 — Bàn giao, phụ thuộc và checklist (5 SP)

**Giao sớm cho Hữu:** user IDs/roles, ClassSchedulingSpec, EnrollmentQuery DTO, các enum lớp, ClassLifecycle interface. **Nhận từ Hữu:** SessionGenerator, ScheduleQuery, ConflictService, TeachingQuery. Quang chịu transaction checkout/ghi danh; Hữu chịu thuật toán conflict dùng chung.

**Thứ tự:** Q01 → khung Q02 → Q03 song song H02/H03 → Q04 sau contract buổi hợp lệ → Q06/Q07. Seed tối thiểu: 1 Admin, 2 Tutor, 3 Student, lớp 1-1/nhóm, lớp hai ca tối trùng, giao dịch thành công/thất bại/hoàn.

- [ ] Entity/constraint/index/migration module mình; không tự đổi bảng sessions của Hữu.
- [ ] Unit test pricing/refund/payroll; integration test transaction và quyền; PostgreSQL test cạnh tranh chỗ/lịch.
- [ ] OpenAPI cho **42 method/path** ở bảng trên, gồm 2 có code cần rà soát; không tính hai API cũ đã thay thế thành chức năng mới riêng.
- [ ] Cập nhật các ví dụ cũ tạo ACTIVE trước payment và ghi rõ thay đổi contract cho FE.
- [ ] Demo từ đăng nhập đến thanh toán/hoàn/lương; cung cấp collection hoặc HTTP examples có dữ liệu tái tạo.
- [ ] PR được Hữu review tại ranh giới schedule/teaching; báo cáo test thực chạy và phần chưa chạy.

42 endpoint là cách nhóm công việc, không phải thước đo độ khó; cân bằng với Hữu theo 76 SP/người.
