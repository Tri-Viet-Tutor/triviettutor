# Phân công Backend — Quang & Hữu

Ngày lập: 28/09/2026. Phạm vi: Business Process, database, service, API, kiểm thử và tích hợp. Đây là kế hoạch triển khai, không phải báo cáo các chức năng đã hoàn thành.

**Cập nhật sau khi nhận logical model bổ sung:** xem mục 10. Những khác biệt được ghi ở mục 10 thay cho giả định đọc từ ảnh khái niệm trước đó; các API vẫn là kế hoạch đề xuất, chưa phải contract đã chốt với database mới.

## 1. Kết quả phân công

| Thành viên | Trách nhiệm xuyên suốt | Tài liệu giao việc |
|---|---|---|
| **Quang** | Tài khoản → danh mục/lớp → giỏ hàng/đơn hàng → thanh toán/ghi danh/hoàn tiền → bảng lương | [01-Quang.md](01-Quang.md) |
| **Hữu** | Chủ đề → sinh lịch → lịch rảnh/phân công → nghỉ/bù/thay → điểm danh → bài tập/nộp bài/chấm bài | [02-Huu.md](02-Huu.md) |

Mỗi người sở hữu cả Entity, Repository, DTO, Service, Controller, migration và test của phần được giao. Người còn lại review các thay đổi ảnh hưởng liên module. Không chia một người chỉ CRUD và một người làm toàn bộ nghiệp vụ khó.

## 2. Căn cứ và hiện trạng

- [Yêu cầu chức năng](../00-Product-Definition/01-Functional-Requirements.md), [luồng nghiệp vụ](../00-Product-Definition/05-Main-Business-Flows.md).
- [BR học phí/lương](../01-Business-Logic/02-Pricing-and-Subscription-Rules.md), [BR lịch/phân công](../01-Business-Logic/03-Scheduling-and-Conflict-Validation.md), [BR điểm danh](../01-Business-Logic/04-Matching-and-Class-Management.md).
- [Đặc tả API hiện tại](../02-System-Architecture/02-Backend-Architecture-and-API-Specification.md), [logical model](../00-Product-Definition/03-Logical-Data-Model.md), [physical model](../00-Product-Definition/04-Physical-Data-Model.md).
- Source thực tế có `AuthController` với login/register, JWT, `User`, response/error framework và migration V1 tạo `users`, `tutor_profiles`, `student_profiles`. Chưa thấy controller nghiệp vụ khác hoặc migration sau V1 trong `backend/src`. Không mặc định nhãn DONE trong tài liệu nghĩa là đã kiểm thử.
- Ảnh ERD đính kèm có Student, Tutor, Subject, Topics, Class, Session, LearningSchedule, TutorAssignment, TutorAvailability, Cart, CartItem, Order, OrderItem, Payment, Enrollment, Homework, Submission. Ảnh thể hiện quan hệ khái niệm, không đủ cột, khóa và constraint để coi là DDL đã triển khai.

Kế hoạch bao phủ cả nghiệp vụ trong repository và thực thể trong ảnh. Phần chỉ có trong ảnh được đánh dấu **mở rộng ERD**, các endpoint mới là **đề xuất**. Không suy diễn rằng các bảng đó đã tồn tại trong database đang chạy.

## 3. Cân bằng khối lượng

SP là điểm ước lượng tương đối gồm thiết kế, code, migration, test, tích hợp; không phải ngày công. Hai người được giả định có năng lực/thời gian tương đương. Chấm lại sau vòng đầu khi biết tốc độ thực tế.

| Quang | SP | Hữu | SP |
|---|---:|---|---:|
| Q01 Auth, profile, phân quyền, nền tảng chung | 8 | H01 SessionGenerator, lịch học, vòng đời buổi | 13 |
| Q02 Subject/Course/Class, giá, vòng đời lớp | 13 | H02 Availability, assignment, conflict engine | 13 |
| Q03 Ghi danh, thanh toán, hủy/hoàn tiền | 21 | H03 Xin nghỉ, buổi bù, dạy thay | 13 |
| Q04 Bảng lương | 8 | H04 Điểm danh, khóa tự động | 8 |
| Q05 Tích hợp, seed, kiểm thử phần phụ trách | 5 | H05 Tích hợp, seed, kiểm thử phần phụ trách | 8 |
| **Cốt lõi repository** | **55** | **Cốt lõi repository** | **55** |
| Q06 Cart/Order và checkout nhiều lớp | 13 | H06 Topics, gắn nội dung buổi học | 5 |
| Q07 Gia cố retry, đồng thời, đối soát đơn | 8 | H07 Homework, Submission, chấm bài | 16 |
| **Tổng toàn phạm vi** | **76** | **Tổng toàn phạm vi** | **76** |

Subject được đưa vào Q02 để đáp ứng ảnh ERD; là bổ sung schema so với repository. Q03 làm luồng một lớp trước; Q06 tái sử dụng dịch vụ thanh toán/ghi danh đó cho nhiều lớp. Không xây hai hệ thống thanh toán độc lập. Nếu bỏ phần mở rộng, hai người vẫn cân bằng ở 55 SP/người.

## 4. Những khác biệt cần chốt trước migration liên quan

Các lựa chọn dưới đây là baseline đề xuất để phân công có thể triển khai. Hai BE ghi lại quyết định vào PR thiết kế; không xem đây là yêu cầu đã được nhóm xác nhận.

| Vấn đề | Baseline đề xuất | Người chốt thiết kế |
|---|---|---|
| `Class` / `classes` / `class_groups` | Dùng `ClassGroup` / `class_groups` theo đặc tả API; path giữ `/classes` | Quang |
| Subject và Course | Subject là môn; Course là chương trình/số buổi/giá; Class thuộc Course. Không xóa Course chỉ vì ảnh không có | Quang |
| Topics và Session | Topic thuộc Subject; đề xuất một Session có một Topic nullable. Nếu một buổi nhiều chủ đề, thay bằng bảng nối trước khi code | Hữu |
| LearningSchedule và Session trùng ý nghĩa | Đề xuất LearningSchedule là mẫu lịch của lớp; Session là lần học cụ thể. Chỉ tách bảng nếu cần; không lưu thêm bản sao lịch từng học viên | Hữu |
| Payment chỉ FK Enrollment nhưng BR yêu cầu trả tiền trước ghi danh | Khi dùng Order: Payment thuộc Order; chỉ tạo Enrollment sau thành công, liên kết duy nhất OrderItem → Enrollment. Giai đoạn một lớp dùng payment intent riêng, không tạo ACTIVE trước trả tiền | Quang |
| API cũ tạo ACTIVE khi Payment PENDING | Sửa contract trước tích hợp FE; không tăng sĩ số, cấp quyền học khi chưa trả tiền | Quang |
| `FULL` không nằm trong enum lớp | Dùng cờ suy ra `currentStudents >= maxStudents`, không thêm trạng thái FULL | Quang |
| PUBLISHED có được trả tiền? | Theo BR-04.01: chỉ ENROLLING nhận thanh toán; PUBLISHED chỉ để xem | Quang |
| Sinh buổi khi công bố hay mở ghi danh | Sinh idempotent khi PUBLISHED để xem trước lịch; khi ENROLLING kiểm tra đủ buổi, không sinh lặp | Hữu |
| Giá người đầu tiên trong GROUP chưa có bậc | Cần quyết định nhóm; tạm đề xuất bậc 20% cho người đầu để có thể khởi tạo lớp. Đây là giả định, không phải BR hiện có | Quang |
| Học viên nhóm xin nghỉ làm dừng cả buổi trong API cũ | Áp dụng ngoại lệ BR-03 mục 5.3: buổi vẫn dạy; chỉ ghi nhận nghỉ cá nhân | Hữu |
| ABSENT hay EXCUSED khi nghỉ có phép | Đề xuất EXCUSED khi Admin chấp thuận và báo trước ≥24h theo BR-04.32; cần thống nhất với BR-03 | Hữu |
| Khóa sau 24h có tự tính lương mọi buổi? | Chỉ COMPLETED nếu có bằng chứng gia sư đã dạy/điểm danh; không biến buổi bị hủy hoặc không dạy thành có lương | Hữu |
| Dạy thay và buổi bù thiếu dấu vết DB | Có `actual_tutor_id`, lịch sử thay người và `original_session_id` cho buổi bù; không sửa lịch sử buổi đã dạy | Hữu |
| Grade/cấp học, đơn giá theo hình thức | Chốt cấp 1/2/3 hay lớp 1–12; giá phải phân biệt Online/Offline theo BR-02.03 | Quang |
| Chốt lương khác enum giữa tài liệu | Baseline `DRAFT → FINALIZED`; snapshot số tiền và các buổi nguồn | Quang |

MVP dùng mock payment và meeting URL, điểm danh thủ công. Cổng tiền thật, video SDK, điểm danh tự động 70%, notification ngoài hệ thống không nằm trong 76 SP/người. Bài tập MVP dùng nội dung/link, không mặc định có hệ thống upload file.

## 5. Quyền sở hữu dữ liệu

| Nhóm bảng / thực thể | Owner ghi dữ liệu | Bên kia sử dụng |
|---|---|---|
| users, student_profiles, tutor_profiles | Quang | Hữu đọc người dùng/role; không trả lương trong roster |
| subjects, courses, class_groups | Quang | Hữu đọc cấu hình; chuyển trạng thái lớp qua service Quang |
| cart, cart_items, orders, order_items, payment intents/payments, enrollments, refunds | Quang | Hữu lấy danh sách học viên ACTIVE qua contract |
| payroll_periods, payroll_lines, chi tiết buổi tính lương | Quang | Hữu cung cấp buổi hợp lệ/actual tutor |
| topics, learning schedule nếu tách bảng, sessions | Hữu | Quang đọc lịch để catalog, ghi danh, tính lương |
| tutor_availability, assignments, lịch sử dạy thay, leave_requests | Hữu | Quang đọc phân công để kiểm tra trạng thái/hủy |
| attendance_records, homework, submissions | Hữu | Quang đọc kết quả hoàn tất buổi để tính lương |

Quang sở hữu `common/api`, error registry, SecurityConfig và profile. Hữu sở hữu TimeOverlap, conflict engine, scheduler buổi/điểm danh. Mỗi người cập nhật OpenAPI và test module mình; sửa file chung bằng PR nhỏ có review.

Migration V1 đã có: không sửa checksum trên DB đã chạy. Đề xuất phân version sau khi kiểm tra nhánh chung: V2 Quang (profile/catalog), V3 Hữu (sessions/assignment/availability/leave), V4 Quang (payment/enrollment), V5 Hữu (attendance), V6 Quang (payroll), V7 Quang (cart/order và chuyển FK payment), V8 Hữu (topics/homework/submission). Đây là lịch mới thay cho bảng migration dự kiến trong API spec, không phải các file đã tồn tại. Hữu chịu migration bổ sung model schedule; Quang chịu migration chuyển payment intent sang Order nếu triển khai theo giai đoạn. Không đổi số migration đã merge/applied.

## 6. Contract phối hợp bắt buộc

Đây là lời gọi service trong một Spring Boot monolith, không cần tách microservice hoặc gọi HTTP nội bộ.

| Contract đề xuất | Bên cung cấp | Bên gọi | Đảm bảo |
|---|---|---|---|
| `UserQuery.getTutor(id)` | Quang | Hữu | Tutor hợp lệ; DTO không chứa mật khẩu |
| `ClassQuery.getSchedulingSpec(classId)` | Quang | Hữu | Pattern, slot, startDate, totalSessions, mode, state |
| `ClassLifecycle.markAssigned/complete(...)` | Quang | Hữu | Validate transition; cùng transaction với thao tác liên quan |
| `ScheduleService.ensureGenerated(classId)` | Hữu | Quang | Đủ N buổi, gọi lại không trùng |
| `ScheduleQuery.listClassSessions(classId)` | Hữu | Quang | Lịch thực tế sau dời/bù; loại buổi hủy khi check conflict |
| `ConflictService.checkStudent/checkTutor(...)` | Hữu | Quang/Hữu | Cùng thuật toán giao nhau; không đủ nếu chỉ check mà không khóa khi ghi |
| `EnrollmentQuery.listActiveStudents(classId)` | Quang | Hữu | Chỉ người đã trả tiền và ghi danh còn hiệu lực |
| `TeachingQuery.completedSessions(tutorId,month)` | Hữu | Quang | Actual tutor, thời gian, bằng chứng dạy, ID duy nhất; không tính đôi buổi gốc và bù |
| `PayrollGuard.assertSessionEditable(sessionId)` | Quang | Hữu | Ngăn thay đổi dữ liệu lương đã FINALIZED hoặc yêu cầu quy trình điều chỉnh riêng |

Transaction phối hợp: cấp chỗ/ghi danh khóa lớp và học viên; gán/dời lịch khóa gia sư và học viên liên quan. Hai người thống nhất thứ tự khóa theo loại tài nguyên rồi ID tăng dần; kiểm tra lại conflict trong transaction. Nhờ vậy hai request đồng thời không cùng vượt qua pre-check. Không giữ transaction DB trong khi chờ cổng thanh toán bên ngoài.

## 7. Chuẩn API chung

- Base `/api/v1`; bảng API ở hai file bỏ prefix này. A = Admin, T = Tutor, S = Student, U = user đã đăng nhập, Public = không yêu cầu JWT.
- Các endpoint đánh dấu **Spec** đã có trong tài liệu nhưng chưa đồng nghĩa đã code; **Có code** chỉ xác nhận tồn tại source; **Mới** là đề xuất thêm. Các endpoint **Thay thế** phải thống nhất với FE trước khi đổi.
- JSON trả `{success,data}` hoặc `{success:false,message,errorCode}` theo ApiResponse hiện có. List lớn: `page` từ 0, `size` mặc định 20/tối đa 100, sort whitelist; response `content,page,size,totalElements,totalPages`.
- HTTP: 200 đọc/cập nhật/thao tác idempotent, 201 tạo mới, 400 input, 401 thiếu/sai token, 403 sai role/quyền đối tượng, 404 không tồn tại, 409 trùng/đầy/xung đột, 422 trạng thái hoặc quy tắc không cho phép. DELETE nghiệp vụ là đổi trạng thái, không xóa lịch sử tài chính.
- Lấy studentId/tutorId tác nghiệp từ JWT; không tin ID chủ sở hữu từ body. Kiểm tra ownership cho từng tài nguyên, kể cả GET.
- Tiền VND dùng BigDecimal và quy tắc làm tròn thống nhất; số tiền tính ở server. Timestamp trao đổi ISO-8601 có offset; lịch nghiệp vụ `Asia/Ho_Chi_Minh`, giới hạn 24h tính theo instant.
- Thanh toán/checkout/refund/finalize dùng Idempotency-Key hoặc khóa nghiệp vụ duy nhất. Retry cùng key và payload trả cùng kết quả; khác payload cùng key trả 409.
- Bổ sung unique/FK/check/index bằng Flyway; không dùng Hibernate update để thay migration. Test đồng thời/constraint bằng PostgreSQL phù hợp schema, không chỉ mock/H2.

## 8. Thứ tự bàn giao

| Vòng | Quang | Hữu | Điều kiện kết thúc |
|---|---|---|---|
| 0 | Chốt enum, response, payment contract, migration | Chốt session model, thời gian, service interface | Một bản contract dùng chung, không còn hai tên cho cùng bảng |
| 1 | Q01 + catalog skeleton Q02, seed A/T/S | H01 + conflict nền H02, fixtures theo DTO | Tạo lớp → sinh lịch → đọc lịch qua API |
| 2 | Q03 một lớp + lifecycle Q02 | H02 + H03 | Trả tiền → ghi danh → phân công → bù/thay không trùng |
| 3 | Q04 + Q05 | H04 + H05 | Dạy → khóa điểm danh → chốt lương; core 55/55 SP hoàn tất |
| 4 | Q06 + Q07 | H06 + H07 | Nhiều lớp trong đơn → thanh toán → học → giao/nộp/chấm bài |

Không quy đổi vòng thành tuần khi chưa có deadline và thời gian rảnh. Làm mock contract/fixture khi phụ thuộc chưa xong; trước merge tích hợp phải chạy với service thật.

## 9. Nghiệm thu toàn hệ thống

1. Quang chủ trì: Admin mở lớp → S xem → trả tiền → chỉ sau thành công mới có enrollment và lịch.
2. Hữu chủ trì: Admin gán gia sư → gia sư nghỉ → dạy thay/bù → đúng lịch, đúng quyền điểm danh.
3. Quang chủ trì, Hữu đối soát: buổi đã dạy → khóa sau 24h → lương chỉ cho người thực dạy → finalize không đổi khi retry.
4. Quang chủ trì: thanh toán thất bại, lớp hết chỗ, callback lặp, hủy/hoàn lặp không tăng/giảm sĩ số hoặc tiền hai lần.
5. Hữu chủ trì: học viên lớp khác không xem/nộp bài; gia sư khác không chấm; nghỉ một học viên nhóm không hủy cả buổi.
6. Cả hai: hai request đồng thời đăng ký chỗ cuối, ghi danh hai lớp trùng giờ, gán cùng gia sư trùng giờ đều có kết quả hợp lệ.

Mỗi task xong khi: migration chạy DB mới và nâng cấp DB cũ; validation/role/ownership/state test đạt; OpenAPI có request/response/error; seed/demo tái tạo được; review liên module hoàn tất. Tài liệu này không tuyên bố đã chạy các test triển khai trên.

## 10. Đối chiếu logical model gửi bổ sung

Ảnh logical model thứ hai có cột/PK/FK cụ thể. Đây là dữ liệu thiết kế nhóm cung cấp, chưa phải bằng chứng migration đã chạy. Giữ phân công Quang/Hữu; cần đồng bộ schema và contract trước code. Các điểm sau thay cho giả định tương ứng ở bản phân công ban đầu.

| Dữ liệu thấy trên model mới | Ý nghĩa/ảnh hưởng triển khai | Owner |
|---|---|---|
| Orders: order_id,student_id,created_at,total_amount,status | owner=student_id, total=total_amount. Currency/expiry/idempotency key là đề xuất bổ sung | Quang |
| OrderItem: order_item_id,order_id,class_id,unit_price | unit_price là giá giao dịch chốt; discount snapshot chưa có cột. Không dùng giá hiện tại để tính lại đơn cũ | Quang |
| CartItem.subject_id, OrderItem.class_id | Cart chọn môn, đơn mua lớp. Cần bước chọn lớp trước checkout; API cart nhận subjectId và checkout nhận ánh xạ cartItemId→classId nếu giữ đúng model. Phương án cart chọn lớp ở bản trước cần sửa schema mới dùng được | Quang |
| Class.subject_id,tuition_fee; không thấy Course | Course trong repository là mô hình khác. Không mặc định ép thêm Course; cần quyết định giữ Course hay đưa số buổi/pattern/giá vào Class. tuition_fee là giá gốc hay giá cuối cần thống nhất | Quang |
| LearningSchedule.student_id,class_id,start_date,end_date,status | Đây là lịch gắn học viên–lớp, không phải chỉ mẫu lịch chung như giả định trước. Cần unique/quan hệ với Enrollment và chỉ tạo khi trả tiền thành công | Hữu, nhận enrollment từ Quang |
| Session.schedule_id,class_id,topic_id,start_time,end_time,status | Nếu mỗi Student có schedule riêng mà Session thuộc schedule, lớp nhóm có nguy cơ nhân bản cùng buổi. Đề xuất Session thuộc Class dùng chung; LearningSchedule tham chiếu lớp/ghi danh để truy lịch. Không đếm các bản sao theo học viên thành nhiều buổi lương | Hữu |
| TutorAvailability.available_date | Model dùng ngày cụ thể, không weekday lặp như đề xuất cũ. Nếu giữ model thì API nhận availableDate,startTime,endTime | Hữu |
| Payment.order_id có FK/UK, đồng thời tutor_id | Model giới hạn một Payment mỗi Order. Nếu cần nhiều lần thử phải tách PaymentAttempt hoặc thay constraint. tutor_id ở payment học phí cần làm rõ vì một đơn nhiều lớp có thể nhiều gia sư; không dùng payment học phí làm bảng lương | Quang |
| Enrollment.order_item_id có FK/UK | Tối đa một enrollment cho mỗi item; Student và Class truy qua Orders/OrderItem. Các FK student/class trực tiếp trong kế hoạch cũ là đề xuất khác, cần đồng bộ | Quang |
| Session chưa có actual_tutor_id; chưa thấy bảng payroll/attendance | Tính lương chính xác cần nguồn người thực dạy, phân công lịch sử, lý do hủy và dữ liệu bảng lương. Đây là phần bổ sung so với ảnh | Hữu cung cấp buổi; Quang tính lương |

**Thống nhất cách đếm lương:** báo cáo cả COMPLETED và CANCELLED để thấy buổi đã dạy/không dạy. Tiền buổi trả theo COMPLETED hợp lệ của người thực dạy; CANCELLED nhận 0 tiền buổi. Nếu bắt đầu từ số buổi dự kiến thì loại buổi không dạy để ra số thực dạy; không trừ buổi hủy lần nữa sau khi đã lấy số COMPLETED. Phạt nghỉ hoặc trừ lương cứng là quy tắc khác, chưa được xác định trong yêu cầu này.

Hữu bổ sung contract `TeachingQuery.periodSummary(tutorId,month)` trả danh sách buổi và các nhóm completed/cancelled/substitutedOut/unfinalized cùng lý do hủy và người được phân công tại thời điểm đó. Quang dùng completed hợp lệ để tính tiền, các nhóm còn lại để đối soát; các nhóm đếm phải được định nghĩa không chồng lặp. Snapshot lịch sử tránh quy buổi hủy cho gia sư mới khi lớp đã đổi người.
