# TriVietTutor — Frontend

React 18 + TypeScript + Vite + Tailwind CSS. Backend tương ứng: `../backend` (Spring Boot, tiền tố API `/api/v1`).

## Chạy dự án

```bash
npm install
npm run dev        # máy chủ phát triển
npm run build      # kiểm tra kiểu + đóng gói
```

## Cấu trúc thư mục

```
src/
├─ app/                  Khởi tạo ứng dụng
│  ├─ AppProviders.tsx   React Query và các provider dùng chung
│  └─ AppRouter.tsx      Khai báo toàn bộ route
├─ components/           Thành phần dùng chung cho nhiều trang
│  ├─ layout/            PublicHeader, PublicFooter
│  ├─ motion/            Reveal, ReadingProgress, ClickSpark, ScrollToTop, Fireworks
│  ├─ routing/           PrivateRoute, RoleRoute (chặn theo đăng nhập / vai trò)
│  └─ ui/                Thành phần giao diện dùng lại (Icon, SectionHeading, FramedSlideshow, ConsultCtaSection, FaqSection, QrCode)
├─ constants/            Hằng số toàn dự án
│  ├─ assets.ts          Đường dẫn ảnh trong public/assets (xem "Thư mục ảnh")
│  ├─ classNames.ts      Chuỗi lớp Tailwind dùng lại giữa các trang công khai
│  └─ routes.ts          Đường dẫn trang
├─ features/             Mã theo từng tính năng
│  ├─ auth/              Các trang xác thực (đăng nhập, đăng ký, OTP, quên mật khẩu)
│  │  ├─ api/            Lời gọi verify-email, resend-verification, quên / đặt lại mật khẩu
│  │  ├─ components/     Ô nhập, ô mã OTP, form nhập mã OTP email, hộp báo, nút gửi, tấm giới thiệu
│  │  └─ data/           Câu báo lỗi theo mã lỗi backend, email đang chờ xác thực
│  ├─ catalog/           Trang "Khối lớp / Môn học"
│  │  ├─ components/     Phiếu chọn lớp, sĩ số và tiện ích lớp học, các bước đăng ký
│  │  └─ data/           Khoá học theo môn + các lựa chọn khớp enum của backend
│  ├─ checkout/          Trang "Thanh toán" (điền thông tin → thanh toán → tạo tài khoản)
│  │  ├─ api/            Tạo mã thanh toán VNPay và xác nhận (đang chạy demo — backend chưa có)
│  │  ├─ components/     CheckoutFlow (cả luồng, trang công khai và khu học viên dùng chung), dãy bước, form thông tin học viên, form thanh toán, thẻ ATM demo, mã QR VNPay, form tạo tài khoản sau thanh toán, tóm tắt đơn hàng, GuestCartScope (khách rời luồng mua thì xóa giỏ)
│  │  └─ data/           Khóa trong giỏ, tổng tiền, cờ PAYMENT_DEMO, mã thanh toán demo và thẻ thử nghiệm
│  ├─ contact/           Trang "Liên hệ"
│  │  ├─ components/     Các cách liên hệ, lá thư đăng ký tư vấn (mở ứng dụng thư)
│  │  └─ data/           Kênh liên hệ và hàm tạo thư điền sẵn
│  ├─ home/              Trang chủ
│  │  ├─ components/     Các khối của trang chủ (HeroSection, CourseDiary, ...)
│  │  ├─ data/           Nội dung tĩnh (gia sư, ảnh mở đầu, cách tổ chức lớp)
│  │  └─ hooks/          Hook chỉ trang chủ dùng (useWhirlwindReveal)
│  ├─ pricing/           Trang "Mua khóa học" (trước là "Bảng học phí")
│  │  ├─ components/     Thẻ giá, bộ lọc, vé lớp học (CourseTicket), thanh giỏ hàng, ảnh hình thức học, lịch mở đăng ký
│  │  └─ data/           Nhãn lịch học, đợt mở đăng ký; shopFilters.ts tìm / lọc / sắp xếp khoá
│  ├─ portal/            Phần dùng chung của ba khu sau đăng nhập (học viên, gia sư, quản trị) — chỉ dùng dữ liệu backend đang có
│  │  ├─ api/            GET/PUT /me, GET /me/sessions, GET + PUT /sessions/{id}/attendance, GET /me/leave-requests, POST /sessions/{id}/leave
│  │  ├─ components/     Thanh điều hướng (PortalNav), lời chào, bảng buổi hôm nay (TodayPanel) có linh vật kiến (AntMascot: vác lá, cầm bút, đọc sách), lịch tuần, lịch các buổi (SessionSchedule, SessionRow), điểm danh cả lớp (AttendanceEditor), trung tâm xin nghỉ (LeaveCenter), form hồ sơ, thẻ lọc, phân trang, khung chờ / lỗi / trống
│  │  ├─ data/           Tính toán trên buổi học (sessions.ts), nhãn trạng thái và vai trò (labels.ts), câu báo lỗi theo mã backend (errors.ts), kiểu dáng chung (ui.ts)
│  │  └─ hooks/          Hook tải dữ liệu bằng React Query (usePortalData)
│  ├─ student/           Khu học viên (/student/*); trang mua khóa học và thanh toán trong khu này dùng lại features/pricing và features/checkout
│  │  ├─ components/     Chi tiết buổi học, tiến độ lớp, điểm danh gần đây, hồ sơ học tập
│  │  └─ data/           Mục điều hướng
│  ├─ tutor/             Khu gia sư (/tutor/*)
│  │  ├─ api/            GET + PUT /tutor/availability
│  │  ├─ components/     Chi tiết buổi dạy (điểm danh, xin nghỉ dạy), bảng khai lịch rảnh
│  │  └─ data/           Mục điều hướng
│  ├─ admin/             Khu quản trị (/admin/*)
│  │  ├─ api/            /admin/users, /admin/sessions, /admin/leave-requests, /admin/classes/{id}/… (xem adminApi.ts)
│  │  ├─ components/     Bảng việc cần xử lý, danh sách người dùng, form gia sư, bộ lọc và chi tiết buổi học, điểm danh của quản trị, thẻ xử lý đơn xin nghỉ, chọn lớp và phân công gia sư, form lý do
│  │  ├─ data/           Mục điều hướng
│  │  └─ hooks/          Hook tải dữ liệu bằng React Query (useAdminData), tra tên người dùng theo mã
│  └─ tutors/            Trang "Tìm gia sư"
│     ├─ components/     Thanh tìm, danh sách gia sư, hồ sơ gia sư
│     └─ data/           Danh sách gia sư gom từ các khoá học + hàm lọc
├─ hooks/                Custom hook dùng chung (useInView, useCountdown, useNow, useDebouncedValue)
├─ layouts/              Khung trang theo khu vực (Public, Auth; PortalLayout là khung chung của Admin, Tutor, Student)
├─ lib/                  axios, React Query, qrcode.ts (tạo mã QR), và auth.ts (gọi API đăng nhập / đăng ký, trang đích theo vai trò)
├─ pages/                Mỗi file là một trang gắn với một route
│  ├─ AccountDashboard.tsx, SessionListPage.tsx   Hai trang tạm ban đầu, không còn gắn route
│  ├─ admin/             AdminHomePage (Tổng quan), AdminUsersPage (Người dùng), AdminSessionsPage (Buổi học), AdminLeaveRequestsPage (Đơn xin nghỉ), AdminAssignmentsPage (Phân công gia sư)
│  ├─ auth/              LoginPage, RegisterPage, VerifyEmailPage, ForgotPasswordPage, ResetPasswordPage
│  ├─ error/             ForbiddenPage, NotFoundPage
│  ├─ portal/            ProfilePage (Hồ sơ — ba khu dùng chung)
│  ├─ public/            HomePage, SubjectsPage, SearchPage, PricingPage, CheckoutPage, ContactPage
│  ├─ student/           StudentHomePage (Tổng quan), StudentSchedulePage (Lịch học), StudentCoursesPage (Mua khóa học), StudentCheckoutPage (Thanh toán), StudentLeavePage (Xin nghỉ)
│  └─ tutor/             TutorHomePage (Tổng quan), TutorSchedulePage (Lịch dạy), TutorAvailabilityPage (Lịch rảnh), TutorLeavePage (Xin nghỉ)
├─ preview/              Chế độ xem thử, chỉ có khi `npm run dev`: chưa đăng nhập mà mở `/admin`, `/tutor` thì vào bằng tài khoản và dữ liệu mẫu, không cần backend; đặt `VITE_PREVIEW=false` để tắt; bản build thật không chứa
├─ stores/               Trạng thái toàn cục bằng zustand (authStore, cartStore — giỏ lưu theo phiên trình duyệt)
├─ styles/               CSS toàn cục
├─ types/                Kiểu dữ liệu khớp với DTO của backend
└─ utils/                Hàm tiện ích thuần (motion, text, currency, date)
```

## Thư mục ảnh

Ảnh tĩnh nằm trong `public/assets/`, chia theo khu vực / vai trò giống `src/pages` và `src/layouts`:

```
public/assets/
├─ common/            Dùng chung cho mọi vai trò
│  ├─ brand/          Logo
│  └─ mascots/        Linh vật
├─ public/            Trang công khai (khách chưa đăng nhập)
│  ├─ classrooms/     Ảnh lớp học (ảnh tự chuyển ở trang chủ)
│  ├─ tutors/         Ảnh giảng viên: ten-thay-co-mon.png
│  ├─ achievements/   Ảnh thành tích học viên
│  ├─ students/       Ảnh học sinh
│  ├─ tutoring/       Ảnh buổi học kèm
│  └─ contact/        Ảnh trang liên hệ
├─ auth/              Trang đăng nhập, đăng ký
├─ admin/             Khu vực quản trị viên
├─ tutor/             Khu vực gia sư
└─ student/           Khu vực học viên
```

- Ảnh chỉ một vai trò dùng thì đặt trong thư mục của vai trò đó; từ hai vai trò trở lên dùng thì đặt trong `common/`.
- Tên file ảnh viết `kebab-case`, chữ thường, không dấu: `classroom-1.png`, `ho-duc-thuan-toan.png`.
- Mỗi ảnh khai báo một lần trong `src/constants/assets.ts` (cùng cấu trúc nhóm với thư mục) và dùng qua `ASSETS`, ví dụ `ASSETS.common.logo`, `ASSETS.public.tutors.trangAnh`.

## Quy ước đặt tên

| Loại | Quy ước | Ví dụ |
| --- | --- | --- |
| Thư mục | chữ thường, tiếng Anh | `components/routing`, `features/home` |
| Component React | `PascalCase.tsx`, tên file trùng tên component | `TutorCard.tsx` → `TutorCard` |
| Trang | hậu tố `Page` | `HomePage.tsx` |
| Khung trang | hậu tố `Layout` | `PublicLayout.tsx` |
| Khối lớn của một trang | hậu tố `Section` | `HeroSection.tsx` |
| Hook | `camelCase`, tiền tố `use` | `useInView.ts` |
| Store | `camelCase`, hậu tố `Store` | `authStore.ts` → `useAuthStore` |
| Dữ liệu, tiện ích, hằng số (file) | `camelCase.ts` | `classPractices.ts`, `routes.ts` |
| Ảnh | `kebab-case`, chữ thường, không dấu | `logo-sba.png` |
| Hằng số (giá trị) | `UPPER_SNAKE_CASE` | `ROUTES`, `HERO_SLIDE_MS` |
| Kiểu / interface | `PascalCase`, không tiền tố `I` | `Course`, `AuthResponse` |
| Props của component | tên component + `Props` | `RevealProps` |

## Thanh toán

Trang `/thanh-toan` mặc định chạy **demo**: mã đơn, thẻ và mã QR tạo ngay trên trình duyệt, không có giao dịch thật.
Khi backend có API VNPay, đặt `VITE_PAYMENT_DEMO=false` trong `.env.local` để chuyển sang thanh toán thật.
Các API frontend sẽ gọi được ghi ở `src/features/checkout/api/orderApi.ts`.

## Nguyên tắc

- Dùng named export, không dùng default export.
- Import bằng bí danh `@/` (trỏ tới `src/`), không dùng đường dẫn tương đối dài.
- Không viết thẳng đường dẫn trang trong component: lấy từ `constants/routes.ts`.
- Đăng nhập, đăng ký và phân quyền theo vai trò dùng `lib/auth.ts`, `stores/authStore.ts` và `components/routing/`.
- Kiểu dữ liệu trao đổi với backend chỉ khai báo ở `types/api.ts`; khi backend đổi DTO thì sửa ở đó trước.
- Mã chỉ một tính năng dùng thì đặt trong `features/<tên>/`; khi có nơi thứ hai dùng mới chuyển ra `components/`, `hooks/` hoặc `utils/`.
- Thêm trang mới: tạo file trong `pages/`, khai báo đường dẫn ở `constants/routes.ts`, rồi thêm route trong `app/AppRouter.tsx`.
