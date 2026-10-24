# Kiến trúc Ứng dụng Di động & Đặc tả Giao diện (Mobile App Architecture & Screen Specification)

Tài liệu đặc tả kiến trúc, luồng điều hướng (Navigation), hệ thống thiết kế (Design System) và các màn hình cơ bản của ứng dụng di động **VietTriTutor Mobile**.

Mọi màn hình trên ứng dụng di động được thiết kế đồng bộ trải nghiệm với phiên bản Web (`frontend`), tuân thủ nghiêm ngặt các quy tắc nghiệp vụ trong `Documentation/01-Business-Logic` và các yêu cầu chức năng trong `Documentation/00-Product-Definition`.

---

## 1. Công nghệ & Nền tảng (Technology Stack)

| Thành phần | Công nghệ / Thư viện | Ghi chú |
| :--- | :--- | :--- |
| **Framework** | React Native (0.86), Expo SDK 57 | Hỗ trợ đa nền tảng iOS, Android và Web. |
| **Routing / Navigation** | Expo Router v57 (File-based Routing) | Phân tầng Tabs (`(tabs)/`) và Stack Modals/Routes. |
| **Icons** | `@expo/vector-icons` (Ionicons, MaterialCommunityIcons, Feather) | Hiển thị sắc nét, đồng bộ giao diện trên cả 3 nền tảng. |
| **Design System** | StyleSheet chuẩn mực kết hợp Token màu sắc thương hiệu | Kế thừa bảng màu từ `frontend/tailwind.config.ts`. |
| **Quản lý Cấu hình** | Biến môi trường Expo `EXPO_PUBLIC_API_BASE_URL` | Tuyệt đối không hardcode IP/Port/Domain theo quy tắc No-Hardcoding. |

---

## 2. Hệ thống Thiết kế Đồng bộ (Design Tokens & Aesthetics)

Giao diện Mobile kế thừa 100% bảng màu nhận diện thương hiệu từ phiên bản Web:

- **Màu thương hiệu chính (Brand Navy)**:
  - `primary`: `#0B3A8C` (Navy chủ đạo)
  - `primaryDark`: `#0A2B6B`
  - `surfaceTint`: `#F3F7FF` (Nền thẻ & điểm nhấn xanh nhạt)
- **Màu nhấn & Năng động (Brand Accent & Orange)**:
  - `accentOrange`: `#F5A00F` (Cam năng động - CTA chính, nhãn nổi bật)
  - `accentCream`: `#FFF8E8` (Kem nhẹ nhàng)
- **Màu nền & Bề mặt (Surface & Paper)**:
  - `background`: `#F8FAFC` (Slate-50 sáng sủa, thanh lịch)
  - `surface`: `#FFFFFF` (Card trắng nổi khối mềm với elevation / shadow nhẹ)
  - `cardBorder`: `#E2E8F0`
- **Màu chữ & Văn bản (Typography Colors)**:
  - `textPrimary`: `#14213D` (Chữ chính - mực đậm sắc nét)
  - `textSecondary`: `#52607A` (Chữ phụ, nhãn mô tả)
  - `textMuted`: `#94A3B8` (Ghi chú nhỏ, placeholder)
- **Màu trạng thái nghiệp vụ (Status Semantic Colors)**:
  - `statusSuccess`: `#16A34A` (Đã điểm danh, Đã thanh toán, Hoàn thành)
  - `statusWarning`: `#D97706` (Chờ khai giảng, Đang diễn ra, Đơn xin nghỉ đang chờ)
  - `statusDanger`: `#DC2626` (Vắng mặt, Hủy, Trùng lịch)

---

## 3. Kiến trúc Điều hướng (Information Architecture & Navigation)

```mermaid
graph TD
    Root[App Root _layout.tsx] --> Tabs[(tabs) Bottom Tabs Navigator]
    Root --> AuthStack[Auth Stack]
    Root --> DetailStack[Detail Stack]
    Root --> Modal[System Modal]

    Tabs --> TabHome["1. Trang chủ (index.tsx)"]
    Tabs --> TabCourses["2. Khóa học (courses.tsx)"]
    Tabs --> TabSchedule["3. Lịch học (schedule.tsx)"]
    Tabs --> TabProfile["4. Hồ sơ & Cài đặt (profile.tsx)"]

    AuthStack --> LoginScreen["Đăng nhập (auth/login.tsx)"]
    AuthStack --> RegisterScreen["Đăng ký (auth/register.tsx)"]
    AuthStack --> ForgotPasswordScreen["Quên mật khẩu (auth/forgot-password.tsx)"]

    DetailStack --> CourseDetail["Chi tiết Lớp học (course/[id].tsx)"]
```

---

## 4. Chi tiết Đặc tả Các Màn hình Cơ bản (Screen Specifications)

### 4.1. Màn hình Trang chủ (`(tabs)/index.tsx` - Home Screen)
- **Mục tiêu**: Cung cấp cái nhìn tổng quan cho Học viên / Phụ huynh về trung tâm VietTriTutor, các ca học sắp diễn ra và hành động nhanh.
- **Thành phần giao diện**:
  1. **Header Chào mừng**: Lời chào thân thiện, Avatar người dùng, Nút thông báo chuông.
  2. **Banner Thương hiệu VietTriTutor**: Khẳng định tôn chỉ "Gia sư chất lượng cao cho học sinh THPT Lớp 10, 11, 12", mô hình trung tâm tập trung, cam kết tiến bộ.
  3. **Lối tắt Nhanh (Quick Actions)**:
     - *Tìm lớp mới* $\rightarrow$ dẫn tới Tab Khóa học.
     - *Lịch hôm nay* $\rightarrow$ dẫn tới Tab Lịch học.
     - *Đăng ký 1-kèm-1* $\rightarrow$ lọc lớp 1-kèm-1.
     - *Hỗ trợ / Hotline* $\rightarrow$ mở Modal thông tin liên hệ.
  4. **Widget "Buổi học Kế tiếp" (Next Session Card)**:
     - Hiển thị ca học gần nhất (Môn học, Thời gian slot, Phòng học/Link Online, Tên gia sư).
     - Trạng thái nhắc lịch: Đếm ngược thời gian hoặc báo đến giờ vào học.
  5. **Danh mục Khóa học Nổi bật (Featured Classes)**:
     - Lớp Toán 12 Luyện thi THPT Quốc gia.
     - Lớp Tiếng Anh 11 Bứt phá điểm số.
     - Lớp Vật Lý 10 Nền tảng chuyên sâu.
     - Mỗi card hiển thị: Mác khối lớp (Lớp 10/11/12), Loại lớp (1-kèm-1 hoặc Nhóm 2-8 học sinh), Học phí niêm yết, Lịch tuần (2-4-6 hoặc 3-5-7).

### 4.2. Màn hình Khóa học & Lớp học (`(tabs)/courses.tsx` - Course Catalog Screen)
- **Mục tiêu**: Cho phép học viên duyệt, tìm kiếm và lọc các lớp học phù hợp với nhu cầu.
- **Thành phần giao diện**:
  1. **Thanh tìm kiếm & Lọc nhanh**: Tìm theo tên môn học, giảng viên.
  2. **Bộ lọc Khối lớp THPT (Grade Filter)**: Tất cả, Lớp 10, Lớp 11, Lớp 12.
  3. **Bộ lọc Hình thức & Sĩ số**: Lớp 1-1, Lớp Nhóm (2-8 bạn), Online, Offline tại trung tâm.
  4. **Danh sách Card Lớp học (Class Cards)**:
     - Tiêu đề khóa học, Mã lớp.
     - Khối lớp THPT, Môn học (Toán, Lý, Hóa, Văn, Anh, Sinh...).
     - Lịch tuần: Thứ 2-4-6 (`MON_WED_FRI`), Thứ 3-5-7 (`TUE_THU_SAT`), hoặc Cuối tuần (`SAT_SUN`).
     - Khung giờ: Sáng (08:00-10:00), Chiều (14:00-16:00), Tối 1 (18:00-20:00), Tối 2 (19:30-21:30).
     - Học phí trọn gói minh bạch bám theo bảng chiết khấu BR-02.
     - Tình trạng đăng ký: Số chỗ còn lại / Tổng sĩ số tối đa.
     - Nút "Xem chi tiết / Đăng ký".

### 4.3. Màn hình Lịch học & Lịch dạy (`(tabs)/schedule.tsx` - Schedule Screen)
- **Mục tiêu**: Quản lý lịch trình học tập cho học viên hoặc lịch dạy của gia sư theo ca.
- **Thành phần giao diện**:
  1. **Thanh Chọn Ngày / Tuần (Week Strip Bar)**: Chọn thứ trong tuần hiện tại (T2 -> CN).
  2. **Bộ đếm Thống kê**: Tổng số buổi học trong tuần, số buổi đã hoàn thành, số buổi sắp tới.
  3. **Dòng thời gian Ca học (Session Timeline Cards)**:
     - Hiển thị ca học theo thứ tự thời gian.
     - Thẻ ca học gồm: Tên lớp, Môn học, Thời gian bắt đầu - kết thúc, Hình thức (Phòng học số x hoặc Google Meet/Zoom).
     - Trạng thái ca: `UPCOMING` (Sắp tới), `IN_PROGRESS` (Đang học), `COMPLETED` (Đã học - có đánh giá điểm danh Chuyên cần), `CANCELLED` (Đã hủy).
     - Hành động: Nút "Xin nghỉ học" (gửi yêu cầu `LeaveRequest` trước $\ge 24h$ theo quy tắc BR-03.40).

### 4.4. Màn hình Hồ sơ & Tài khoản (`(tabs)/profile.tsx` - Profile Screen)
- **Mục tiêu**: Quản lý thông tin tài khoản, cài đặt ứng dụng và chuyển đổi đăng nhập.
- **Thành phần giao diện**:
  1. **Header Hồ sơ**: Ảnh đại diện, Tên học viên/gia sư, Email, Vai trò (`Học viên / Phụ huynh`, `Gia sư`, `Admin`).
  2. **Thẻ Tóm tắt Học tập (Learning Stats)**:
     - Số lớp đang tham gia.
     - Tỷ lệ chuyên cần (ví dụ: 96%).
     - Số buổi học tích lũy.
  3. **Nhóm Cài đặt & Tiện ích (Settings & Menu Items)**:
     - Thông tin cá nhân & Số điện thoại liên hệ.
     - Quản lý đơn xin nghỉ học & lịch sử điểm danh.
     - Cài đặt thông báo & nhắc lịch trước giờ học.
     - Giới thiệu về Trung tâm Gia sư VietTriTutor & Cam kết chất lượng.
     - Điều khoản sử dụng & Chính sách bảo mật.
  4. **Nút Đăng nhập / Đăng xuất (Auth Action Button)**.

### 4.5. Màn hình Đăng nhập (`auth/login.tsx` - Login Screen)
- **Mục tiêu**: Cho phép người dùng đăng nhập vào hệ thống bằng tài khoản được cấp hoặc đã đăng ký.
- **Thành phần giao diện**:
  1. Logo VietTriTutor & Khẩu hiệu giáo dục.
  2. Form nhập Email & Mật khẩu (với nút hiển thị/ẩn mật khẩu).
  3. Nút "Đăng nhập" (Primary Navy Button).
  4. Liên kết "Quên mật khẩu?" và "Chưa có tài khoản? Đăng ký ngay".
  5. Đăng nhập mẫu nhanh (Quick Demo Mode) cho phép trải nghiệm với các vai trò Học viên / Gia sư / Admin.

### 4.6. Màn hình Chi tiết Lớp học (`course/[id].tsx` - Course Detail Modal / Screen)
- **Mục tiêu**: Hiển thị đầy đủ thông tin về lớp học, thời lượng, mục tiêu, lộ trình bài giảng và chính sách học phí trước khi đăng ký.
- **Thành phần giao diện**:
  1. Header thông tin khóa & Badge môn học.
  2. Thông số chính: Khối lớp, Số buổi học, Sĩ số tối đa, Hình thức học.
  3. Lộ trình học tập chi tiết (Course Syllabus).
  4. Bảng học phí và chính sách chiết khấu nhóm (bám sát BR-02).
  5. Nút bấm CTA: "Đăng ký tham gia lớp học".

---

## 5. Quy tắc Triển khai Mã nguồn (Implementation Guidelines)

1. **Không Hardcode**: Đọc `EXPO_PUBLIC_API_BASE_URL` qua `Constants.expoConfig?.extra` hoặc `process.env.EXPO_PUBLIC_API_BASE_URL`.
2. **Trải nghiệm Responsive & An toàn**: Sử dụng `SafeAreaView` từ `react-native-safe-area-context` để tránh tai thỏ (notch) và dynamic island trên thiết bị.
3. **Thẩm mỹ cao cấp (Rich Aesthetics)**: Thẻ bo góc `border-radius: 16`, bóng đổ tinh tế `shadowColor` + `elevation`, gradient nhẹ và micro-animations.
