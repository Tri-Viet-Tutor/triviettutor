# VietTriTutor System Documentation

Tài liệu thiết kế hệ thống và quy tắc nghiệp vụ cho dự án **Trung tâm Gia sư VietTriTutor**.

Mô hình: **trung tâm quản lý tập trung** — học viên đăng ký lớp do Admin mở, Admin phân công gia sư Trung tâm, không có gia sư freelance, không bán gói subscription.

## Cấu trúc thư mục tài liệu

```text
documentation/
├── README.md
├── 00-Product-Definition/
│   ├── 01-Functional-Requirements.md
│   ├── 02-Conceptual-Model.md
│   ├── 03-Logical-Data-Model.md
│   ├── 04-Physical-Data-Model.md
│   └── 05-Main-Business-Flows.md
├── 01-Business-Logic/
│   ├── 01-User-Roles-and-Permissions.md
│   ├── 02-Pricing-and-Subscription-Rules.md
│   ├── 03-Scheduling-and-Conflict-Validation.md
│   └── 04-Matching-and-Class-Management.md
└── 02-System-Architecture/
    └── 01-Project-Structure-React-SpringBoot.md
```

### `00-Product-Definition/` — yêu cầu sản phẩm, dữ liệu & luồng nghiệp vụ

| File                              | Nội dung đã chốt                                                                                                                                                                                      |
| :-------------------------------- | :---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **01-Functional-Requirements.md** | Danh sách Functional Requirements (FR) phân làm 5 phân hệ (Authentication, Course & Class, Enrollment & Scheduling, Attendance & Operations, Finance & Payroll) và Ma trận Phân quyền Actor-Function. |
| **02-Conceptual-Model.md**        | Mô hình Dữ liệu Khái niệm (Conceptual Model): Danh sách các thực thể nghiệp vụ độc lập công nghệ, bản đồ quan hệ ngữ nghĩa và sơ đồ Mermaid Conceptual Diagram.                                       |
| **03-Logical-Data-Model.md**      | Mô hình Dữ liệu Logic (Logical Model): Lược đồ quan hệ chuẩn 3NF, danh sách 12 thực thể, khóa PK/FK, thuộc tính logic và sơ đồ Mermaid Logical ERD Diagram.                                           |
| **04-Physical-Data-Model.md**     | Mô hình Dữ liệu Vật lý (Physical Model): Định nghĩa PostgreSQL DDL, kiểu dữ liệu, các ràng buộc Check, khóa ngoại kèm hành vi tham chiếu và chiến lược Index tối ưu hóa truy vấn chặn trùng lịch.     |
| **05-Main-Business-Flows.md**     | Luồng Nghiệp vụ Chính (Main Flows / Happy Paths): Chi tiết 5 chu trình cốt lõi kèm Sequence Diagrams từ lúc mở khóa, học viên đóng tiền, gán gia sư, điểm danh đến chốt lương tháng.                  |

### `01-Business-Logic/` — quy tắc nghiệp vụ

| File                                         | Nội dung đã chốt                                                                                   |
| :------------------------------------------- | :------------------------------------------------------------------------------------------------- |
| **01-User-Roles-and-Permissions.md**         | Thuật ngữ (Khóa/Lớp/Buổi), 3 vai trò, ma trận phân quyền. Học viên **không** tự chọn gia sư.       |
| **02-Pricing-and-Subscription-Rules.md**     | Lớp 1-1 và lớp nhóm 2–8, bảng chiết khấu cố định, hoàn tiền, lương tháng (cứng + buổi dạy hợp lệ). |
| **03-Scheduling-and-Conflict-Validation.md** | Mẫu lịch 2-4-6 / 3-5-7 / 7-CN, khung giờ, chặn trùng gia sư & học viên, xin nghỉ ≥24h / &lt;24h.   |
| **04-Matching-and-Class-Management.md**      | Vòng đời lớp & buổi, điểm danh Online/Offline, Video Call là giai đoạn sau MVP.                    |

### `02-System-Architecture/` — kiến trúc triển khai

- **`01-Project-Structure-React-SpringBoot.md`**: Cấu trúc repo **React (Vite + TypeScript)** + **Java Spring Boot 3**, module backend theo nghiệp vụ, REST API, thứ tự dựng MVP.
