# Dac Ta Luu Tru Meeting Logs Va Attendance Voi MongoDB (Local & Docker)

Ngay tao: 25/10/2026. Cap nhat: 09/11/2026 (Ho tro chay Local & Docker Compose).
Pham vi: Dac ta ket noi MongoDB (chay tren local host hoac Docker Compose container) va cau truc Document Collections cho viec ghi nhan nhat ky phong hoc truc tuyen (LiveKit Session Logs) va nhat ky diem danh nguoi tham gia (Participant Attendance Logs).

## 1. Muc Dich Su Dung MongoDB

He thong phong hoc LiveKit phat sinh luu luong event lien tuc voi tan suat cao (participant-joined, participant-left, track-published, track-muted, audio-energy-active, disconnect).
PostgreSQL/Supabase duoc dung cho du lieu quan he cot loi (User, ClassGroup, Schedule, Enrollment, Payment).
MongoDB duoc su dung lam kho luu tru Document Audit Log phi cau truc voi cac uu diem:
- Toc do ghi cao (High write throughput), phu hop ghi nhan event stream tu LiveKit Webhook.
- Schema linh hoat (Flexible JSON schema) cho phep mo rong payload su kien, metadata cua LiveKit ma khong can chay migration schema PostgreSQL lien tuc.
- Tach biet tai nguyen giua transaction nghiep vu (PostgreSQL) va nhat ky phong hoc (MongoDB).
- Dong bo moi truong phat trien (Local / Docker): Thanh vien team co the chay MongoDB cuc bo tren may hoac tu dong bat container MongoDB qua Docker Compose thong qua `run_all.ps1`.

## 2. Bien Moi Truong Cau Hinh (No Hardcoding)

He thong doc cau hinh tu bien moi truong thong qua application.yml:

| Bien Moi Truong | Y Nghia | Gia Tri Mac Dinh / Vi Du |
|---|---|---|
| MONGODB_URI | Chuoi ket noi MongoDB | `mongodb://localhost:27017/triviettutor` (Host) hoac `mongodb://mongodb:27017/triviettutor` (Docker) |
| MONGODB_DATABASE | Ten database can su dung | `triviettutor` |
| LOCAL_MONGO_HOST_PORT | Cong port map tu Docker ra host | `27017` |
| LOCAL_MONGO_DATABASE | Ten database khoi tao trong Docker | `triviettutor` |

## 3. Cau Truc Cac Document Collections

### 3.1. Collection: meeting_session_logs

Luu tru thong tin tong the cua mot phien phong hoc LiveKit tu luc bat dau toi khi ket thuc.

Cac truong du lieu:
- id (String): Khoa chinh MongoDB (ObjectId).
- sessionId (String): Ma dinh danh duy nhat cua session LiveKit (indexed).
- roomName (String): Ten phong LiveKit (indexed), vi du: classroom-session-101.
- classGroupId (Long): ID lop hoc tuong ung ben PostgreSQL (indexed, nullable).
- scheduleId (Long): ID lich hoc tuong ung ben PostgreSQL (indexed, nullable).
- hostUserId (Long): ID giang vien/chu phong (indexed).
- startTime (Instant): Thoi diem bat dau phien hoc.
- endTime (Instant): Thoi diem ket thuc phien hoc.
- durationSeconds (Long): Tong thoi luong phien hoc tinh bang giay.
- status (String): Trang thai phien (ACTIVE, COMPLETED, TERMINATED, FAILED).
- maxParticipants (Integer): So luong nguoi tham gia dong thoi cao nhat.
- totalParticipantsCount (Integer): Tong so luot nguoi da tung tham gia.
- recordingUrl (String): Duong dan ban ghi am/hinh (neu co).
- metadata (Map<String, Object>): Du lieu mo rong tu LiveKit room metadata.
- createdAt (Instant): Thoi diem tao ban ghi log.
- updatedAt (Instant): Thoi diem cap nhat ban ghi log.

### 3.2. Collection: meeting_participant_logs

Luu tru chi tiet diem danh, thoi gian ra/vao va chuoi su kien cua tung hoc vien va giang vien trong phien phong hoc.

Cac truong du lieu:
- id (String): Khoa chinh MongoDB (ObjectId).
- sessionId (String): Session ID lien ket voi meeting_session_logs (indexed).
- roomName (String): Ten phong LiveKit (indexed).
- userId (Long): ID nguoi dung ben he thong PostgreSQL (indexed).
- userRole (String): Vai tro nguoi dung (TUTOR, STUDENT, ADMIN, GUEST).
- participantIdentity (String): Identity chuoi duoc cap trong LiveKit token.
- participantName (String): Ho ten hien thi cua nguoi tham gia.
- joinedAt (Instant): Thoi diem tham gia phong.
- leftAt (Instant): Thoi diem roi phong hoac mat ket noi.
- durationSeconds (Long): Tong so giay co mat trong phong.
- disconnectReason (String): Ly do roi phong (CLIENT_INITIATED, ROOM_CLOSED, PING_TIMEOUT, UNKNOWN).
- eventHistory (List<ParticipantEvent>): Lich su cac hanh vi trong phong:
  - event (String): Ten su kien (JOINED, PUBLISHED_AUDIO, PUBLISHED_VIDEO, MUTED_AUDIO, UNMUTED_AUDIO, SCREEN_SHARE_STARTED, LEFT).
  - timestamp (Instant): Thoi diem xay ra su kien.
  - details (Map<String, Object>): Du lieu chi tiet su kien.
- createdAt (Instant): Thoi diem tao ban ghi.
- updatedAt (Instant): Thoi diem cap nhat ban ghi.

## 4. Kien Truc Dong Thoi Spring Data JPA va Spring Data MongoDB

Du an su dung ca PostgreSQL (JPA) va MongoDB Atlas (Mongo Data). De ngan chan Spring Data scan lan repository:
1. Mongo Repositories duoc dat doc lap trong package: `com.viettritutor.repository.mongo`.
2. Mongo Documents duoc dat doc lap trong package: `com.viettritutor.document`.
3. Cau hinh `@EnableMongoRepositories(basePackages = "com.viettritutor.repository.mongo")` trong `MongoConfig.java`.
4. Cau hinh `@EnableJpaRepositories(basePackages = "com.viettritutor.repository", excludeFilters = @ComponentScan.Filter(type = FilterType.REGEX, pattern = "com\\.viettritutor\\.repository\\.mongo\\..*"))` trong `JpaConfig.java`.
