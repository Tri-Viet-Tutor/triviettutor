# Danh sách API của Hữu

Tất cả đường dẫn dưới đây có tiền tố `/api/v1`. Đây là **danh sách phân công**, không phải danh sách API đã hoàn thành. `Admin` là quản trị viên, `Student` là học viên, `Tutor` là gia sư. Các API bên dưới hiện là đặc tả hoặc đề xuất; cần triển khai và kiểm thử.

## 1. Buổi học và lịch cá nhân

- `GET /me/sessions` — Student xem lịch lớp đã ghi danh; Tutor xem lịch mình dạy. **Student/Tutor.**
- `GET /admin/sessions` — Admin xem và lọc tất cả buổi học. **Admin.**
- `GET /sessions/{sessionId}` — Xem chi tiết một buổi theo quyền. **Admin, Tutor phụ trách hoặc Student ghi danh.**
- `PUT /admin/sessions/{sessionId}/meeting-url` — Cập nhật link lớp online. **Admin.**

Việc **sinh các buổi từ mẫu lịch** là service nội bộ Hữu cung cấp cho Quang khi công bố lớp; không cần API công khai riêng.

## 2. Lịch rảnh và phân công gia sư

- `PUT /tutor/availability` — Gia sư cập nhật những ngày/giờ mình rảnh. **Tutor.**
- `GET /tutor/availability` — Gia sư xem lịch rảnh của mình. **Tutor.**
- `GET /admin/classes/{classId}/available-tutors` — Gợi ý gia sư có thể dạy lớp. **Admin.**
- `POST /admin/classes/{classId}/assign` — Gán gia sư chính cho lớp. **Admin.**
- `PUT /admin/classes/{classId}/reassign` — Đổi gia sư chính và lưu lịch sử. **Admin.**

Lịch rảnh chỉ để gợi ý. Trước khi gán, backend phải kiểm tra các buổi thực tế; hai buổi giao nhau dù một phút cũng bị chặn. Logical model mới lưu lịch rảnh theo **ngày cụ thể** (`available_date`).

## 3. Xin nghỉ, học bù và dạy thay

- `POST /sessions/{sessionId}/leave` — Gửi đơn xin nghỉ buổi học. **Tutor phụ trách hoặc Student ghi danh.**
- `GET /me/leave-requests` — Xem các đơn nghỉ của mình. **Student/Tutor.**
- `GET /admin/leave-requests` — Xem và lọc toàn bộ đơn nghỉ. **Admin.**
- `POST /admin/sessions/{sessionId}/makeup` — Tạo buổi bù sau khi kiểm tra lịch của gia sư và học viên. **Admin.**
- `POST /admin/sessions/{sessionId}/substitute` — Gán gia sư dạy thay cho một buổi. **Admin.**
- `PATCH /admin/leave-requests/{requestId}/reject` — Từ chối đơn nghỉ, ghi lý do. **Admin.**
- `POST /admin/sessions/{sessionId}/cancel` — Hủy buổi khi không thể dạy hoặc xếp người thay. **Admin.**

Học viên trong lớp nhóm xin nghỉ không làm hủy buổi của cả lớp. Buổi bù phải không trùng lịch của bất kỳ học viên đang học nào.

## 4. Điểm danh và chốt buổi

- `PUT /sessions/{sessionId}/attendance` — Điểm danh học viên. **Admin hoặc Tutor thực dạy.**
- `GET /sessions/{sessionId}/attendance` — Xem điểm danh; Student chỉ xem bản ghi của mình. **Admin, Tutor thực dạy hoặc Student ghi danh.**
- `PATCH /admin/sessions/{sessionId}/attendance/lock` — Khóa hoặc mở khóa điểm danh. **Admin.**
- `PATCH /admin/sessions/{sessionId}/attendance/{recordId}` — Admin sửa điểm danh sau khi khóa, có lý do. **Admin.**

Hữu triển khai job khóa điểm danh sau 24 giờ và cung cấp danh sách buổi `COMPLETED` hợp lệ cho Quang tính lương. Buổi `CANCELLED` cũng phải có trong dữ liệu đối soát nhưng không được tính là buổi thực dạy.

## 5. Chủ đề và nội dung buổi học

- `POST /admin/topics` — Tạo chủ đề cho môn học. **Admin.**
- `PUT /admin/topics/{topicId}` — Sửa chủ đề. **Admin.**
- `GET /subjects/{subjectId}/topics` — Xem các chủ đề của môn. **Người đã đăng nhập.**
- `PUT /admin/sessions/{sessionId}/topic` — Gắn chủ đề vào buổi học. **Admin.**

Chủ đề gắn vào buổi phải thuộc đúng môn của lớp. Topic là phần mở rộng theo ERD; tên cột và trạng thái cần khớp schema nhóm chốt.

## 6. Bài tập, nộp bài và chấm điểm

- `POST /sessions/{sessionId}/homeworks` — Tạo bài tập cho buổi. **Admin hoặc Tutor phụ trách.**
- `PUT /homeworks/{homeworkId}` — Sửa bài tập khi còn được phép. **Admin hoặc Tutor phụ trách.**
- `PATCH /homeworks/{homeworkId}/status` — Công bố hoặc đóng bài tập. **Admin hoặc Tutor phụ trách.**
- `GET /sessions/{sessionId}/homeworks` — Xem bài tập của buổi. **Admin, Tutor phụ trách hoặc Student ghi danh.**
- `GET /homeworks/{homeworkId}` — Xem chi tiết bài tập. **Admin, Tutor phụ trách hoặc Student ghi danh.**
- `GET /me/homeworks` — Học viên xem bài tập trong các lớp mình đang học. **Student.**
- `PUT /homeworks/{homeworkId}/submissions/me` — Nộp hoặc cập nhật bài của mình trước hạn. **Student ghi danh.**
- `GET /homeworks/{homeworkId}/submissions/me` — Xem bài nộp, điểm và nhận xét của mình. **Student ghi danh.**
- `GET /homeworks/{homeworkId}/submissions` — Xem danh sách bài nộp để chấm. **Admin hoặc Tutor phụ trách.**
- `PATCH /submissions/{submissionId}/grade` — Chấm điểm và ghi nhận xét. **Admin hoặc Tutor phụ trách.**

Quy tắc bài tập đã được chốt theo mục H07 bổ sung trong 02-Huu.md: hai vòng đời độc lập, không sửa đề đã công bố, không mở lại bài CLOSED và có bắt đầu/lưu nháp riêng.

## Phối hợp với Quang

- Hữu cần danh sách học viên đã thanh toán và ghi danh từ Quang để cấp quyền lịch, điểm danh và bài tập.
- Hữu cung cấp lịch và bộ kiểm tra trùng để Quang kiểm tra trước khi ghi danh.
- Hữu cung cấp người thực dạy, buổi hoàn thành và buổi hủy cho bảng lương của Quang.

**Tổng: 36 API (gồm 2 API bắt đầu/lưu nháp bổ sung).** Chi tiết input/output, quy tắc và test nằm trong [tài liệu giao việc Hữu](02-Huu.md); các điểm schema chưa chốt nằm trong [tổng quan phân công](00-Tong-quan-phan-cong.md).

### Các API bổ sung cho luồng bắt đầu và lưu nháp đã chốt
- `POST /homeworks/{homeworkId}/submissions/me/start` — Bắt đầu làm; tạo trạng thái IN_PROGRESS. **Student ghi danh.**
- `PUT /homeworks/{homeworkId}/submissions/me/draft` — Lưu nháp trước hạn, chưa nộp. **Student ghi danh.**

PUT /homeworks/{homeworkId}/submissions/me là thao tác nộp chính thức sau khi đã bắt đầu. NOT_STARTED/IN_PROGRESS/SUBMITTED/GRADED thuộc bài làm từng học sinh, độc lập với DRAFT/PUBLISHED/CLOSED của Homework. Chi tiết request, version, phân quyền, deadline và luồng UI được chốt ở mục “H07 — Quy tắc đã chốt” trong 02-Huu.md.

GET /student/homeworks thay cho /me/homeworks: chỉ Student, danh tính từ JWT; lọc trạng thái bài làm, khoảng dueAt và phân trang. PUT bài nộp cho phép cập nhật SUBMITTED trước hạn nếu chưa chấm, Homework còn PUBLISHED và buổi không bị hủy; GRADED vẫn khóa. Chi tiết được người dùng chốt ở mục H07 ngày 13/10/2026 trong 02-Huu.md.
