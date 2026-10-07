# Danh sách API của Quang

Tất cả đường dẫn dưới đây có tiền tố `/api/v1`. Đây là **danh sách phân công**, không phải danh sách API đã hoàn thành. `Admin` là quản trị viên, `Student` là học viên, `Tutor` là gia sư. **2 API đăng nhập/đăng ký và GET /me** đã có controller trong source; các API khác bên dưới là đặc tả hoặc đề xuất cần triển khai.

## 1. Tài khoản và hồ sơ

- `POST /auth/login` — Đăng nhập, nhận JWT. **Công khai; đã có code, cần rà soát/test.**
- `POST /auth/register` — Đăng ký tài khoản học viên. **Công khai; đã có code, cần rà soát/test.**
- `GET /me` — Xem hồ sơ của mình. **Người đã đăng nhập; đã có code.**
- `PUT /me` — Cập nhật hồ sơ của mình. **Người đã đăng nhập; đã có code.**
- `GET /admin/users` — Admin xem, tìm và lọc danh sách người dùng. **Admin; đã có code.**
- `POST /admin/users/tutors` — Admin tạo tài khoản gia sư. **Admin; đã có code.**
- `PUT /admin/users/{userId}/tutor-profile` — Admin cập nhật hồ sơ, lương cứng và đơn giá buổi của gia sư. **Admin.**

## 2. Môn học, khóa học và lớp học

- `POST /admin/subjects` — Tạo môn học. **Admin.**
- `PUT /admin/subjects/{subjectId}` — Sửa môn học. **Admin.**
- `GET /subjects` — Xem danh sách môn học. **Người đã đăng nhập.**
- `POST /admin/courses` — Tạo khóa học. **Admin.**
- `GET /admin/courses` — Xem danh sách khóa học. **Admin.**
- `PUT /admin/courses/{courseId}` — Sửa khóa học. **Admin.**
- `PATCH /admin/courses/{courseId}/toggle` — Bật/ẩn khóa học. **Admin.**
- `POST /admin/classes` — Tạo lớp học. **Admin.**
- `GET /admin/classes` — Xem danh sách lớp, gồm cả lớp chưa công bố. **Admin.**
- `PATCH /admin/classes/{classId}/status` — Đổi trạng thái lớp. **Admin.**
- `GET /catalog/classes` — Xem các lớp đang mở và giá dự kiến. **Người đã đăng nhập.**
- `GET /catalog/classes/{classId}` — Xem lớp, lịch và chỗ còn lại. **Người đã đăng nhập.**
- `POST /admin/classes/{classId}/reopen` — Mở lại lớp không đủ sĩ số với lịch mới. **Admin.**
- `POST /admin/classes/{classId}/convert-to-one-on-one` — Chuyển lớp nhóm thành lớp 1-1 khi học viên đồng ý. **Admin.**

## 3. Thanh toán một lớp, ghi danh và hoàn tiền

- `POST /payment-intents` — Tạo yêu cầu thanh toán cho một lớp. **Student.**
- `POST /payment-intents/{intentId}/confirm-mock` — Xác nhận thanh toán giả lập; thành công mới ghi danh. **Student sở hữu yêu cầu.**
- `GET /enrollments/my` — Xem các lớp mình đã ghi danh. **Student.**
- `DELETE /enrollments/{enrollmentId}` — Hủy ghi danh nếu quy tắc cho phép. **Student sở hữu ghi danh.**
- `POST /admin/enrollments/{enrollmentId}/refund` — Admin duyệt hoàn tiền. **Admin.**
- `GET /admin/payments` — Xem và lọc giao dịch học phí. **Admin.**
- `GET /payments/{paymentId}` — Xem chi tiết giao dịch. **Admin hoặc Student sở hữu.**
- `GET /admin/classes/{classId}/enrollments` — Xem học viên đã ghi danh vào lớp. **Admin.**

Hai API `payment-intents` là **đề xuất thay** cặp API cũ `POST /enrollments` và `POST /enrollments/{enrollmentId}/pay`. Nhóm cần chốt contract với frontend trước khi code; nguyên tắc là chưa tạo ghi danh có hiệu lực khi tiền chưa được xác nhận.

## 4. Bảng lương gia sư

- `GET /admin/payroll/{year}/{month}` — Xem bảng lương tháng và số buổi đối soát. **Admin.**
- `POST /admin/payroll/{year}/{month}/finalize` — Chốt bảng lương tháng. **Admin.**
- `GET /tutor/payroll` — Gia sư xem bảng lương của mình. **Tutor.**

Tiền buổi tính theo buổi `COMPLETED` mà gia sư thực dạy. Buổi `CANCELLED` vẫn hiện trong phần đối soát, nhưng không bị trừ thêm lần nữa khỏi số buổi đã hoàn thành.

## 5. Giỏ hàng và đơn hàng nhiều lớp

- `GET /cart` — Xem giỏ của mình. **Student.**
- `POST /cart/items` — Thêm môn vào giỏ theo logical model mới. **Student.**
- `DELETE /cart/items/{itemId}` — Xóa một mục khỏi giỏ. **Student sở hữu giỏ.**
- `DELETE /cart/items` — Xóa toàn bộ mục trong giỏ. **Student.**
- `POST /orders/checkout` — Chọn lớp cụ thể cho từng môn, chốt giá và tạo đơn. **Student.**
- `GET /orders/my` — Xem đơn hàng của mình. **Student.**
- `GET /orders/{orderId}` — Xem chi tiết đơn. **Admin hoặc Student sở hữu.**
- `POST /orders/{orderId}/payments/mock` — Thanh toán giả lập cho đơn, rồi ghi danh các lớp hợp lệ. **Student sở hữu đơn.**
- `POST /orders/{orderId}/cancel` — Hủy đơn chưa thanh toán. **Student sở hữu đơn.**
- `GET /admin/orders` — Xem và lọc toàn bộ đơn. **Admin.**

Theo logical model mới, `CartItem` lưu **môn** (`subject_id`) còn `OrderItem` lưu **lớp** (`class_id`). Vì vậy checkout phải nhận lớp cụ thể và kiểm tra lớp đó thuộc môn trong giỏ. Nếu nhóm đổi `CartItem` sang `class_id`, cần sửa contract giỏ hàng tương ứng.

## Phối hợp với Hữu

- Quang cần lịch buổi học và bộ kiểm tra trùng lịch của Hữu trước khi cho ghi danh.
- Quang cần danh sách buổi `COMPLETED`, `CANCELLED` và gia sư thực dạy từ Hữu để tính, đối soát lương.
- Hữu cần danh sách học viên đã ghi danh hợp lệ và thông tin lớp từ Quang.

**Tổng: 42 API.** Chi tiết input/output, quy tắc và test nằm trong [tài liệu giao việc Quang](01-Quang.md); các điểm schema chưa chốt nằm trong [tổng quan phân công](00-Tong-quan-phan-cong.md).
