# Giao việc Backend — Hữu

Hữu phụ trách vận hành việc dạy và học: lịch, phân công, nghỉ/bù/thay, điểm danh, nội dung và bài tập. **55 SP cốt lõi + 21 SP mở rộng ERD = 76 SP**. Đọc [quy ước, quyết định dữ liệu và contract chung](00-Tong-quan-phan-cong.md); phối hợp với [Quang](01-Quang.md).

**Cập nhật logical model mới:** xem mục 10 tài liệu chung trước khi dùng checklist bên dưới. Model mới có LearningSchedule theo student/class và TutorAvailability theo ngày cụ thể; giả định mẫu lịch/weekday ở bản ban đầu chỉ còn là phương án đề xuất. Cần thống nhất một Session dùng chung cho lớp nhóm để không nhân số buổi lương theo số học viên.

## 1. H01 — Sinh buổi, lịch cá nhân và vòng đời buổi (13 SP)

**Business Process:** nhận cấu hình lớp từ Quang → sinh N buổi → hiển thị lịch theo ghi danh/phân công → cập nhật khi bù/thay → kết thúc đủ buổi báo ClassLifecycle hoàn thành. FR-CRS-02, BR-03.01–03, BR-04.10.

- [ ] Map Session: classGroupId,sessionNumber,date,startTime,endTime,status,actualTutorId,meetingUrl; bổ sung originalSessionId để truy vết buổi bù.
- [ ] LearningSchedule trong ảnh: baseline là mẫu lịch của lớp; có thể dùng pattern/slot trên ClassGroup và DTO lịch, không dựng bảng lịch cá nhân trùng với Session. Nếu nhóm yêu cầu bảng riêng, Hữu thiết kế và sở hữu migration.
- [ ] SessionGenerator theo MON_WED_FRI/TUE_THU_SAT/SAT_SUN, bắt đầu ngày hợp lệ đầu tiên ≥ startDate, đủ totalSessions.
- [ ] Slot cố định 08–10, 14–16, 18–20, 19:30–21:30; không so trùng bằng tên slot.
- [ ] `ensureGenerated` gọi lại không tạo trùng; xử lý rollback nếu lỗi nửa chừng. Ràng buộc số buổi phải cho phép buổi bù có liên kết gốc, không unique ngây thơ khiến không tạo được bù.
- [ ] Student thấy lịch chỉ từ enrollment ACTIVE; Tutor thấy buổi được phân công hoặc dạy thay thực tế. Không chỉ join gia sư chính mà bỏ sót dạy thay.
- [ ] Job đưa buổi đủ điều kiện vào IN_SESSION; COMPLETED do quy trình chốt điểm danh hợp lệ, không chỉ vì đã qua giờ.
- [ ] Lớp chỉ hoàn tất khi mọi nghĩa vụ dạy đã xong, gồm bù; buổi gốc CANCELLED có bù không được đếm hai lần.

| ID | API | Quyền | Input chính → Output | Nguồn |
|---|---|---|---|---|
| H-A01 | GET `/me/sessions` | T/S | from,to,status,classGroupId → lịch của mình | Spec |
| H-A02 | GET `/admin/sessions` | A | from,to,classGroupId,tutorId,status,page,size → session page | Spec |
| H-A03 | GET `/sessions/{sessionId}` | A/T phụ trách/S ghi danh | id → buổi,topic,meetingUrl được phép xem | Mới |
| H-A04 | PUT `/admin/sessions/{sessionId}/meeting-url` | A | meetingUrl → session | Mới, hoàn thiện luồng Online MVP |

Sinh buổi là service nội bộ gọi từ Quang, không cần một API regenerate mở ra để FE vô tình nhân đôi lịch.

**Nghiệm thu:** đúng thứ và N buổi qua ranh giới tháng/năm; startDate không thuộc pattern; gọi hai lần không trùng; dữ liệu chưa trả tiền không thấy lịch riêng; Tutor dạy thay thấy đúng buổi.

## 2. H02 — Lịch rảnh, phân công và chặn trùng (13 SP)

**Business Process:** Tutor khai lịch rảnh → Admin xem gợi ý → kiểm tra điều kiện lớp → kiểm tra từng buổi → gán một gia sư chính → cập nhật lịch. FR-SCH-03, BR-03.20/21/30/31/32, BR-04.03.

- [ ] TutorAvailability chứa weekday,startTime,endTime, hiệu lực nếu cần; validate start<end và khoảng lặp; chỉ chủ sở hữu sửa.
- [ ] Availability chỉ là gợi ý. Nguồn chặn trùng là Session/Assignment thực tế; không dùng lịch rảnh để khẳng định không xung đột.
- [ ] 1-1 chỉ assign sau một enrollment thanh toán thành công; nhóm sau deadline với 2–8 người; Student không chọn Tutor.
- [ ] Một gia sư chính hiện hành/lớp; reassign giữ lịch sử, chỉ cập nhật buổi tương lai chưa dạy, bảo toàn dạy thay đã chốt.
- [ ] TimeOverlap dùng `startA < endB && startB < endA`; hai ca liền nhau không trùng, giao ≥1 phút bị chặn; CANCELLED bị loại.
- [ ] Cung cấp engine dùng chung cho StudentConflict, assign, reassign, substitute, makeup; kết quả có conflict session/class/date/time, không lộ dữ liệu ngoài quyền cho Student.
- [ ] Gợi ý khả dụng là read-only; khi assign phải check lại trong transaction có khóa gia sư. Ghi danh đồng thời và dời lịch phối hợp khóa học viên với Quang.

| ID | API | Quyền | Input chính → Output | Nguồn |
|---|---|---|---|---|
| H-A05 | POST `/admin/classes/{classId}/assign` | A | tutorId → assignment,lớp ASSIGNED | Spec |
| H-A06 | PUT `/admin/classes/{classId}/reassign` | A | tutorId,reason → assignment mới/lịch sử | Spec |
| H-A07 | GET `/admin/classes/{classId}/available-tutors` | A | classId → gợi ý và trạng thái conflict | Spec |
| H-A08 | PUT `/tutor/availability` | T | slots[] → lịch rảnh của mình | Spec |
| H-A09 | GET `/tutor/availability` | T | JWT → slots[] | Spec |

**Nghiệm thu:** ca 18–20 và 19:30–21:30 bị chặn; 18–20 và 20–22 không trùng; khác ngày không trùng; assign đồng thời một Tutor vào hai lớp trùng giờ chỉ một thành công; lớp nhóm chưa đến deadline không assign dù đủ 2 người; availability không ghi đè hard conflict.

## 3. H03 — Xin nghỉ, học bù và dạy thay (13 SP)

**Business Process:** T/S gửi đơn đúng buổi → tính thời điểm ≥24h hay <24h → áp dụng theo người nghỉ/loại lớp → Admin duyệt bù/thay/từ chối → lịch mới cập nhật và lưu audit. FR-OPS-01/02, BR-03.40–42.

- [ ] LeaveRequest lưu session,requester,role,reason,requestedAt,status,resolution,resolvedBy/resolvedAt; không tin role từ body.
- [ ] Tutor nghỉ sớm: chờ xử lý; Tutor nghỉ muộn vẫn có thể dạy thay, không có người dạy không được tính lương cho Tutor gốc.
- [ ] Student nhóm nghỉ không chuyển toàn buổi sang PENDING_RESCHEDULE/CANCELLED; ghi nhận nghỉ cá nhân. Theo baseline chung, nghỉ được duyệt sớm là EXCUSED.
- [ ] Student 1-1 nghỉ sớm: có thể xếp bù; nghỉ muộn không mặc định có bù, xử lý theo khả năng gia sư và BR.
- [ ] MAKEUP kiểm tra gia sư và toàn bộ Student ACTIVE; tạo buổi mới liên kết gốc, hủy buổi gốc và resolve đơn trong một transaction.
- [ ] SUBSTITUTE giữ thời gian, đổi actualTutorId buổi đó, lưu original/substitute/actor/reason; không đổi gia sư chính cả lớp.
- [ ] Từ chối đơn phục hồi trạng thái thích hợp từ lịch sử, không mặc định luôn SCHEDULED. Chống xử lý hai lần/2 Admin resolve cạnh tranh.
- [ ] Buổi đã COMPLETED hoặc kỳ lương FINALIZED không được tự sửa lịch sử; gọi PayrollGuard của Quang.

| ID | API | Quyền | Input chính → Output | Nguồn |
|---|---|---|---|---|
| H-A10 | POST `/sessions/{sessionId}/leave` | T phụ trách/S ghi danh | reason → request,isLateNotice,resolution pending | Spec; sửa ngoại lệ lớp nhóm |
| H-A11 | GET `/admin/leave-requests` | A | status,page,size → request page | Spec |
| H-A12 | POST `/admin/sessions/{sessionId}/makeup` | A | leaveRequestId,makeupDate,startTime,endTime → buổi bù | Spec; bổ sung request ID |
| H-A13 | POST `/admin/sessions/{sessionId}/substitute` | A | leaveRequestId,substituteTutorId,reason → buổi và người dạy | Spec; bổ sung truy vết |
| H-A14 | PATCH `/admin/leave-requests/{requestId}/reject` | A | reason → REJECTED | Mới |
| H-A15 | GET `/me/leave-requests` | T/S | status,page,size → đơn của mình | Mới |
| H-A16 | POST `/admin/sessions/{sessionId}/cancel` | A | reason,leaveRequestId nếu có → CANCELLED | Mới, không tìm được người dạy |

**Nghiệm thu:** đúng biên 24h; một Student lớp nhóm nghỉ không ảnh hưởng người còn lại; bù trùng một học viên bất kỳ bị chặn; hai lần duyệt không tạo hai buổi bù; dạy thay không trả lương gia sư gốc; không hủy đơn/buổi đã finalized trái phép.

## 4. H04 — Điểm danh và khóa tự động (8 SP)

**Business Process:** buổi đang diễn ra → Tutor thực dạy nhập điểm danh → có thể sửa đến hết 24h sau giờ kết thúc → job chốt → COMPLETED khi đủ điều kiện → cung cấp nguồn tính lương. FR-OPS-03, BR-04.20/30–34/40.

- [ ] Unique(session,student), status PRESENT/ABSENT/LATE/EXCUSED, note, recordedBy/At, locked; roster lấy từ enrollment hợp lệ.
- [ ] Quyền Tutor theo actualTutor của buổi; Admin thao tác có audit; Student GET chỉ bản ghi của mình, không nhận roster toàn lớp.
- [ ] Không điểm danh trước giờ, sau khóa Tutor không sửa. LATE theo ngưỡng sau 15 phút; đầu vào timestamp nếu dùng phải được kiểm chứng theo thiết kế MVP.
- [ ] MVP Online dùng meetingUrl và nhập tay như Offline, không giả lập attendance 70%.
- [ ] Job chạy lại an toàn, kể cả sau downtime: khóa những buổi đã quá end+24h. Chỉ COMPLETED nếu có bằng chứng đã dạy và dữ liệu cần thiết; thiếu điểm danh đưa vào danh sách cần Admin xử lý, không tự tạo chứng cứ dạy.
- [ ] Admin sửa sau khóa cần reason/audit và PayrollGuard; không âm thầm thay lương kỳ đã chốt.
- [ ] Cung cấp periodSummary cho Quang gồm buổi COMPLETED hợp lệ và các buổi CANCELLED/được người khác dạy thay/chưa chốt để đối soát. Buổi hủy phải truy được lý do và gia sư được phân công lúc hủy; không mặc định hủy do lỗi Tutor. Quang trả tiền từ COMPLETED, không trừ CANCELLED lần hai.

| ID | API | Quyền | Input chính → Output | Nguồn |
|---|---|---|---|---|
| H-A17 | PUT `/sessions/{sessionId}/attendance` | A/T thực dạy | records[{studentId,status,note}] → attendance | Spec |
| H-A18 | GET `/sessions/{sessionId}/attendance` | A/T thực dạy/S bản thân | sessionId → roster hoặc bản ghi cá nhân | Spec; giới hạn ownership |
| H-A19 | PATCH `/admin/sessions/{sessionId}/attendance/lock` | A | locked,reason → lock state | Spec |
| H-A20 | PATCH `/admin/sessions/{sessionId}/attendance/{recordId}` | A | status,note,reason → record có audit | Spec |

**Nghiệm thu:** Tutor khác không sửa; studentId ngoài lớp bị từ chối; PUT lặp không thêm bản ghi; trước/sau đúng mốc end+24h; buổi bị hủy không thành COMPLETED khi job chạy; TeachingQuery trả người dạy thay và ID buổi đúng.

## 5. H06 — Topics và nội dung buổi học (5 SP)

**Mở rộng ERD, schema/API đề xuất. Business Process:** Admin tạo chủ đề theo Subject → gắn chủ đề vào Session → Tutor/Student xem nội dung đúng lớp.

- [ ] Topic có subjectId,title,description,sortOrder,active; unique mã chủ đề trong môn nếu dùng code.
- [ ] Gắn Topic vào Session phải cùng môn của Course/Class; Admin quản trị, Tutor đọc nội dung phục vụ dạy.
- [ ] Topic đang được dùng chỉ archive; không cascade xóa session/homework/submission. Nội dung đã học không bị mất khi archive.

| ID | API | Quyền | Input chính → Output | Nguồn |
|---|---|---|---|---|
| H-A21 | POST `/admin/topics` | A | subjectId,title,description,sortOrder → topic | Mới ERD |
| H-A22 | PUT `/admin/topics/{topicId}` | A | title,description,sortOrder,active → topic | Mới ERD |
| H-A23 | GET `/subjects/{subjectId}/topics` | U | page,size → topic metadata | Mới ERD |
| H-A24 | PUT `/admin/sessions/{sessionId}/topic` | A | topicId → session.topic | Mới ERD |

**Nghiệm thu:** không gắn chủ đề sai môn; không lộ nội dung học riêng qua danh mục metadata; archive không phá lịch sử.

## 6. H07 — Giao bài, nộp bài và chấm bài (16 SP)

**Mở rộng ERD; quy tắc triển khai đã được chốt ở mục H07 bổ sung cuối tài liệu; mục bổ sung được ưu tiên nếu checklist cũ khác biệt.**

**Business Process:** Tutor thực dạy/Admin tạo Homework của Session → publish → Student có enrollment hợp lệ xem và nộp → Tutor xem danh sách/chấm → Student xem điểm/feedback của mình.

- [ ] Homework: sessionId,title,instructions,resourceUrl,dueAt,maxScore,status DRAFT/PUBLISHED/CLOSED,createdBy. Bài DRAFT chỉ A/T có quyền xem.
- [ ] Submission: homeworkId,studentId,content/resourceUrl,submittedAt,status,score,feedback,gradedBy/At,version. Unique(homework,student); nộp lại cập nhật version/audit thay vì sinh trùng bản hiện hành.
- [ ] Một bài làm hiện hành/học viên: NOT_STARTED (chưa có bản ghi) → IN_PROGRESS → SUBMITTED → GRADED. Chỉ IN_PROGRESS được lưu nháp; SUBMITTED được cập nhật trước deadline nếu chưa chấm và Homework còn PUBLISHED. Chưa hỗ trợ nộp muộn.
- [ ] Tutor tạo/chấm theo buổi mình phụ trách; khi đổi gia sư, kiểm tra quyền hiện hành và giữ tác giả/lịch sử. Admin có quyền xử lý ngoại lệ kèm reason.
- [ ] Điểm 0..maxScore; Student không gửi được score/gradedBy; bài đã chấm phải có revision/audit nếu Admin sửa.
- [ ] Không giảm maxScore thấp hơn điểm đã chấm; không rút ngắn deadline hồi tố làm bài nộp hợp lệ thành không hợp lệ.
- [ ] Không xóa bài đã có submission; chuyển CLOSED. ResourceUrl chỉ lưu/link theo chính sách, backend không tự tải URL tùy ý; upload file riêng chưa nằm trong scope.

| ID | API | Quyền | Input chính → Output | Nguồn |
|---|---|---|---|---|
| H-A25 | POST `/sessions/{sessionId}/homeworks` | A/T phụ trách | title,instructions,resourceUrl,dueAt,maxScore → DRAFT homework | Mới ERD |
| H-A26 | PUT `/homeworks/{homeworkId}` | A/T phụ trách | trường được sửa → homework | Mới ERD |
| H-A27 | PATCH `/homeworks/{homeworkId}/status` | A/T phụ trách | PUBLISHED/CLOSED → homework | Mới ERD |
| H-A28 | GET `/sessions/{sessionId}/homeworks` | A/T phụ trách/S ghi danh | page,size → homework theo quyền | Mới ERD |
| H-A29 | GET `/homeworks/{homeworkId}` | A/T phụ trách/S ghi danh | id → đề bài,dueAt,maxScore | Mới ERD |
| H-A30 | PUT `/homeworks/{homeworkId}/submissions/me` | S ghi danh | content,resourceUrl,version → submission | Mới ERD |
| H-A31 | GET `/homeworks/{homeworkId}/submissions/me` | S ghi danh | JWT → bài nộp,điểm,feedback cá nhân | Mới ERD |
| H-A32 | GET `/homeworks/{homeworkId}/submissions` | A/T phụ trách | status,page,size → submissions | Mới ERD |
| H-A33 | PATCH `/submissions/{submissionId}/grade` | A/T phụ trách | score,feedback,version → GRADED submission | Mới ERD |
| H-A34 | GET `/student/homeworks` | S | status,from,to,page,size → bài của các lớp đang học | Mới ERD |
| H-A35 | POST `/homeworks/{homeworkId}/submissions/me/start` | S ghi danh | không body → IN_PROGRESS | Đã chốt |
| H-A36 | PUT `/homeworks/{homeworkId}/submissions/me/draft` | S ghi danh | content,resourceUrl,version → IN_PROGRESS | Đã chốt |

**Nghiệm thu:** Student lớp khác/intent chưa trả tiền không xem hoặc nộp; không nộp hộ người khác; draft không lộ; bài nộp đúng thời hạn được lưu; sau deadline/đã chấm bị chặn sửa; điểm vượt max trả 400/422; optimistic version chặn ghi đè khi chấm đồng thời; Student chỉ xem điểm mình.

## 7. H05 — Bàn giao, phụ thuộc và checklist (8 SP)

H05 nhiều hơn Q05 vì Hữu chủ trì test đồng hồ/job và ma trận trùng lịch dùng chung, ngoài test từng module. Không tính lại effort viết test cơ bản đã nằm trong SP của task.

**Giao sớm cho Quang:** Session DTO, ensureGenerated, ScheduleQuery, ConflictService và TeachingQuery. **Nhận từ Quang:** UserQuery, ClassSchedulingSpec, ClassLifecycle, EnrollmentQuery, PayrollGuard. Chỉ Quang ghi Enrollment/Payment, Hữu không tạo bản ghi giả để có roster.

**Thứ tự:** H01 + engine H02 → hoàn H02 → H03 → H04/H05 → H06/H07. H06 dùng Subject do Quang cung cấp; H07 dùng Session + Enrollment thật.

- [ ] Entity/Repository/Service/DTO/Controller/migration theo module `schedule`, `assignment`, `attendance`, đề xuất thêm `learning` cho Topics/Homework/Submission.
- [ ] Unit test pattern/overlap/biên 24h; inject Clock để kiểm thử thời gian, không phụ thuộc giờ chạy máy.
- [ ] Integration test quyền đối tượng, assign/makeup/substitute transaction; PostgreSQL test request đồng thời và constraint.
- [ ] Fixture có hai ca tối trùng, nhóm có một người xin nghỉ, Tutor thay, buổi bù qua tháng, buổi chưa điểm danh, bài tập trước/sau deadline.
- [ ] OpenAPI cho **36 method/path** trên; có error example 409 conflict và 422 locked/invalid state.
- [ ] Dùng service thật của Quang để chạy E2E; không chỉ kết luận từ mock.
- [ ] Demo phân công → nghỉ/bù/thay → điểm danh → nguồn lương; demo tạo → nộp → chấm bài; gửi kết quả test và hạn chế còn lại.

36 endpoint ít hơn Quang nhưng gồm sinh lịch, xung đột đồng thời, job và nhiều nhánh trạng thái; tổng effort kế hoạch vẫn **76 SP**, không đánh giá công bằng chỉ theo số route.

### H07 — Quy tắc đã chốt cho đợt triển khai bài tập (12/10/2026)

Phạm vi đợt này: 5 API Homework và luồng bắt đầu → lưu nháp → nộp → chấm. Danh sách cá nhân được bổ sung ở đợt 13/10/2026; upload file chưa triển khai.

**Hai vòng đời độc lập:**
- Homework: DRAFT → PUBLISHED → CLOSED, cho phép DRAFT → CLOSED. Tutor/Admin chủ động đóng; hết hạn không tự chuyển CLOSED. Bài đóng từ DRAFT chưa từng công bố vẫn bị ẩn với Student.
- Submission của từng Student: NOT_STARTED (chưa có bản ghi) → IN_PROGRESS (đã bắt đầu, có thể lưu nháp) → SUBMITTED → GRADED. Bắt đầu lại khi đang IN_PROGRESS trả cùng bản ghi; không tạo trùng. Nộp bài không đóng Homework. SUBMITTED được cập nhật trước hạn theo quy tắc bổ sung 13/10/2026 bên dưới.
- DRAFT sửa toàn bộ. PUBLISHED không đổi title/instructions/resourceUrl, chỉ tăng hoặc giữ nguyên maxScore và gia hạn hoặc giữ nguyên dueAt. CLOSED không sửa và không mở lại.
- dueAt là timestamp có múi giờ; khi clock >= dueAt thì chặn bắt đầu/lưu nháp/nộp và sửa Homework. Tạo hoặc công bố phải có hạn tương lai. Đóng bài và chấm bài đã nộp vẫn được phép sau hạn hoặc sau CLOSED.
- Tutor phụ trách = actualTutorId nếu có, nếu không dùng scheduledTutorId. Không lấy tác giả bài hoặc gia sư chính cũ để cấp quyền. Admin được quản lý mọi bài; mọi thay đổi có audit.
- Student phải có LearningSchedule ACTIVE của đúng classGroupId với khoảng ngày bao gồm sessionDate. Đây là contract hiện có của ghi danh đã kích hoạt sau thanh toán; API bài tập không tự tạo ghi danh.
- Buổi CANCELLED: không tạo/sửa/công bố hoặc bắt đầu/lưu/nộp mới; vẫn đọc lịch sử theo quyền, đóng bài và chấm bài đã nộp. Homework không tự chuyển sang buổi bù.
- Điểm từ 0 đến maxScore. Tutor chấm lần đầu; Admin sửa điểm đã chấm phải có reason và audit. Student chỉ xem bài làm/điểm của chính mình. Danh sách cho người chấm chỉ gồm SUBMITTED/GRADED, không lộ nháp cá nhân.
- Nội dung/link được lưu như dữ liệu; resourceUrl chỉ nhận HTTPS không chứa userinfo. Backend không tải URL và không thực thi nội dung. Title tối đa 200, instructions/content 20000, URL 2048, feedback 5000, reason 1000 ký tự; maxScore dương và điểm tối đa 2 chữ số thập phân, NUMERIC(10,2).
- Mỗi (homeworkId, studentId) có một bản ghi hiện hành; giữ audit các lần lưu/nộp/chấm. Tác giả/người nộp/người chấm lấy từ JWT.
- PUT Homework và PATCH status nhận version từ response; lưu nháp/nộp/chấm cũng nhận version. Version cũ trả 409, không ghi đè. Thứ tự khóa: ClassGroup → Session → Homework → Submission, tương thích phân công/hủy buổi.
- GET danh sách phân trang page=0, size=20, size trong 1..100, sắp xếp id tăng dần. GET Homework của Student ẩn draft, kể cả draft đã đóng, bằng 404. Ngoài quyền đối tượng trả 403; ID không tồn tại trả 404; dữ liệu sai trả 400; trạng thái/hạn không cho phép trả 422.

**Contract request/response:**
- POST /sessions/{sessionId}/homeworks: title, instructions, resourceUrl (tùy chọn), dueAt, maxScore → 201 DRAFT.
- PUT /homeworks/{homeworkId}: cùng các trường tạo + version → 200; PUT thay thế toàn bộ trường, bỏ resourceUrl nghĩa là xóa link (chỉ được ở DRAFT).
- PATCH /homeworks/{homeworkId}/status: status=PUBLISHED/CLOSED, version → 200. Gửi lại cùng trạng thái với version hiện hành không tạo audit trùng.
- GET /sessions/{sessionId}/homeworks và GET /homeworks/{homeworkId}: trạng thái bài tập, nội dung, deadline, maxScore, version; Student không nhận tác giả và thông tin bài làm của người khác.
- POST /homeworks/{homeworkId}/submissions/me/start: không body → 200 IN_PROGRESS.
- PUT /homeworks/{homeworkId}/submissions/me/draft: content, resourceUrl (đều tùy chọn), version → 200 IN_PROGRESS.
- PUT /homeworks/{homeworkId}/submissions/me: content hoặc resourceUrl không rỗng, version → 200 SUBMITTED; cần bắt đầu trước.
- GET /homeworks/{homeworkId}/submissions/me: 200 NOT_STARTED nếu chưa bắt đầu, nếu đã có thì trả bài làm hiện hành.
- GET /homeworks/{homeworkId}/submissions: Admin/Tutor phụ trách, page/size, status tùy chọn SUBMITTED/GRADED.
- PATCH /submissions/{submissionId}/grade: score, feedback (tùy chọn), version, reason (bắt buộc khi Admin sửa điểm đã chấm) → 200 GRADED.

**Luồng UI để tích hợp sau:** Student xem đề công bố → bấm Bắt đầu → lưu nháp nhiều lần với version mới nhất → Nộp → có thể cập nhật trước hạn nếu chưa chấm → xem điểm/feedback. Staff soạn nháp → công bố → chỉ gia hạn/tăng điểm tối đa trước hạn → chủ động đóng → tiếp tục chấm. Không tự đổi trạng thái Homework khi một Student nộp.

**Migration:** V14 tạo homeworks, homework_submissions, homework_changes và submission_changes; FK RESTRICT, unique bài/học viên, CHECK điểm/trạng thái, bật RLS theo cách các module hiện tại. Không sửa migration cũ. H2 kiểm thử không thay thế xác minh migration PostgreSQL.

### H07 — Danh sách bài tập cá nhân và cập nhật bài nộp (13/10/2026)

Phương án đã được người dùng xác nhận, thay quy tắc khóa bài ngay sau SUBMITTED của đợt trước.

- GET /student/homeworks (prefix /api/v1), chỉ ROLE_STUDENT. Lấy studentId từ JWT, không nhận danh tính từ request. Không tạo alias /me/homeworks.
- Query: status tùy chọn NOT_STARTED/IN_PROGRESS/SUBMITTED/GRADED là trạng thái bài làm; from/to là timestamp có múi giờ, lọc dueAt trong khoảng đóng [from,to]; cho phép bỏ một hoặc cả hai mốc, from > to trả 400. page=0, size=20 (1..100). Sắp xếp dueAt tăng dần, rồi id tăng dần.
- Phạm vi lớp đang học dựa trên LearningSchedule ACTIVE, đúng học sinh/classGroupId, startDate <= sessionDate <= endDate, thống nhất với API chi tiết. Không yêu cầu hôm nay nằm trong khoảng ngày buổi học để không ẩn bài giao sớm.
- Chỉ trả Homework đã từng công bố (publishedAt khác null); gồm bài PUBLISHED và CLOSED, cả bài hết hạn hoặc buổi bị hủy để xem lịch sử. DRAFT và CLOSED chưa từng công bố luôn ẩn. Không có lớp phù hợp trả trang rỗng 200.
- Response mỗi phần tử: homework (HomeworkResponse không có createdBy), classGroupId, sessionDate, submission (bài làm của chính học sinh, hoặc NOT_STARTED ảo nếu chưa bắt đầu). Không tạo bản ghi khi đọc, không lộ bài/điểm của người khác.
- PUT /homeworks/{homeworkId}/submissions/me: cần bắt đầu trước. Chấp nhận IN_PROGRESS hoặc SUBMITTED; giữ nguyên submissionId, trạng thái SUBMITTED, cập nhật submittedAt và version, lưu audit SUBMIT/RESUBMIT với trước/sau. Vẫn cần nội dung hoặc HTTPS resourceUrl và version mới nhất. PUT thay thế content/resourceUrl; trường bỏ qua được xóa.
- Chỉ cập nhật khi Homework PUBLISHED, clock < dueAt, buổi không CANCELLED, ghi danh còn hợp lệ và bài chưa GRADED. SUBMITTED không quay về IN_PROGRESS; endpoint lưu nháp vẫn chỉ nhận IN_PROGRESS. GRADED khóa sửa bài; Admin sửa điểm vẫn cần reason/audit.
- Hai lần cập nhật cạnh tranh hoặc cập nhật đồng thời chấm điểm dùng chung khóa và version; request cũ trả 409, không ghi đè điểm hoặc nội dung.
- UI: mở danh sách cá nhân → lọc trạng thái/hạn → đọc đề và bài làm → bắt đầu/lưu nháp/nộp → cập nhật bài đã nộp khi còn được phép → xem điểm/nhận xét. Không đổi trạng thái Homework khi Student nộp hoặc cập nhật.
- Không thay schema/migration. Kiểm thử quyền ADMIN/TUTOR/STUDENT, sở hữu bài, danh sách/lọc/phân trang, deadline, CLOSED/CANCELLED/GRADED, version/audit và cạnh tranh.

Ghi chú sửa lỗi khởi động 13/10/2026: V12 và V13 đã được nhóm dùng cho password reset và payment/enrollment. Khôi phục đúng các SQL gốc và kiểm tra checksum bằng Flyway; migration bài tập dùng V14. Profile supabase giữ ddl-auto=validate, migration được chạy tường minh bằng scripts/migrate-database.ps1 trước khi khởi động. Không dùng ddl-auto=update hoặc repair để bỏ qua sai lệch lịch sử.
