# Quy Tac Phat Trien Du An TriVietTutor (Agent Instructions)

Tat ca cac AI Agent va Developer khi lam viec trong repository nay bat buoc phai tuan thu nghiem ngat cac nguyen tac sau:

## 1. Docs La Source of Truth (Single Source of Truth)

- Toan bo dac ta he thong nam trong thu muc `Documentation/`.
- Moi thay doi code moi (Backend `backend`, Frontend `frontend`, Mobile `mobile`) **phai bam sat 100% theo tai lieu**.

## 2. Quy Trinh "Doc First - Code Later"

- Khi gap yeu cau moi, tinh nang moi hoac luong ma tai lieu chua dinh nghia:
  1. **Khong duoc tu y viet code.**
  2. Trao doi, xac nhan (confirm) phuong an voi nguoi dung.
  3. **Cap nhat tai lieu truoc** (kien truc, business rules, API, UI flow).
  4. Sau khi tai lieu da chuan hoa, moi duoc tien hanh viet code theo tai lieu.

## 3. Cam Hardcode Cau Hinh & Du Lieu (No Hardcoding)

- Tuyet doi khong hardcode URL, domain, port, credentials, secret key trong ma nguon.
- Moi gia tri cau hinh phai doc tu bien moi truong (`.env`, `@Value`, `import.meta.env`).
- Tuyet doi khong dung ky tu wildcard bat hop le (nhu `*` trong `http://localhost:*`) trong cac URL hoac thuoc tinh dinh tuyen.

## 4. Khong Tu Y Chay Test (No Unrequested Tests)

- **Tuyet doi khong bao gio tu y chay test** (`mvn test`, `npm test`, test runners) tru khi nguoi dung yeu cau truc tiep.
- Khi can build hoac package du an, bat buoc phai bo qua buoc test (vi du: `-DskipTests`).

## 5. Bat Buoc Commit Va Push Len Main Sau Moi Thay Doi (Mandatory Git Delivery)

- **Tat ca cac role (BA, PM, PO, Tech Lead, Backend, Frontend, QA, UI-UX, Architect) khi hoan thanh bat ky thay doi nao (chinh sua docs, cap nhat ticket, viet code, sua bug) deu BAT BUOC phai commit va push ngay len `origin main`**.
- Khong bao gio duoc de lai thay doi chua commit (uncommitted changes) hoac chua push (unpushed commits).
- Quy trinh thuc hien:
  1. `git status` kiem tra cac file da thay doi/tao moi.
  2. `git add <files>` stage dung cac file lien quan.
  3. `git commit -m "[<role/ticket-id>] <mo ta cong viec>"`
  4. `git pull --rebase origin main` (neu can giai quyet conflicts)
  5. `git push origin main`
