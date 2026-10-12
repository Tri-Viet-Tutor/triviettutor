---
trigger: always_on
---

# Nguyên Tắc: Docs Là Nguồn Chân Lý Duy Nhất (Single Source of Truth)

## 1. Nguyên Tắc Cốt Lõi (Core Principles)

- **Docs là Source of Truth**: Thư mục tài liệu `Documentation/` (và các tài liệu đặc tả kiến trúc, nghiệp vụ, API, workflows) là nguồn chân lý chuẩn xác và cao nhất của toàn bộ hệ thống.
- **Mọi thay đổi code phải bám theo doc**: Trước khi viết code hoặc sửa đổi bất kỳ logic/tính năng nào (Backend, Frontend, Mobile), BẮT BUỘC phải đối chiếu với tài liệu thiết kế. Tuyệt đối không tự suy đoán, code tùy tiện hay đi ngược lại kiến trúc đã quy định.

## 2. Quy Trình Khi Có Yêu Cầu Mới / Chưa Được Định Nghĩa Trong Doc

- **BƯỚC 1 - DỪNG VÀ XÁC NHẬN (Stop & Confirm)**:
  - Nếu xuất hiện yêu cầu mới, màn hình mới, API mới, hoặc luồng nghiệp vụ mà tài liệu hiện tại CHƯA ĐỊNH NGHĨA hoặc còn mâu thuẫn:
  - **TUYỆT ĐỐI KHÔNG ĐƯỢC CODE TRƯỚC.**
  - Phải trao đổi, làm rõ và xác nhận (confirm) phương án thiết kế với người dùng trước.
- **BƯỚC 2 - CẬP NHẬT TÀI LIỆU TRƯỚC (Doc First)**:
  - Sau khi đã thống nhất giải pháp, phải cập nhật đầy đủ vào tài liệu tương ứng trong `AI-powered-Viva-Exam-System/document/` (kiến trúc, nghiệp vụ, API endpoints, sơ đồ luồng, UI/UX,...).
- **BƯỚC 3 - TRIỂN KHAI CODE (Code Implementation)**:
  - Chỉ khi tài liệu đã được cập nhật và đồng bộ hoàn tất, mới được phép tiến hành viết code/sửa code bám sát theo tài liệu đó.
