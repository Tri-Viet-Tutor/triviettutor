# Conceptual Data Model (Mô hình Dữ liệu Khái niệm)

Tài liệu này định nghĩa **Mô hình Dữ liệu Khái niệm (Conceptual Data Model)** cho hệ thống **VietTriTutor** theo chuẩn **Ký pháp Chân quạ (Crow's Foot Notation / KnowledgeWare Standard)**.

Ở tầng Khái niệm, mô hình tập trung 100% vào **ranh giới thực thể kinh doanh (Business Entities)** và **ngữ nghĩa nghiệp vụ cấp cao**. 
Mô hình **hoàn toàn độc lập với thiết kế CSDL (Database-agnostic)**:
- **Không đặc tả chi tiết thuộc tính kỹ thuật** (sẽ chi tiết hóa tại `03-Logical-Data-Model.md`).
- **Không đưa bảng trung gian kỹ thuật (Junction Tables)** vào danh sách thực thể; các liên kết nhiều - nhiều ($M:N$) được mô hình hóa dưới dạng quan hệ nghiệp vụ tự nhiên.

---

## 1. Danh mục Thực thể Khái niệm (Conceptual Entities)

### 1.1. Thực thể Độc lập (Independent Entities)
*Các thực thể có sự tồn tại tự thân, đại diện cho các đối tượng kinh doanh cốt lõi của trung tâm:*

1. **`USER`** - Tài khoản định danh các tác nhân trong hệ thống (Học viên, Phụ huynh, Gia sư, Quản trị viên).
2. **`COURSE`** - Khóa học chuẩn (sản phẩm đào tạo gốc: Toán 12, Tiếng Anh Cấp 3, v.v.).
3. **`ACADEMIC_CLASS`** - Lớp học cụ thể được mở từ Khóa học (mang mẫu lịch, khung giờ, loại 1-1 hoặc lớp nhóm).
4. **`CART`** - Giỏ hàng lưu trữ các khóa học/lớp học học viên đang dự định đăng ký.
5. **`ORDER`** - Đơn hàng chính thức ghi nhận giao dịch mua đào tạo (chốt giá tại thời điểm mua).
6. **`PAYMENT`** - Giao dịch tài chính thanh toán học phí hoặc hoàn tiền.
7. **`PAYROLL`** - Bảng quyết toán lương và thù lao hàng tháng cho gia sư.
8. **`EXAM`** - Bài kiểm tra năng lực, bài thi định kỳ hoặc bài tập đánh giá.
9. **`PROMOTION`** *(Đề xuất)* - Chính sách ưu đãi, mã giảm giá kích cầu áp dụng khi đặt hàng.

---

### 1.2. Thực thể Phụ thuộc Tồn tại (Dependent Entities)
*Các thực thể gắn liền và chỉ tồn tại khi thực thể cha tồn tại:*

#### A. Phân hệ Hồ sơ Gia sư & Nhân sự
1. **`TUTOR_PROFILE`** *(phụ thuộc `USER`)* - Hồ sơ năng lực sư phạm, mức lương cơ bản và hợp đồng gia sư.
2. **`TUTOR_CREDENTIAL`** *(phụ thuộc `TUTOR_PROFILE`)* - Bằng cấp, chứng chỉ sư phạm/ngoại ngữ được nộp để Admin phê duyệt.
3. **`TUTOR_AVAILABILITY`** *(phụ thuộc `TUTOR_PROFILE` - Đề xuất)* - Khung lịch rảnh hàng tuần gia sư đăng ký để làm căn cứ phân công lớp.

#### B. Phân hệ Khung Chương Trình & Học Liệu
4. **`SYLLABUS`** *(phụ thuộc `COURSE`)* - Khung chương trình giáo trình chuẩn của khóa học.
5. **`SYLLABUS_ITEM`** *(phụ thuộc `SYLLABUS`)* - Bài học, chuyên đề kiến thức chi tiết trong giáo trình.
6. **`LEARNING_MATERIAL`** *(phụ thuộc `SYLLABUS_ITEM` hoặc `SESSION` - Đề xuất)* - Tài liệu học tập số, slide bài giảng, tệp bài tập đính kèm.

#### C. Phân hệ Vận Hành Buổi Học & Lớp Học Ảo
7. **`SESSION`** *(phụ thuộc `ACADEMIC_CLASS`)* - Buổi học cụ thể theo ngày và khung giờ thực tế.
8. **`ONLINE_ROOM`** *(phụ thuộc `SESSION`)* - Không gian phòng học trực tuyến (Zoom, Google Meet, LiveKit).
9. **`VIDEO_RECORD`** *(phụ thuộc `SESSION`)* - Bản ghi hình video của ca học phục vụ ôn tập và kiểm định chất lượng.
10. **`RESCHEDULE_REQUEST`** *(phụ thuộc `SESSION` - Đề xuất)* - Đơn đề nghị dời lịch / xin nghỉ có thời hạn báo trước ($\ge 24$h hoặc trễ) cần Admin xử lý.

#### D. Phân hệ Thương Mại Điện Tử & Khảo Thí
11. **`CART_ITEM`** *(phụ thuộc `CART`)* - Dòng mặt hàng cụ thể nằm trong giỏ hàng.
12. **`ORDER_ITEM`** *(phụ thuộc `ORDER`)* - Dòng chi tiết đơn hàng (nơi đóng băng giá mua tại thời điểm đặt hàng).
13. **`SUBMISSION`** *(phụ thuộc `EXAM` và `USER`)* - Bài làm của học viên nộp cho bài kiểm tra kèm điểm số và nhận xét.
14. **`FEEDBACK_REVIEW`** *(phụ thuộc `ACADEMIC_CLASS` hoặc `USER` - Đề xuất)* - Đánh giá, chấm điểm sao và phản hồi chất lượng đào tạo từ học viên/phụ huynh.
15. **`NOTIFICATION`** *(phụ thuộc `USER` - Đề xuất)* - Thông báo hệ thống gửi đến người dùng (nhắc ca học, dời lịch, kết quả đơn hàng, lương).

---

## 2. Phân Định Giữa "Thực Thể Khái Niệm" và "Mối Quan Hệ Nghiệp Vụ"

Để giữ mô hình tinh gọn, các bảng liên kết kỹ thuật không được coi là Thực thể Khái niệm mà được mô hình hóa bằng các **Mối quan hệ nghiệp vụ ngữ nghĩa**:

| Mối quan hệ giữa các Thực thể | Bản số | Ý nghĩa nghiệp vụ (Thay thế bảng trung gian nào) |
| :--- | :---: | :--- |
| **`USER`** $\longleftrightarrow$ **`COURSE`** | $M:N$ | **Qualifies to teach**: Gia sư đủ điều kiện/được cấp phép dạy khóa học (thay thế `tutor_courses`). |
| **`USER`** $\longleftrightarrow$ **`ACADEMIC_CLASS`** | $1:N$ | **Assigned to teach**: Gia sư được phân công phụ trách lớp học (thay thế `teaching_assignments`). |
| **`USER`** $\longleftrightarrow$ **`ACADEMIC_CLASS`** | $M:N$ | **Enrolls in**: Học viên đăng ký tham gia lớp học (thay thế `enrollments`). |
| **`USER`** $\longleftrightarrow$ **`SESSION`** | $M:N$ | **Attends**: Học viên điểm danh tham gia buổi học (thay thế `attendances`). |
| **`SESSION`** $\longleftrightarrow$ **`SYLLABUS_ITEM`** | $M:N$ | **Covers**: Buổi học thực tế giảng dạy các bài học nào trong giáo trình (thay thế `session_syllabus_items`). |

---

## 3. Cơ Chế Nghiệp Vụ Cốt Lõi: Đổi Giá Khóa Học

- Khi `COURSE` đổi giá niêm yết trong tương lai, giá trị các giao dịch trong quá khứ được bảo toàn 100% nhờ việc lưu **Snapshot Giá** tại thời điểm mua trực tiếp trên từng **`ORDER_ITEM`**.
- Không cần phát sinh bảng lịch sử phức tạp nếu không có nhu cầu lập lịch đổi giá theo mốc thời gian trong tương lai.
