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

**Mở rộng ERD; quy tắc dưới đây là baseline đề xuất, vì tài liệu BR hiện tại chưa có nghiệp vụ bài tập.**

**Business Process:** Tutor thực dạy/Admin tạo Homework của Session → publish → Student có enrollment hợp lệ xem và nộp → Tutor xem danh sách/chấm → Student xem điểm/feedback của mình.

- [ ] Homework: sessionId,title,instructions,resourceUrl,dueAt,maxScore,status DRAFT/PUBLISHED/CLOSED,createdBy. Bài DRAFT chỉ A/T có quyền xem.
- [ ] Submission: homeworkId,studentId,content/resourceUrl,submittedAt,status,score,feedback,gradedBy/At,version. Unique(homework,student); nộp lại cập nhật version/audit thay vì sinh trùng bản hiện hành.
- [ ] Baseline một bài nộp hiện hành/học viên; cho sửa trước deadline và trước chấm; chưa hỗ trợ nộp muộn. Nếu nhóm muốn late submission/attempts, chốt lại scope/test trước triển khai.
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
| H-A34 | GET `/me/homeworks` | S | status,from,to,page,size → bài của các lớp đang học | Mới ERD |

**Nghiệm thu:** Student lớp khác/intent chưa trả tiền không xem hoặc nộp; không nộp hộ người khác; draft không lộ; bài nộp đúng thời hạn được lưu; sau deadline/đã chấm bị chặn sửa; điểm vượt max trả 400/422; optimistic version chặn ghi đè khi chấm đồng thời; Student chỉ xem điểm mình.

## 7. H05 — Bàn giao, phụ thuộc và checklist (8 SP)

H05 nhiều hơn Q05 vì Hữu chủ trì test đồng hồ/job và ma trận trùng lịch dùng chung, ngoài test từng module. Không tính lại effort viết test cơ bản đã nằm trong SP của task.

**Giao sớm cho Quang:** Session DTO, ensureGenerated, ScheduleQuery, ConflictService và TeachingQuery. **Nhận từ Quang:** UserQuery, ClassSchedulingSpec, ClassLifecycle, EnrollmentQuery, PayrollGuard. Chỉ Quang ghi Enrollment/Payment, Hữu không tạo bản ghi giả để có roster.

**Thứ tự:** H01 + engine H02 → hoàn H02 → H03 → H04/H05 → H06/H07. H06 dùng Subject do Quang cung cấp; H07 dùng Session + Enrollment thật.

- [ ] Entity/Repository/Service/DTO/Controller/migration theo module `schedule`, `assignment`, `attendance`, đề xuất thêm `learning` cho Topics/Homework/Submission.
- [ ] Unit test pattern/overlap/biên 24h; inject Clock để kiểm thử thời gian, không phụ thuộc giờ chạy máy.
- [ ] Integration test quyền đối tượng, assign/makeup/substitute transaction; PostgreSQL test request đồng thời và constraint.
- [ ] Fixture có hai ca tối trùng, nhóm có một người xin nghỉ, Tutor thay, buổi bù qua tháng, buổi chưa điểm danh, bài tập trước/sau deadline.
- [ ] OpenAPI cho **34 method/path** trên; có error example 409 conflict và 422 locked/invalid state.
- [ ] Dùng service thật của Quang để chạy E2E; không chỉ kết luận từ mock.
- [ ] Demo phân công → nghỉ/bù/thay → điểm danh → nguồn lương; demo tạo → nộp → chấm bài; gửi kết quả test và hạn chế còn lại.

34 endpoint ít hơn Quang nhưng gồm sinh lịch, xung đột đồng thời, job và nhiều nhánh trạng thái; tổng effort kế hoạch vẫn **76 SP**, không đánh giá công bằng chỉ theo số route.
