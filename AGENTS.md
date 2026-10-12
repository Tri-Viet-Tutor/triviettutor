# Quy Tắc Phát Triển Dự Án AIVES (Agent Instructions)

Tất cả các AI Agent và Developer khi làm việc trong repository này bắt buộc phải tuân thủ nghiêm ngặt các nguyên tắc sau:

## 1. Docs Là Source of Truth (Single Source of Truth)

- Toàn bộ đặc tả hệ thống nằm trong thư mục `Documentation/`.
- Mọi thay đổi code mới (Backend `backend`, `mobile` `frontend`) **phải bám sát 100% theo tài liệu**.

## 2. Quy Trình "Doc First - Code Later"

- Khi gặp yêu cầu mới, tính năng mới hoặc luồng mà tài liệu chưa định nghĩa:
  1. **Không được tự ý viết code.**
  2. Trao đổi, xác nhận (confirm) phương án với người dùng.
  3. **Cập nhật tài liệu trước** (kiến trúc, business rules, API, UI flow).
  4. Sau khi tài liệu đã chuẩn hóa, mới được tiến hành viết code theo tài liệu.

## 3. Cấm Hardcode Cấu Hình & Dữ Liệu (No Hardcoding)

- Tuyệt đối không hardcode URL, domain, port, credentials, secret key trong mã nguồn.
- Mọi giá trị cấu hình phải đọc từ biến môi trường (`.env`, `@Value`, `import.meta.env`).
- Tuyệt đối không dùng ký tự wildcard bất hợp lệ (như `*` trong `http://localhost:*`) trong các URL hoặc thuộc tính định tuyến vì sẽ làm hỏng URL routing của trình duyệt.
- Với các đường dẫn redirect/callback/email link: ưu tiên nhận diện động từ HTTP header `Origin`/`Referer` hoặc trường client gửi lên, kết hợp fallback biến môi trường đã được sanitize.
