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
│  ├─ motion/            Reveal, ReadingProgress, ClickSpark, ScrollToTop
│  ├─ routing/           PrivateRoute, RoleRoute (chặn theo đăng nhập / vai trò)
│  └─ ui/                Thành phần giao diện nhỏ (Icon)
├─ constants/            Hằng số toàn dự án
│  ├─ api.ts             Đường dẫn endpoint của backend
│  ├─ assets.ts          Đường dẫn ảnh trong public/assets (xem "Thư mục ảnh")
│  ├─ routes.ts          Đường dẫn trang + trang chủ theo vai trò
│  └─ storage.ts         Khoá localStorage
├─ features/             Mã theo từng tính năng
│  └─ home/              Trang chủ
│     ├─ components/     Các khối của trang chủ (HeroSection, CourseDiary, ...)
│     ├─ data/           Nội dung tĩnh (khoá học, gia sư, ảnh mở đầu)
│     ├─ hooks/          Hook chỉ trang chủ dùng (useWhirlwindReveal)
│     └─ styles.ts       Chuỗi lớp Tailwind dùng lại trong trang chủ
├─ hooks/                Custom hook dùng chung (useInView)
├─ layouts/              Khung trang theo khu vực (Public, Auth, Admin, Tutor, Student)
├─ lib/                  Cấu hình thư viện (axios, React Query)
├─ pages/                Mỗi file là một trang gắn với một route
│  ├─ auth/              LoginPage, RegisterPage
│  ├─ error/             ForbiddenPage, NotFoundPage
│  └─ public/            HomePage, SubjectsPage, SearchPage, PricingPage, ContactPage
├─ services/             Hàm gọi API (authService)
├─ stores/               Trạng thái toàn cục bằng zustand (authStore)
├─ styles/               CSS toàn cục
├─ types/                Kiểu dữ liệu khớp với DTO của backend
└─ utils/                Hàm tiện ích thuần
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
| Service | `camelCase`, hậu tố `Service` | `authService.ts` |
| Dữ liệu, tiện ích, hằng số (file) | `camelCase.ts` | `classPractices.ts`, `routes.ts` |
| Ảnh | `kebab-case`, chữ thường, không dấu | `logo-sba.png` |
| Hằng số (giá trị) | `UPPER_SNAKE_CASE` | `ROUTES`, `HERO_SLIDE_MS` |
| Kiểu / interface | `PascalCase`, không tiền tố `I` | `Course`, `AuthResponse` |
| Props của component | tên component + `Props` | `RevealProps` |

## Nguyên tắc

- Dùng named export, không dùng default export.
- Import bằng bí danh `@/` (trỏ tới `src/`), không dùng đường dẫn tương đối dài.
- Không viết thẳng đường dẫn trang hay endpoint trong component: lấy từ `constants/routes.ts` và `constants/api.ts`.
- Component không gọi axios trực tiếp: gọi qua `services/`.
- Kiểu dữ liệu trao đổi với backend chỉ khai báo ở `types/api.ts`; khi backend đổi DTO thì sửa ở đó trước.
- Mã chỉ một tính năng dùng thì đặt trong `features/<tên>/`; khi có nơi thứ hai dùng mới chuyển ra `components/`, `hooks/` hoặc `utils/`.
- Thêm trang mới: tạo file trong `pages/`, khai báo đường dẫn ở `constants/routes.ts`, rồi thêm route trong `app/AppRouter.tsx`.
