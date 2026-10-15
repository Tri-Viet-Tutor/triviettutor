# TriVietTutor — Frontend

React 18 + TypeScript + Vite + Tailwind CSS. Backend tương ứng: `../backend` (Spring Boot, tiền tố API `/api/v1`).

## Chạy dự án

```bash
npm install
npm run dev        # máy chủ phát triển
npm run build      # kiểm tra kiểu + đóng gói
npm run lint       # kiểm tra code bằng ESLint
npm run format     # định dạng code bằng Prettier
```

## Cấu trúc thư mục

```
src/
├─ app/                  Khởi tạo ứng dụng
│  ├─ AppProviders.tsx   React Query và các provider dùng chung
│  └─ AppRouter.tsx      Khai báo toàn bộ route
├─ pages/                Mỗi file là một trang gắn với một route (chỉ ghép component, ít logic)
│  ├─ admin/             AdminHomePage, AdminUsersPage, AdminSessionsPage, AdminReschedulesPage (/admin/reschedules), AdminAssignmentsPage
│  ├─ auth/              LoginPage, RegisterPage, VerifyEmailPage, ForgotPasswordPage, ResetPasswordPage
│  ├─ error/             ForbiddenPage, NotFoundPage
│  ├─ portal/            ProfilePage (Hồ sơ — ba khu dùng chung)
│  ├─ public/            HomePage, SubjectsPage, SearchPage, PricingPage, CheckoutPage, ContactPage
│  ├─ student/           StudentHomePage, StudentSchedulePage, StudentCatalogPage (/student/catalog), StudentCheckoutPage, StudentLeavePage
│  └─ tutor/             TutorHomePage, TutorSchedulePage, TutorAvailabilityPage, TutorLeavePage
├─ layouts/              Khung trang theo khu vực (Public, Auth; PortalLayout là khung chung của Admin, Tutor, Student)
├─ components/           Component giao diện
│  ├─ ui/                Dùng lại mọi nơi (Icon, SectionHeading, FramedSlideshow, ConsultCtaSection, FaqSection, QrCode, ErrorScreen)
│  ├─ layout/            PublicHeader, PublicFooter
│  ├─ motion/            Hiệu ứng động: Reveal, ReadingProgress, ClickSpark, ScrollToTop, Fireworks, Sparkle
│  ├─ routing/           PrivateRoute, RoleRoute, LegacyRedirect
│  ├─ auth/              Ô nhập, ô mã OTP, form nhập mã OTP email, hộp báo, nút gửi, tấm giới thiệu
│  ├─ home/ catalog/ tutors/ pricing/ contact/   Các khối của từng trang công khai
│  ├─ checkout/          Luồng thanh toán (CheckoutFlow, form thông tin, thẻ ATM demo, mã QR VNPay, tóm tắt đơn hàng…)
│  ├─ portal/            Dùng chung cho ba khu sau đăng nhập (thanh điều hướng, bảng hôm nay, lịch buổi, điểm danh, xin nghỉ, hồ sơ…)
│  ├─ admin/ tutor/ student/   Component riêng của từng khu
├─ services/             Gọi API (axios)
│  ├─ api.ts             Axios dùng chung (gắn JWT, xử lý 401) + đọc dữ liệu / lỗi từ khung ApiResponse
│  ├─ queryClient.ts     Cấu hình TanStack Query
│  ├─ authService.ts     Đăng nhập, đăng ký, OTP, quên / đặt lại mật khẩu
│  ├─ portalService.ts   /me, /me/sessions, điểm danh, đơn xin nghỉ của tôi
│  ├─ adminService.ts    /admin/users, /admin/sessions, /admin/leave-requests, /admin/classes/{id}/…
│  ├─ tutorService.ts    /tutor/availability
│  └─ orderService.ts    Đặt mua + thanh toán VNPay (đang chạy demo — backend chưa có)
├─ interfaces/           Kiểu dữ liệu (interface / type)
│  ├─ api.ts             Khớp với DTO / enum của backend
│  └─ admin, auth, checkout, course, portal, pricing, tutor, ui   Kiểu dùng ở phía giao diện
├─ hooks/                Custom hook: useInView, useCountdown, useNow, useDebouncedValue, useWhirlwindReveal,
│                        useAdminData, usePortalData (tải dữ liệu bằng TanStack Query)
├─ utils/                Hàm xử lý thuần: date, currency, text, motion, qrcode, sessions (tính trên buổi học),
│                        errors (câu báo lỗi), pendingEmail, checkout, pricing, classes, contact, tutors
├─ constants/            Hằng số và dữ liệu tĩnh: routes, assets, classNames (lớp Tailwind dùng chung), nav, labels,
│                        rules, auth, courses, classOptions, home, catalog, pricing, tutors, contact, checkout, doodle
├─ stores/               Trạng thái toàn cục bằng Zustand (authStore, cartStore — giỏ lưu theo phiên trình duyệt)
├─ preview/              Chế độ xem thử, chỉ có khi `npm run dev`: chưa đăng nhập mà mở `/admin`, `/tutor` thì vào bằng tài khoản và dữ liệu mẫu, không cần backend; đặt `VITE_PREVIEW=false` để tắt; bản build thật không chứa
└─ styles/               CSS toàn cục
```

Quy ước phụ thuộc: `pages` → `components` → `hooks` → `services` → `interfaces`; `utils` và `constants` dùng được ở mọi nơi.

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

| Loại                              | Quy ước                                        | Ví dụ                                   |
| --------------------------------- | ---------------------------------------------- | --------------------------------------- |
| Thư mục                           | chữ thường, tiếng Anh                          | `components/routing`, `components/home` |
| Component React                   | `PascalCase.tsx`, tên file trùng tên component | `TutorCard.tsx` → `TutorCard`           |
| Trang                             | hậu tố `Page`                                  | `HomePage.tsx`                          |
| Khung trang                       | hậu tố `Layout`                                | `PublicLayout.tsx`                      |
| Khối lớn của một trang            | hậu tố `Section`                               | `HeroSection.tsx`                       |
| Hook                              | `camelCase`, tiền tố `use`                     | `useInView.ts`                          |
| Store                             | `camelCase`, hậu tố `Store`                    | `authStore.ts` → `useAuthStore`         |
| Dữ liệu, tiện ích, hằng số (file) | `camelCase.ts`                                 | `classPractices.ts`, `routes.ts`        |
| Ảnh                               | `kebab-case`, chữ thường, không dấu            | `logo-sba.png`                          |
| Hằng số (giá trị)                 | `UPPER_SNAKE_CASE`                             | `ROUTES`, `HERO_SLIDE_MS`               |
| Kiểu / interface                  | `PascalCase`, không tiền tố `I`                | `Course`, `AuthResponse`                |
| Props của component               | tên component + `Props`                        | `RevealProps`                           |

## Thanh toán

Trang `/thanh-toan` mặc định chạy **demo**: mã đơn, thẻ và mã QR tạo ngay trên trình duyệt, không có giao dịch thật.
Khi backend có API VNPay, đặt `VITE_PAYMENT_DEMO=false` trong `.env.local` để chuyển sang thanh toán thật.
Các API frontend sẽ gọi được ghi ở `src/services/orderService.ts`.

## Nguyên tắc

- Dùng named export, không dùng default export.
- Import bằng bí danh `@/` (trỏ tới `src/`), không dùng đường dẫn tương đối dài.
- Không viết thẳng đường dẫn trang trong component: lấy từ `constants/routes.ts`.
- Đăng nhập, đăng ký và phân quyền theo vai trò dùng `services/authService.ts`, `stores/authStore.ts` và `components/routing/`.
- Kiểu dữ liệu trao đổi với backend chỉ khai báo ở `interfaces/api.ts`; khi backend đổi DTO thì sửa ở đó trước.
- Component đặt trong `components/<khu>/`; gọi API trong `services/`; kiểu dữ liệu trong `interfaces/`; hàm xử lý trong `utils/`; dữ liệu tĩnh trong `constants/`.
- Thêm trang mới: tạo file trong `pages/`, khai báo đường dẫn ở `constants/routes.ts`, rồi thêm route trong `app/AppRouter.tsx`.
