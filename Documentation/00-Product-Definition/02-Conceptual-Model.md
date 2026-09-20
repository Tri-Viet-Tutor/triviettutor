# Conceptual Data Model (Mô hình Dữ liệu Khái niệm)

Tài liệu này định nghĩa **Mô hình Dữ liệu Khái niệm (Conceptual Data Model)** hoàn chỉnh cho hệ thống **VietTriTutor** theo chuẩn **Ký pháp Chân quạ (Crow's Foot Notation / KnowledgeWare Standard)**.

Ở tầng Khái niệm, mô hình tập trung 100% vào **ranh giới thực thể kinh doanh (Business Entities)** và **ngữ nghĩa nghiệp vụ cấp cao**. 
Mô hình **hoàn toàn độc lập với công nghệ CSDL (Database-agnostic)**:
- **Tập trung vào bản chất thực thể**: Phân định rõ ràng giữa **Thực thể Độc lập (Independent/Strong Entity)** và **Thực thể Phụ thuộc (Dependent/Weak Entity)**.
- **Không đặc tả chi tiết thuộc tính kỹ thuật** (sẽ được quy chuẩn hóa chi tiết tại `03-Logical-Data-Model.md`).
- **Không đưa bảng trung gian kỹ thuật (Junction Tables)** vào danh sách thực thể; các liên kết nhiều - nhiều ($M:N$) được mô hình hóa dưới dạng quan hệ ngữ nghĩa nghiệp vụ tự nhiên.

---

## 1. Bản Đồ Tổng Quan Các Phân Hệ Nghiệp Vụ

Hệ thống VietTriTutor bao gồm **32 thực thể kinh doanh** được quy hoạch đồng bộ trên 6 phân hệ:

```text
VIETTRI TUTOR CONCEPTUAL DOMAIN
├── 1. Phân hệ Tài khoản, Nhân sự & Hồ sơ Người học (User, Tutor & Learner Management)
├── 2. Phân hệ Khóa học, Khung chương trình & Học liệu số (Curriculum & Digital Materials)
├── 3. Phân hệ Lớp học, Lịch trình & Vận hành Ca học (Class, Scheduling & Session Operations)
├── 4. Phân hệ Khảo thí, Bài tập & Đánh giá Năng lực (Assessment, Examination & Submissions)
├── 5. Phân hệ Thương mại Điện tử, Đơn hàng & Quyết toán (E-Commerce, Orders & Payroll)
└── 6. Phân hệ Quản lý Chất lượng, Tư vấn & Chăm sóc (Quality Assurance & Engagement)
```

---

## 2. Chi Tiết Danh Mục Thực Thể Khái Niệm Theo Từng Phân Hệ

### 2.1. Phân hệ 1: Tài Khoản, Nhân Sự & Hồ Sơ Người Học (User, Tutor & Learner)

*Phân hệ định danh các chủ thể tham gia hệ thống, giải quyết bài toán quan hệ giữa Phụ huynh (người thanh toán) và Con em (người trực tiếp học), cùng toàn bộ hồ sơ năng lực của gia sư.*

#### A. Thực thể Độc lập
1. **`USER`** *(Thực thể Độc lập)*
   - **Ý nghĩa**: Tài khoản người dùng gốc trong hệ thống, định danh tác nhân đăng nhập (Quản trị viên, Gia sư, Phụ huynh / Học viên).
   - **Định danh nghiệp vụ**: `user_id` / `email` / `phone`.

#### B. Thực thể Phụ thuộc Tồn tại
2. **`STUDENT_PROFILE`** *(Phụ thuộc `USER`)*
   - **Ý nghĩa**: Hồ sơ con em / người học thực tế. Một tài khoản Phụ huynh (`USER`) có thể quản lý nhiều hồ sơ con em theo học các khối lớp khác nhau. Khi đăng ký lớp, học sinh thực tế ngồi học là `STUDENT_PROFILE`.
   - **Định danh nghiệp vụ**: `student_profile_id` (gắn với `user_id` cha).

3. **`TUTOR_PROFILE`** *(Phụ thuộc `USER`)*
   - **Ý nghĩa**: Hồ sơ năng lực sư phạm, mức lương cơ bản và chế độ hợp đồng lao động của Gia sư Trung tâm (quan hệ 1:1 với `USER` vai trò gia sư).
   - **Định danh nghiệp vụ**: `tutor_profile_id` (gắn với `user_id`).

4. **`TUTOR_CREDENTIAL`** *(Phụ thuộc `TUTOR_PROFILE`)*
   - **Ý nghĩa**: Bằng cấp đại học, chứng chỉ ngoại ngữ (IELTS/TOEIC), chứng chỉ nghiệp vụ sư phạm nộp lên để Admin kiểm định trước khi giao lớp.
   - **Định danh nghiệp vụ**: `credential_id`.

5. **`TUTOR_AVAILABILITY`** *(Phụ thuộc `TUTOR_PROFILE`)*
   - **Ý nghĩa**: Khung lịch rảnh hàng tuần gia sư khai báo làm căn cứ hỗ trợ Admin tra cứu và xếp lịch dạy phù hợp.
   - **Định danh nghiệp vụ**: `availability_id`.

6. **`TUTOR_EXPERIENCE`** *(Phụ thuộc `TUTOR_PROFILE`)*
   - **Ý nghĩa**: Lịch sử công tác, kinh nghiệm giảng dạy tại các trường/trung tâm và thành tích học thuật nổi bật của gia sư để hiển thị trên hồ sơ giới thiệu công khai.
   - **Định danh nghiệp vụ**: `experience_id`.

---

### 2.2. Phân hệ 2: Khóa Học, Khung Chương Trình & Học Liệu Số (Curriculum & Materials)

*Phân hệ định nghĩa danh mục sản phẩm đào tạo, khung giáo trình chuẩn hóa và kho học liệu phục vụ giảng dạy.*

#### A. Thực thể Độc lập
7. **`COURSE_CATEGORY`** *(Thực thể Độc lập)*
   - **Ý nghĩa**: Danh mục phân loại khóa học theo khối kiến thức (Khối Tự nhiên, Khối Xã hội, Luyện thi Tốt nghiệp THPT, Bồi dưỡng học sinh giỏi).
   - **Định danh nghiệp vụ**: `category_code`.

8. **`COURSE`** *(Thực thể Độc lập / Thuộc `COURSE_CATEGORY`)*
   - **Ý nghĩa**: Khóa học chuẩn do Trung tâm ban hành (Toán 12, Tiếng Anh Cấp 3, v.v.), quy định số buổi học và học phí niêm yết chuẩn.
   - **Định danh nghiệp vụ**: `course_code`.

#### B. Thực thể Phụ thuộc Tồn tại
9. **`SYLLABUS`** *(Phụ thuộc `COURSE`)*
   - **Ý nghĩa**: Bộ khung chương trình giáo trình chuẩn áp dụng cho khóa học, có phiên bản quản lý theo từng năm học.
   - **Định danh nghiệp vụ**: `syllabus_id`.

10. **`SYLLABUS_ITEM`** *(Phụ thuộc `SYLLABUS`)*
    - **Ý nghĩa**: Từng chuyên đề, bài học hoặc đơn vị kiến thức cụ thể cấu thành nên giáo trình, quy định chuẩn đầu ra của từng bài.
    - **Định danh nghiệp vụ**: `syllabus_item_id`.

11. **`LEARNING_MATERIAL`** *(Phụ thuộc `SYLLABUS_ITEM` hoặc `COURSE`)*
    - **Ý nghĩa**: Kho tài liệu học tập số đính kèm theo từng bài học (Slide bài giảng, tệp đề cương PDF, tài liệu đọc tham khảo).
    - **Định danh nghiệp vụ**: `material_id`.

---

### 2.3. Phân hệ 3: Lớp Học, Lịch Trình & Vận Hành Ca Học (Class & Operations)

*Phân hệ thực thi đào tạo theo thời gian thực, quản lý ca học, phòng học ảo, điểm danh, dời ca và bản ghi bài giảng.*

#### A. Thực thể Độc lập
12. **`ACADEMIC_CLASS`** *(Thực thể Độc lập / Mở từ `COURSE`)*
    - **Ý nghĩa**: Lớp học cụ thể được mở từ Khóa học, ấn định hình thức (Online/Offline), mẫu lịch tuần, ca học, sĩ số tối đa (1 kèm 1 hoặc Lớp nhóm 2-8 học viên).
    - **Định danh nghiệp vụ**: `class_code`.

#### B. Thực thể Phụ thuộc Tồn tại
13. **`SESSION`** *(Phụ thuộc `ACADEMIC_CLASS`)*
    - **Ý nghĩa**: Buổi học chi tiết theo ngày cụ thể và khung giờ thực tế trong suốt vòng đời của lớp học.
    - **Định danh nghiệp vụ**: `session_id`.

14. **`ONLINE_ROOM`** *(Phụ thuộc `SESSION`)*
    - **Ý nghĩa**: Không gian phòng học trực tuyến (tích hợp Zoom, Google Meet, LiveKit) cung cấp URL, ID phòng, mật khẩu và token truy cập ca học.
    - **Định danh nghiệp vụ**: `room_id`.

15. **`VIDEO_RECORD`** *(Phụ thuộc `SESSION`)*
    - **Ý nghĩa**: Bản ghi video bài giảng sau khi ca học trực tuyến hoàn thành, phục vụ học viên ôn tập hoặc bộ phận học vụ kiểm định chất lượng đào tạo.
    - **Định danh nghiệp vụ**: `record_id`.

16. **`ATTENDANCE_RECORD`** *(Phụ thuộc `SESSION` và `STUDENT_PROFILE`)*
    - **Ý nghĩa**: Phiếu ghi nhận điểm danh và đánh giá ca học (giờ vào lớp, trạng thái hiện diện, % thời lượng có mặt, ghi chú nhận xét của gia sư về học sinh).
    - **Định danh nghiệp vụ**: `attendance_id`.

17. **`RESCHEDULE_REQUEST`** *(Phụ thuộc `SESSION`)*
    - **Ý nghĩa**: Đơn đề nghị dời buổi học hoặc xin nghỉ ca học có thời hạn báo trước ($\ge 24$h hoặc trễ) cần Admin xét duyệt phương án học bù (`MAKEUP`) hoặc bố trí gia sư dạy thay.
    - **Định danh nghiệp vụ**: `reschedule_request_id`.

18. **`CLASS_ANNOUNCEMENT`** *(Phụ thuộc `ACADEMIC_CLASS`)*
    - **Ý nghĩa**: Bảng tin thông báo nội bộ lớp học do Gia sư hoặc Quản trị viên ghim thông tin (nhắc chuẩn bị bài tập, tài liệu hoặc thông báo lịch bù).
    - **Định danh nghiệp vụ**: `announcement_id`.

---

### 2.4. Phân hệ 4: Khảo Thí, Bài Tập & Đánh Giá Năng Lực (Assessment & Submissions)

*Phân hệ tổ chức kiểm tra định kỳ, bài tập về nhà và đánh giá tiến bộ học tập.*

#### A. Thực thể Độc lập
19. **`EXAM`** *(Thực thể Độc lập / Gắn với `COURSE` hoặc `ACADEMIC_CLASS`)*
    - **Ý nghĩa**: Đề thi, bài kiểm tra định kỳ hoặc bài tập tổng hợp đánh giá chất lượng học viên (Quiz, Giữa kỳ, Cuối kỳ, Homework).
    - **Định danh nghiệp vụ**: `exam_code`.

#### B. Thực thể Phụ thuộc Tồn tại
20. **`QUESTION`** *(Phụ thuộc `EXAM`)*
    - **Ý nghĩa**: Từng câu hỏi (trắc nghiệm, tự luận, điền khuyết) cấu thành nên đề kiểm tra kèm trọng số điểm và đáp án mẫu.
    - **Định danh nghiệp vụ**: `question_id`.

21. **`SUBMISSION`** *(Phụ thuộc `EXAM` và `STUDENT_PROFILE`)*
    - **Ý nghĩa**: Bài nộp bài thi của học viên, ghi nhận thời điểm nộp, tổng điểm đạt được, trạng thái chấm bài và nhận xét chung của gia sư.
    - **Định danh nghiệp vụ**: `submission_id`.

22. **`SUBMISSION_DETAIL`** *(Phụ thuộc `SUBMISSION` và `QUESTION`)*
    - **Ý nghĩa**: Bản ghi câu trả lời chi tiết của học viên cho từng câu hỏi, kèm kết quả chấm tự động/thủ công và phản hồi chi tiết của gia sư.
    - **Định danh nghiệp vụ**: `submission_detail_id`.

---

### 2.5. Phân hệ 5: Thương Mại Điện Tử, Đơn Hàng & Quyết Toán (E-Commerce & Payroll)

*Phân hệ xử lý chu trình bán hàng, đóng băng giá trị đơn hàng, thanh toán học phí và chi trả thù lao cho gia sư.*

#### A. Thực thể Độc lập
23. **`CART`** *(Thực thể Độc lập / Gắn với `USER`)*
    - **Ý nghĩa**: Giỏ hàng lưu trữ các khóa học/lớp học học viên đang dự định đăng ký trước khi tiến hành thanh toán.
    - **Định danh nghiệp vụ**: `cart_id`.

24. **`PROMOTION`** *(Thực thể Độc lập)*
    - **Ý nghĩa**: Chính sách ưu đãi, mã giảm giá (Voucher), chương trình chiết khấu đăng ký sớm (Early Bird) áp dụng khi đặt hàng.
    - **Định danh nghiệp vụ**: `promotion_code`.

25. **`ORDER`** *(Thực thể Độc lập)*
    - **Ý nghĩa**: Đơn đặt mua chính thức ghi nhận giao dịch mua đào tạo của học viên sau khi kiểm tra không bị trùng lịch và hoàn tất chọn lớp.
    - **Định danh nghiệp vụ**: `order_code`.

26. **`PAYMENT`** *(Thực thể Độc lập)*
    - **Ý nghĩa**: Giao dịch tài chính thanh toán học phí (VNPAY/MOMO/Ngân hàng) hoặc lệnh hoàn tiền do hủy lớp.
    - **Định danh nghiệp vụ**: `payment_code` / `transaction_ref`.

27. **`PAYROLL`** *(Thực thể Độc lập)*
    - **Ý nghĩa**: Bảng quyết toán lương và thù lao hàng tháng cho gia sư do Admin phê duyệt và khóa sổ định kỳ.
    - **Định danh nghiệp vụ**: `payroll_code`.

#### B. Thực thể Phụ thuộc Tồn tại
28. **`CART_ITEM`** *(Phụ thuộc `CART`)*
    - **Ý nghĩa**: Dòng mặt hàng cụ thể nằm trong giỏ hàng đại diện cho một khóa học hoặc lớp học đã chọn.
    - **Định danh nghiệp vụ**: `cart_item_id`.

29. **`ORDER_ITEM`** *(Phụ thuộc `ORDER`)*
    - **Ý nghĩa**: Dòng chi tiết đơn hàng đại diện cho khóa học được mua. Đây là nơi **đóng băng (Snapshot)** giá niêm yết, tỷ lệ chiết khấu sĩ số và giá thanh toán thực tế tại thời điểm mua.
    - **Định danh nghiệp vụ**: `order_item_id`.

30. **`PAYROLL_ITEM`** *(Phụ thuộc `PAYROLL`)*
    - **Ý nghĩa**: Dòng chứng từ thù lao chi tiết cho từng buổi dạy hợp lệ (`COMPLETED`) của gia sư trong tháng, làm căn cứ cấu thành tổng thu nhập thực nhận.
    - **Định danh nghiệp vụ**: `payroll_item_id`.

---

### 2.6. Phân hệ 6: Quản Lý Chất Lượng, Tư Vấn & Chăm Sóc (QA & Engagement)

*Phân hệ tiếp nhận học sinh mới, đánh giá sự hài lòng và giữ kết nối thông tin toàn hệ thống.*

#### A. Thực thể Độc lập
31. **`CONSULTATION_LEAD`** *(Thực thể Độc lập)*
    - **Ý nghĩa**: Yêu cầu tư vấn lộ trình học, đăng ký kiểm tra trình độ đầu vào hoặc đăng ký học thử của phụ huynh mới trước khi ra quyết định mua khóa học.
    - **Định danh nghiệp vụ**: `lead_id`.

#### B. Thực thể Phụ thuộc Tồn tại
32. **`FEEDBACK_REVIEW`** *(Phụ thuộc `ACADEMIC_CLASS` hoặc `TUTOR_PROFILE`)*
    - **Ý nghĩa**: Đánh giá chấm điểm sao (Rating 1–5 sao) và nhận xét chất lượng giảng dạy từ Phụ huynh / Học viên sau khóa học hoặc ca học.
    - **Định danh nghiệp vụ**: `review_id`.

33. **`NOTIFICATION`** *(Phụ thuộc `USER`)*
    - **Ý nghĩa**: Thông báo sự kiện hệ thống gửi đến người dùng (nhắc giờ học trước 30 phút, thông báo đổi lịch ca, xác nhận thanh toán, bảng lương tháng).
    - **Định danh nghiệp vụ**: `notification_id`.

---

## 3. Bảng Ma Trận Tổng Hợp Phân Loại Thực Thể

| Phân hệ | Thực thể Độc lập (Independent / Strong) | Thực thể Phụ thuộc Tồn tại (Dependent / Weak) |
| :--- | :--- | :--- |
| **1. Tài khoản & Nhân sự** | `USER` | `STUDENT_PROFILE`, `TUTOR_PROFILE`, `TUTOR_CREDENTIAL`, `TUTOR_AVAILABILITY`, `TUTOR_EXPERIENCE` |
| **2. Khóa học & Giáo trình** | `COURSE_CATEGORY`, `COURSE` | `SYLLABUS`, `SYLLABUS_ITEM`, `LEARNING_MATERIAL` |
| **3. Lớp học & Vận hành** | `ACADEMIC_CLASS` | `SESSION`, `ONLINE_ROOM`, `VIDEO_RECORD`, `ATTENDANCE_RECORD`, `RESCHEDULE_REQUEST`, `CLASS_ANNOUNCEMENT` |
| **4. Khảo thí & Bài tập** | `EXAM` | `QUESTION`, `SUBMISSION`, `SUBMISSION_DETAIL` |
| **5. E-Commerce & Tài chính**| `CART`, `PROMOTION`, `ORDER`, `PAYMENT`, `PAYROLL` | `CART_ITEM`, `ORDER_ITEM`, `PAYROLL_ITEM` |
| **6. Chất lượng & Tương tác**| `CONSULTATION_LEAD` | `FEEDBACK_REVIEW`, `NOTIFICATION` |

---

## 4. Phân Định Rõ Ràng: Thực Thể Khái Niệm vs. Mối Quan Hệ Nghiệp Vụ

Nhằm giữ mô hình đúng chuẩn lý thuyết Conceptual Data Model, các bảng nối kỹ thuật được mô hình hóa bằng các **Mối quan hệ ngữ nghĩa nhiều - nhiều ($M:N$) hoặc một - nhiều ($1:N$) tự nhiên**:

| Mối quan hệ giữa các Thực thể | Bản số | Ý nghĩa nghiệp vụ tự nhiên (Thay thế bảng trung gian nào) |
| :--- | :---: | :--- |
| **`TUTOR_PROFILE`** $\longleftrightarrow$ **`COURSE`** | $M:N$ | **Qualifies to teach**: Gia sư đủ điều kiện và được phê duyệt chuyên môn để dạy khóa học (thay thế `tutor_courses`). |
| **`TUTOR_PROFILE`** $\longleftrightarrow$ **`ACADEMIC_CLASS`** | $1:N$ | **Assigned to teach**: Gia sư chính được phân công chịu trách nhiệm một lớp học (thay thế `teaching_assignments`). |
| **`STUDENT_PROFILE`** $\longleftrightarrow$ **`ACADEMIC_CLASS`** | $M:N$ | **Enrolls in**: Học viên chính thức ghi danh vào lớp học sau khi đơn hàng được thanh toán (thay thế `enrollments`). |
| **`SESSION`** $\longleftrightarrow$ **`SYLLABUS_ITEM`** | $M:N$ | **Covers**: Buổi học thực tế giảng dạy những nội dung chuyên đề nào trong giáo trình (thay thế `session_syllabus_items`). |
| **`USER (Gia sư dạy thay)`** $\longleftrightarrow$ **`SESSION`** | $1:N$ | **Substitutes in**: Gia sư dạy thay được phân công tạm thời cho một ca học cụ thể (thay thế `session_substitutions`). |

---

## 5. Cơ Chế Nghiệp Vụ Cốt Lõi: Đổi Giá Khóa Học (Price Snapshot)

- Khi giá niêm yết trong `COURSE.base_price` thay đổi theo thời gian, mọi đơn hàng trong quá khứ được bảo vệ toàn vẹn nhờ cơ chế **Snapshot Giá** được lưu trữ trực tiếp trên từng **`ORDER_ITEM`**:
  - Đơn giá niêm yết tại thời điểm mua (`unit_price_snapshot`).
  - Mức chiết khấu theo sĩ số lớp (`discount_snapshot`).
  - Giá tiền thực thu của dòng hàng (`final_price_snapshot`).
- Mọi điều chỉnh giá tương lai của Ban Giám đốc hoàn toàn không làm sai lệch báo cáo doanh thu và lịch sử thanh toán của khách hàng.
