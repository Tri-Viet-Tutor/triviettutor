# Business Rule 02: Học phí, sĩ số lớp & Lương gia sư

Tài liệu này chốt **cách tính tiền** cho học viên và **cách tính lương** cho gia sư. Hệ thống **không bán gói subscription**.

---

## 1. Nguyên tắc thu tiền (BR-02)

| Mã | Quy tắc |
| :--- | :--- |
| **BR-02.01** | Học phí thu **theo trọn gói khóa/lớp**, không thu theo buổi lẻ khi đăng ký. |
| **BR-02.02** | Học viên phải thanh toán **100%** học phí tại thời điểm đăng ký. Chỉ khi thanh toán thành công mới tạo `Enrollment`. |
| **BR-02.03** | Admin cấu hình **học phí gốc 1-1** \(P_{\text{1on1}}\) theo môn, cấp học (Cấp 1 / 2 / 3) và hình thức (Online / Offline). |
| **BR-02.04** | Giá học viên phải trả được **chốt lúc đăng ký**. Lớp lớn thêm sau đó **không** tính lại tiền đã đóng. |
| **BR-02.05** | Không có gói tháng/năm cho gia sư. Mọi doanh thu là học phí học viên. |

---

## 2. Hai loại lớp

Mỗi lớp do Admin tạo phải chọn đúng **một** loại. Hai loại **không dùng chung** quy tắc sĩ số.

| Loại lớp | Mã | Sĩ số min | Sĩ số max | Khi nào được phân công gia sư |
| :--- | :--- | :---: | :---: | :--- |
| **1 kèm 1** | `ONE_ON_ONE` | 1 | 1 | Ngay sau khi 1 học viên thanh toán thành công. |
| **Lớp nhóm** | `GROUP` | 2 | 8 | Sau mốc chốt đăng ký, khi sĩ số \(\ge 2\). |

**BR-02.10** — Hệ thống khóa đăng ký (`FULL`) khi:

- `ONE_ON_ONE`: đã có 1 enrollment thành công.
- `GROUP`: đã có 8 enrollment thành công.

---

## 3. Bảng chiết khấu nhóm (cố định)

Học phí mỗi học viên:

\[
P_{\text{student}} = P_{\text{1on1}} \times (1 - D)
\]

\(D\) lấy **đúng** theo bảng, không dùng khoảng 35–40%.

| Sĩ số **tại lúc học viên đăng ký** | Chiết khấu \(D\) | Học phí / học viên |
| :---: | :---: | :--- |
| 1 (`ONE_ON_ONE`) | 0% | \(100\% \times P_{\text{1on1}}\) |
| 2 – 3 | 20% | \(80\% \times P_{\text{1on1}}\) |
| 4 – 5 | 35% | \(65\% \times P_{\text{1on1}}\) |
| 6 – 8 | 40% | \(60\% \times P_{\text{1on1}}\) |

**Ví dụ:** \(P_{\text{1on1}} = 8.000.000đ\). Học viên đăng ký khi lớp đang có 3 người (sẽ thành 4) → bậc 4–5 → đóng \(5.200.000đ\). Học viên đã đóng trước đó theo bậc 2–3 **không** được hoàn thêm.

**BR-02.11** — Bậc chiết khấu tính theo sĩ số **sau khi** enrollment này được ghi nhận (sĩ số hiện tại + 1).

---

## 4. Mốc chốt mở lớp nhóm (BR-02.20)

Admin đặt **hạn chốt đăng ký** (mặc định: **3 ngày** trước ngày khai giảng).

| Kết quả tại hạn chốt | Xử lý |
| :--- | :--- |
| Sĩ số \(\ge 2\) và \(\le 8\) | Lớp đủ điều kiện → Admin phân công gia sư → chuyển `ASSIGNED`. |
| Sĩ số \(= 0\) | Lớp `CANCELLED`. Không phát sinh hoàn tiền. |
| Sĩ số \(= 1\) | Lớp `FAILED_TO_OPEN`. Admin chọn: **dời ngày khai giảng** (mở lại đăng ký) **hoặc hoàn 100%** cho học viên **hoặc chuyển sang lớp 1-1** nếu học viên đồng ý. |

Lớp `ONE_ON_ONE` **không** dùng mốc sĩ số tối thiểu 2.

---

## 5. Hoàn tiền

| Mã | Trường hợp | Tỷ lệ hoàn |
| :--- | :--- | :---: |
| **BR-02.30** | Lớp `FAILED_TO_OPEN` hoặc Admin hủy lớp trước khai giảng | 100% |
| **BR-02.31** | Học viên chủ động hủy **trước hạn chốt**, lớp chưa `ASSIGNED` | 100% |
| **BR-02.32** | Học viên hủy **sau khi** lớp đã `ASSIGNED` / `IN_PROGRESS` | 0% (trừ khi Admin duyệt ngoại lệ) |
| **BR-02.33** | Thanh toán thất bại / hết hạn phiên thanh toán | Không tạo enrollment |

---

## 6. Lương gia sư (BR-02.40)

Gia sư nhận **lương tháng** từ Trung tâm, không chia % học phí lớp.

\[
\text{Lương tháng} = \text{Lương cứng HĐ} + (\text{Số buổi dạy hợp lệ} \times \text{Đơn giá buổi})
\]

| Mã | Quy tắc |
| :--- | :--- |
| **BR-02.41** | Lương **không** phụ thuộc cấp học / học phí học viên. Đơn giá buổi do Admin cấu hình theo hợp đồng gia sư. |
| **BR-02.42** | **Buổi dạy hợp lệ** = buổi có trạng thái `COMPLETED` và gia sư đó là người dạy (kể cả dạy thay). |
| **BR-02.43** | Gia sư **gốc** không nhận đơn giá buổi nếu buổi đó do người khác dạy thay. |
| **BR-02.44** | Gia sư **dạy thay** nhận đơn giá buổi cho buổi đó; lương cứng vẫn theo hợp đồng của từng người. |
| **BR-02.45** | Buổi gia sư vắng không có người dạy thay: buổi `CANCELLED` hoặc chuyển học bù; **không** tính đơn giá buổi cho gia sư gốc. |
| **BR-02.46** | Admin chốt bảng lương theo tháng dương lịch. Gia sư chỉ được xem bảng lương của mình. |
