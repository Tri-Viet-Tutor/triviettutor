# Conceptual Data Model (Mô hình Dữ liệu Khái niệm)

Tài liệu này định nghĩa **Mô hình Dữ liệu Khái niệm (Conceptual Data Model)** cho hệ thống **VietTriTutor**.
Mô hình khái niệm tập trung vào **nghiệp vụ cấp cao**: các thực thể kinh doanh (Business Entities), ý nghĩa nghiệp vụ của chúng, và mối quan hệ ngữ nghĩa (Semantic Relationships) giữa các thực thể mà **hoàn toàn độc lập với công nghệ cơ sở dữ liệu (Database-agnostic)**.

---

## 1. Danh sách các Thực thể Khái niệm (Conceptual Entities)

Hệ thống VietTriTutor gồm **12 thực thể khái niệm nghiệp vụ** cốt lõi được gom thành 4 miền nghiệp vụ (Business Domains):

```text
Miền 1: Người dùng & Phân quyền (User & Identity Domain)
  1. User (Người dùng) - Tài khoản đại diện cho Admin, Gia sư Trung tâm, hoặc Học viên/Phụ huynh.
  2. Tutor Profile (Hồ sơ Gia sư) - Thông tin bổ sung, bằng cấp và cơ chế đãi ngộ của gia sư thuộc Trung tâm.

Miền 2: Đào tạo & Tổ chức Lớp (Academic & Class Organization Domain)
  3. Course (Khóa học) - Sản phẩm đào tạo gốc (Cấp 1/2/3, Môn học, Học phí chuẩn 1-1, Số buổi).
  4. Class (Lớp học) - Một đợt tổ chức học cụ thể với Mẫu lịch (2-4-6, 3-5-7), Khung giờ ca học, Sĩ số.
  5. Session (Buổi học) - Buổi học cụ thể theo từng ngày diễn ra trong thời gian khóa học.

Miền 3: Đăng ký & Giảng dạy (Enrollment & Teaching Domain)
  6. Enrollment (Đăng ký học) - Học viên ghi danh và đóng học phí trọn gói vào một Lớp học cụ thể.
  7. Teaching Assignment (Phân công Giảng dạy) - Trung tâm chỉ định một Gia sư phụ trách chính một Lớp học.
  8. Session Substitution (Dạy thay Buổi lẻ) - Phân công một Gia sư khác đứng lớp thay cho một buổi cụ thể.

Miền 4: Vận hành & Tài chính (Operations & Finance Domain)
  9. Attendance Record (Ghi nhận Điểm danh) - Kết quả tham gia buổi học của từng học viên (Có mặt, Vắng, Đi trễ, Nghỉ có phép).
 10. Reschedule Request (Yêu cầu Dời buổi / Báo vắng) - Đơn xin nghỉ và đề xuất dời lịch từ học viên hoặc gia sư.
 11. Payment Transaction (Giao dịch Thanh toán / Hoàn tiền) - Dòng tiền học phí đóng vào hoặc hoàn trả cho học viên.
 12. Tutor Monthly Payroll (Bảng Lương Tháng Gia sư) - Bảng quyết toán tiền lương cứng và thù lao dạy hợp lệ hàng tháng.
```

---

## 2. Bản đồ Thực thể Khái niệm & Mối quan hệ Ngữ nghĩa (Conceptual Entities & Relationships)

| Thực thể A         |     Mối quan hệ (Verb Phrase)      | Bản số (Cardinality) | Thực thể B                | Ý nghĩa Nghiệp vụ                                                                                  |
| :----------------- | :--------------------------------: | :------------------: | :------------------------ | :------------------------------------------------------------------------------------------------- |
| **User**           |    mở rộng hồ sơ (has profile)     |      1 — (0..1)      | **Tutor Profile**         | Một User nếu có vai trò `TUTOR` thì sẽ có một hồ sơ năng lực và thỏa thuận lương với Trung tâm.    |
| **User (Student)** |   đăng ký tham gia (enrolls in)    |      1 — (0..N)      | **Enrollment**            | Một Học viên có thể đăng ký nhiều Lớp học khác nhau (miễn không trùng lịch).                       |
| **User (Tutor)**   | được phân công chính (assigned to) |      1 — (0..N)      | **Teaching Assignment**   | Một Gia sư có thể được phân công dạy nhiều Lớp học (hệ thống chặn trùng lịch).                     |
| **Course**         | được mở thành (instantiated into)  |      1 — (0..N)      | **Class**                 | Một Khóa học (Toán 12) có thể mở nhiều Lớp (Lớp 1-1, Lớp nhóm 2-4-6, Lớp nhóm 3-5-7).              |
| **Class**          |      gồm nhiều (composed of)       |      1 — (1..N)      | **Session**               | Mỗi Lớp học khi mở sẽ tự động sinh ra danh sách đầy đủ các Buổi học cụ thể theo mẫu lịch.          |
| **Class**          |        tiếp nhận (receives)        |      1 — (0..N)      | **Enrollment**            | Lớp 1-1 nhận tối đa 1 Enrollment; Lớp Nhóm nhận từ 2 đến 8 Enrollments.                            |
| **Class**          |  có người phụ trách (managed by)   |      1 — (0..1)      | **Teaching Assignment**   | Mỗi Lớp chỉ có duy nhất 1 Gia sư chính tại một thời điểm do Trung tâm gán.                         |
| **Session**        |   ghi nhận tham gia (evaluates)    |      1 — (0..N)      | **Attendance Record**     | Mỗi Buổi học sẽ tạo bản ghi điểm danh cho từng học viên active trong lớp.                          |
| **Session**        |    có thể phát sinh (may have)     |      1 — (0..N)      | **Reschedule Request**    | Một Buổi học có thể có yêu cầu xin nghỉ từ học viên hoặc gia sư.                                   |
| **Session**        |       có thể cần (may have)        |      1 — (0..1)      | **Session Substitution**  | Nếu gia sư chính vắng, buổi học có thể được gán 1 gia sư dạy thay.                                 |
| **Enrollment**     |     thanh toán qua (paid via)      |      1 — (1..N)      | **Payment Transaction**   | Một lần đăng ký sinh ra giao dịch thu tiền ban đầu, và có thể có giao dịch hoàn tiền nếu hủy lớp.  |
| **User (Tutor)**   |    nhận quyết toán (settled in)    |      1 — (0..N)      | **Tutor Monthly Payroll** | Hàng tháng mỗi gia sư được tính lương dựa trên số buổi dạy hợp lệ trong các Session đã hoàn thành. |

---

## 3. Sơ đồ Thực thể Khái niệm theo Ký pháp Chen (Chen's ER Notation)

### 3.1. Quy ước Ký hiệu theo Chuẩn Peter Chen

Theo mô hình ER nguyên bản của Peter Chen (1976):

- **Thực thể mạnh (Strong Entity)**: Biểu diễn bằng **Hình chữ nhật đơn** `[Entity]`.
- **Thực thể yếu (Weak Entity)**: Biểu diễn bằng **Hình chữ nhật nét đôi** `[[Weak Entity]]` (sự tồn tại phụ thuộc thực thể cha, ví dụ: `Session` phụ thuộc `Class`, `Attendance Record` phụ thuộc `Session`).
- **Mối quan hệ (Relationship)**: Biểu diễn bằng **Hình thoi** `{"Tên quan hệ"}`.
- **Thuộc tính (Attribute)**: Biểu diễn bằng **Hình oval/elip** `([Tên thuộc tính])`. Thuộc tính khóa (Key) được gạch chân `([<u>Khóa</u>])`.
- **Bản số (Cardinality)**: Biểu diễn qua các đường nối vô hướng (`---`) mang nhãn tỷ số kết hợp (`1`, `N`, `0..1`, `1..N`, `0..N`).

---

### 3.2. Sơ đồ Tổng quan Thực thể & Mối quan hệ (Conceptual Chen ERD)

```mermaid
flowchart TD
    %% =======================================================
    %% MIỀN 1: NGƯỜI DÙNG & HỒ SƠ
    %% =======================================================
    subgraph DomainIdentity["Miền Người Dùng & Phân Quyền"]
        U["User<br/>(Người dùng)"]
        TP[["Tutor Profile<br/>(Hồ sơ Gia sư)"]]

        REL_PROFILE{"Có hồ sơ<br/>(has_profile)"}

        U ---|"1"| REL_PROFILE ---|"0..1"| TP
    end

    %% =======================================================
    %% MIỀN 2: ĐÀO TẠO & LỚP HỌC
    %% =======================================================
    subgraph DomainAcademic["Miền Khóa Học & Lớp Học"]
        C["Course<br/>(Khóa học)"]
        CLS["Class<br/>(Lớp học mở)"]
        SES[["Session<br/>(Buổi học theo ngày)"]]

        REL_OPEN{"Mở thành lớp<br/>(instantiated_into)"}
        REL_COMP{"Bao gồm buổi<br/>(composed_of)"}

        C ---|"1"| REL_OPEN ---|"0..N"| CLS
        CLS ---|"1"| REL_COMP ---|"1..N"| SES
    end

    %% =======================================================
    %% MIỀN 3: ĐĂNG KÝ & GIẢNG DẠY
    %% =======================================================
    subgraph DomainEnrollment["Miền Đăng Ký & Giảng Dạy"]
        ENR["Enrollment<br/>(Đăng ký học viên)"]
        TA["Teaching Assignment<br/>(Phân công Gia sư chính)"]
        SUB[["Session Substitution<br/>(Dạy thay buổi lẻ)"]]

        REL_ENR_U{"Đăng ký học<br/>(enrolls_in)"}
        REL_ENR_CLS{"Tiếp nhận<br/>(receives)"}

        REL_TA_U{"Nhận lớp dạy<br/>(assigned_to)"}
        REL_TA_CLS{"Chỉ định gia sư<br/>(managed_by)"}

        REL_SUB_SES{"Cần dạy thay<br/>(requires_sub)"}
        REL_SUB_U{"Đảm nhiệm thay<br/>(substitutes)"}

        U ---|"1"| REL_ENR_U ---|"0..N"| ENR
        CLS ---|"1"| REL_ENR_CLS ---|"0..N"| ENR

        U ---|"1"| REL_TA_U ---|"0..N"| TA
        CLS ---|"1"| REL_TA_CLS ---|"0..1"| TA

        SES ---|"1"| REL_SUB_SES ---|"0..1"| SUB
        U ---|"1"| REL_SUB_U ---|"0..N"| SUB
    end

    %% =======================================================
    %% MIỀN 4: VẬN HÀNH, ĐIỂM DANH & TÀI CHÍNH
    %% =======================================================
    subgraph DomainOperations["Miền Vận Hành & Tài Chính"]
        ATT[["Attendance Record<br/>(Điểm danh học viên)"]]
        REQ["Reschedule Request<br/>(Yêu cầu dời/nghỉ)"]
        PAY["Payment Transaction<br/>(Giao dịch thanh toán)"]
        PR["Tutor Monthly Payroll<br/>(Bảng lương tháng)"]

        REL_ATT_SES{"Điểm danh buổi<br/>(evaluates)"}
        REL_ATT_U{"Tham gia học<br/>(attends)"}

        REL_REQ_SES{"Phát sinh từ buổi<br/>(incurs)"}
        REL_REQ_U{"Gửi đơn yêu cầu<br/>(submits)"}

        REL_PAY{"Thanh toán qua<br/>(paid_via)"}
        REL_PR{"Quyết toán lương<br/>(settled_in)"}

        SES ---|"1"| REL_ATT_SES ---|"0..N"| ATT
        U ---|"1"| REL_ATT_U ---|"0..N"| ATT

        SES ---|"1"| REL_REQ_SES ---|"0..N"| REQ
        U ---|"1"| REL_REQ_U ---|"0..N"| REQ

        ENR ---|"1"| REL_PAY ---|"1..N"| PAY
        U ---|"1"| REL_PR ---|"0..N"| PR
    end
```

---

### 3.3. Sơ đồ Chen Chi tiết Thuộc tính Tiêu biểu (Chen ERD with Key Attributes)

Dưới đây là sơ đồ minh họa đầy đủ cấu trúc của **Chen Notation** gồm Thực thể (Hình chữ nhật), Mối quan hệ (Hình thoi) và Thuộc tính (Hình oval) kèm gạch chân cho Thuộc tính định danh (Key Attribute) trên luồng nghiệp vụ xương sống:

```mermaid
flowchart LR
    %% Thực thể
    COURSE["Course<br/>(Khóa học)"]
    CLASS["Class<br/>(Lớp học)"]
    SESSION[["Session<br/>(Buổi học)"]]

    %% Mối quan hệ (Hình thoi)
    REL_OPEN{"Mở thành lớp"}
    REL_COMP{"Bao gồm buổi"}

    %% Thuộc tính của Course (Oval)
    A_C_CODE(["<u>code</u>"]) --- COURSE
    A_C_TITLE(["title"]) --- COURSE
    A_C_SUBJ(["subject"]) --- COURSE
    A_C_FEE(["base_1on1_price"]) --- COURSE

    %% Liên kết Course - Class
    COURSE ---|"1"| REL_OPEN ---|"0..N"| CLASS

    %% Thuộc tính của Class (Oval)
    A_CLS_CODE(["<u>code</u>"]) --- CLASS
    A_CLS_TYPE(["class_type"]) --- CLASS
    A_CLS_SCHED(["schedule_pattern"]) --- CLASS
    A_CLS_CAP(["max_capacity"]) --- CLASS

    %% Liên kết Class - Session
    CLASS ---|"1"| REL_COMP ---|"1..N"| SESSION

    %% Thuộc tính của Session (Oval)
    A_SES_NUM(["<u>session_number</u>"]) --- SESSION
    A_SES_DATE(["session_date"]) --- SESSION
    A_SES_STATUS(["status"]) --- SESSION
```

---

## 4. Tóm tắt Ý nghĩa Nghiệp vụ Cốt lõi

1. **Tính độc lập công nghệ**: Mô hình này không quan tâm cơ sở dữ liệu là SQL (Postgres, MySQL) hay NoSQL.
2. **Nguyên tắc phân định rõ ràng**:
   - Khóa học (`Course`) là định nghĩa trừu tượng; Lớp học (`Class`) là thực thể tổ chức; Buổi học (`Session`) là thực thể thực thi theo thời gian thực.
   - Học viên liên kết với Lớp qua `Enrollment`; Gia sư liên kết với Lớp qua `Teaching Assignment`.
   - Mọi khoản tiền thu vào đi từ `Enrollment` $\rightarrow$ `Payment Transaction`. Mọi khoản tiền chi ra cho nhân sự đi từ `Session` $\rightarrow$ `Tutor Monthly Payroll`.
