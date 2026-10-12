---
trigger: always_on
---

# Nguyên Tắc: Tuyệt Đối Không Hardcode Dữ Liệu & Cấu Hình (No Hardcoding)

## 1. Nguyên Tắc Cốt Lõi

- **Không hardcode cấu hình hệ thống**: Tuyệt đối không viết cứng các giá trị URL, domain, cổng (port), IP, secret key, credential, email trong mã nguồn (Backend Java, Frontend TypeScript, v.v.).
- **Không sử dụng wildcard bất hợp lệ trong URL**: Không đặt các ký tự đại diện (wildcard như `*`, ví dụ `http://localhost:*`) vào các trường URL vì trình duyệt không thể phân giải và sẽ gây lỗi chuyển hướng / redirect hoặc lỗi bảo mật.
- **Nguồn cấu hình duy nhất**: Mọi tham số cấu hình phải được định nghĩa thông qua biến môi trường (`.env`, `application.yml` với cú pháp `${VAR_NAME:default}`, `import.meta.env`).

## 2. Quy Định Triển Khai

1. **Backend**:
   - Mọi cấu hình ngoại vi (database URL, mail server, CORS origins, JWT secret, frontend base URL) phải sử dụng `@Value("${app.property.name}")` hoặc `@ConfigurationProperties`.
   - Với các URL động (như link kích hoạt email, link đặt lại mật khẩu): ưu tiên lấy động từ `Origin` / `Referer` header của request hoặc trường `frontendUrl` do client truyền lên, fallback về biến môi trường `FRONTEND_URL`.
2. **Frontend**:
   - Sử dụng biến môi trường Vite (`import.meta.env.VITE_*`) hoặc các biến runtime chuẩn (`window.location.origin`) cho các lời gọi API và điều hướng.
3. **Môi trường & Mẫu**:
   - Mọi biến môi trường mới bắt buộc phải được khai báo trong `.env` và đồng bộ vào `.env.example` để các thành viên khác dễ kiểm tra và thiết lập.
