# Hướng Dẫn & Prompt Giao Task Cho Agent: Tích Hợp Phòng Học Online (1-Nhiều) Tự Host Với LiveKit

Tài liệu này bao gồm cấu hình **Docker Local**, bản thiết kế kỹ thuật cho **Spring Boot + React (Vite) + Supabase**, và **Prompt mẫu** để bạn copy-paste trực tiếp cho Coding Agent (Cursor, Windsurf, GitHub Copilot, Claude Code...) tự sinh code vào dự án đồ án môn học của bạn mà không cần đọc hay dịch ngược repo bên ngoài.

## 1. Tổng Quan Kiến Trúc Chạy Local (100% Tự Host)

Trong mô hình lớp học 1-nhiều (1 Gia sư dạy nhiều Học sinh), hệ thống sử dụng [LiveKit Server](https://github.com/livekit/livekit) chạy trên Docker làm Media Server (SFU) kết hợp với [LiveKit Kotlin/Java Server SDK](https://github.com/livekit/server-sdk-kotlin) ở Spring Boot và [@livekit/components-react](https://github.com/livekit/components-js) ở React Vite.

| Thành phần | Công nghệ sử dụng | Cổng chạy Local | Vai trò trong đồ án |
| :--- | :--- | :--- | :--- |
| **Media Server (SFU)** | Docker `livekit/livekit-server` (`--dev`) | `7880` (HTTP/WS), `7881` (TCP), `7882/udp` | Nhận 1 luồng video/màn hình từ Gia sư và phân phối cho nhiều Học sinh, không qua bên thứ ba |
| **Backend API** | Spring Boot + `io.livekit:livekit-server` | `8080` | Kiểm tra lịch học/lớp học trong **Supabase**, phân quyền Gia sư (`roomAdmin`) vs Học sinh, ký JWT Token |
| **Frontend UI** | React (Vite) + `@livekit/components-react` | `5173` | Hiển thị giao diện phòng học (chia lưới camera, chia sẻ màn hình, chat, giơ tay) và bảng trắng [@excalidraw/excalidraw](https://www.npmjs.com/package/@excalidraw/excalidraw) |
| **Database** | Supabase (PostgreSQL) | Cloud / Local | Lưu thông tin lớp học (`classes`/`bookings`), danh sách học viên và trạng thái buổi học |

## 2. Bước 1: Chạy LiveKit Media Server Bằng Docker (Mất 30 Giây)

Khi chạy ở chế độ `--dev`, [LiveKit Server](https://docs.livekit.io/transport/self-hosting/vm/) tự động cấu hình sẵn cặp khóa mặc định (`API Key: devkey`, `API Secret: secret`) và cho phép kết nối trực tiếp qua `ws://localhost:7880` mà không đòi hỏi chứng chỉ HTTPS phức tạp.

### Cách 1: Chạy nhanh bằng 1 câu lệnh Terminal
```bash
docker run --rm -p 7880:7880 -p 7881:7881 -p 7882:7882/udp livekit/livekit-server --dev
```

### Cách 2: Thêm vào file `docker-compose.yml` có sẵn của dự án
```yaml
services:
  livekit:
    image: livekit/livekit-server:latest
    command: --dev --bind 0.0.0.0
    ports:
      - "7880:7880"
      - "7881:7881"
      - "7882:7882/udp"
    restart: unless-stopped
```

## 3. Bước 2: Copy Prompt Này Đưa Cho Coding Agent Của Bạn

Bạn hãy copy toàn bộ nội dung trong khung dưới đây và dán vào khung chat của Agent đang mở trong source code dự án của bạn:

```markdown
Tôi muốn tích hợp chức năng Phòng học trực tuyến (Meeting Online 1-nhiều cho Gia sư và Học sinh) trực tiếp vào dự án hiện tại (Backend: Spring Boot, Database: Supabase PostgreSQL, Frontend: React Vite).
Tôi đã chạy sẵn container Docker `livekit/livekit-server --dev` ở cổng `ws://localhost:7880` với `API Key = devkey` và `API Secret = secret`.

Hãy đọc cấu trúc Auth, User và Lớp học/Ca học hiện tại trong project của tôi và tự sinh code mới cho tính năng Meeting theo đúng các yêu cầu kỹ thuật sau (không cần clone repo ngoài):

### Phần 1: Backend (Spring Boot)
1. Thêm dependency chính thức của LiveKit vào `pom.xml` (hoặc `build.gradle`):
   - GroupId: `io.livekit`
   - ArtifactId: `livekit-server`
   - Version: `0.8.4`
2. Thêm cấu hình vào `application.properties` / `application.yml`:
   - `livekit.url=ws://localhost:7880`
   - `livekit.api.key=devkey`
   - `livekit.api.secret=secret`
3. Tạo `MeetingController` và `MeetingService` với endpoint `POST /api/meetings/{classOrBookingId}/token`:
   - Lấy thông tin User đang đăng nhập từ SecurityContext / JWT hiện tại của hệ thống.
   - Kiểm tra trong Database (Supabase) xem User hiện tại có phải là Gia sư (Tutor) hoặc Học sinh (Student) thuộc lớp học/ca học `{classOrBookingId}` không. Nếu không thuộc lớp học, trả về `403 Forbidden`.
   - Sử dụng `io.livekit.server.AccessToken` để tạo token truy cập phòng học với `roomName = "classroom-" + classOrBookingId`:
     - `token.setIdentity(String.valueOf(user.getId()))`
     - `token.setName(user.getFullName() + (isTutor ? " (Gia sư)" : " (Học viên)"))`
     - `token.setMetadata("{\"role\":\"" + (isTutor ? "TUTOR" : "STUDENT") + "\"}")`
     - Cấp quyền Grants: `new RoomJoin(true)`, `new RoomName(roomName)`, `new CanPublish(true)`, `new CanSubscribe(true)`, `new CanPublishData(true)`, và nếu `isTutor == true` thì thêm `new RoomAdmin(true)`.
   - Trả về JSON gồm: `{ "token": token.toJwt(), "serverUrl": livekitUrl, "roomName": roomName, "role": isTutor ? "TUTOR" : "STUDENT" }`.

### Phần 2: Frontend (React + Vite)
1. Cài đặt các package vào project React Vite:
   `npm install @livekit/components-react @livekit/components-styles livekit-client @excalidraw/excalidraw`
2. Tạo trang phòng học tại route `/classroom/:id` (ví dụ `ClassroomPage.tsx` hoặc `.jsx`):
   - Khi vào trang, gọi API `POST /api/meetings/:id/token` của Spring Boot để lấy `token`, `serverUrl`, và `role`.
   - Import `@livekit/components-styles` để có sẵn bộ giao diện chuẩn.
   - Hiển thị thanh chuyển đổi chế độ trên đỉnh màn hình gồm 2 chế độ:
     - **Chế độ "Chỉ Video"**: Hiển thị `<VideoConference />` toàn màn hình (có sẵn chia lưới camera, chia sẻ màn hình, bật/tắt mic/cam, khung chat trong lớp).
     - **Chế độ "Vừa học vừa viết bảng (Split View)"**: Chia màn hình làm 2 cột — bên trái (60% chiều rộng) nhúng bảng trắng `<Excalidraw />` để gia sư viết bài/vẽ hình, bên phải (40% chiều rộng) giữ nguyên `<VideoConference />` để thấy mặt và nghe tiếng.
   - Bọc toàn bộ trong component `<LiveKitRoom serverUrl={serverUrl} token={token} connect={true} video={true} audio={true} onDisconnected={() => navigate('/dashboard')}>` và `<RoomAudioRenderer />`.
3. Thêm nút "Vào lớp học" (Join Classroom) vào trang Quản lý lịch học / Lớp học hiện có của Gia sư và Học sinh để điều hướng sang `/classroom/:id`.
```

## 4. Code Mẫu Tham Khảo (Để Bạn Kiểm Tra Kết Quả Của Agent)

Dưới đây là cấu trúc code chuẩn dựa trên [OpenVidu / LiveKit Java & React Tutorials](https://github.com/openvidu/openvidu-livekit-tutorials) để bạn đối chiếu khi Agent sinh code xong:

### 4.1. Dependency trong `pom.xml` (Spring Boot)
```xml
<dependency>
    <groupId>io.livekit</groupId>
    <artifactId>livekit-server</artifactId>
    <version>0.8.4</version>
</dependency>
```

### 4.2. Tạo Access Token trong `MeetingService.java` (Spring Boot)
```java
package com.example.tutor.service;

import io.livekit.server.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

@Service
public class MeetingService {

    @Value("${livekit.api.key:devkey}")
    private String apiKey;

    @Value("${livekit.api.secret:secret}")
    private String apiSecret;

    public String createClassroomToken(String classId, String userId, String fullName, boolean isTutor) {
        String roomName = "classroom-" + classId;
        AccessToken token = new AccessToken(apiKey, apiSecret);

        token.setIdentity(userId);
        token.setName(fullName + (isTutor ? " (Gia sư)" : " (Học viên)"));
        token.setMetadata("{\"role\":\"" + (isTutor ? "TUTOR" : "STUDENT") + "\"}");

        token.addGrants(
                new RoomJoin(true),
                new RoomName(roomName),
                new CanPublish(true),
                new CanSubscribe(true),
                new CanPublishData(true),
                new RoomAdmin(isTutor)
        );

        return token.toJwt();
    }
}
```

### 4.3. Giao diện phòng học `ClassroomPage.tsx` (React Vite)
```tsx
import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  LiveKitRoom,
  VideoConference,
  RoomAudioRenderer,
} from '@livekit/components-react';
import '@livekit/components-styles';
import { Excalidraw } from '@excalidraw/excalidraw';

export default function ClassroomPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [token, setToken] = useState<string>('');
  const [serverUrl, setServerUrl] = useState<string>('ws://localhost:7880');
  const [showWhiteboard, setShowWhiteboard] = useState<boolean>(false);

  useEffect(() => {
    // Gọi API Spring Boot của bạn để lấy token vào lớp
    fetch(`http://localhost:8080/api/meetings/${id}/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('access_token')}`,
      },
    })
      .then((res) => res.json())
      .then((data) => {
        setToken(data.token);
        if (data.serverUrl) setServerUrl(data.serverUrl);
      })
      .catch((err) => console.error('Lỗi khi lấy token phòng học:', err));
  }, [id]);

  if (!token) {
    return <div style={{ padding: 32, textAlign: 'center' }}>Đang kết nối vào lớp học...</div>;
  }

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: '#111' }}>
      {/* Thanh công cụ trên cùng của lớp học */}
      <div style={{
        height: 48,
        padding: '0 16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        background: '#1e1e24',
        color: '#fff',
        borderBottom: '1px solid #333'
      }}>
        <strong>Lớp học trực tuyến #{id}</strong>
        <button
          onClick={() => setShowWhiteboard(!showWhiteboard)}
          style={{
            padding: '6px 14px',
            borderRadius: 6,
            border: 'none',
            background: showWhiteboard ? '#2563eb' : '#374151',
            color: '#fff',
            cursor: 'pointer',
          }}
        >
          {showWhiteboard ? 'Ẩn Bảng trắng' : 'Mở Bảng trắng giảng bài'}
        </button>
      </div>

      {/* Khu vực Video & Bảng trắng */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {showWhiteboard && (
          <div style={{ width: '55%', height: '100%', borderRight: '2px solid #333' }}>
            <Excalidraw />
          </div>
        )}
        <div style={{ width: showWhiteboard ? '45%' : '100%', height: '100%' }}>
          <LiveKitRoom
            video={true}
            audio={true}
            token={token}
            serverUrl={serverUrl}
            data-lk-theme="default"
            style={{ height: '100%' }}
            onDisconnected={() => navigate('/')}
          >
            <VideoConference />
            <RoomAudioRenderer />
          </LiveKitRoom>
        </div>
      </div>
    </div>
  );
}
```

## 5. Cách Demo Đồ Án Môn Học Trên Máy Local Ấn Tượng Nhất

1. **Mở nhiều tab / trình duyệt khác nhau trên cùng 1 máy:** Bạn mở 1 cửa sổ Chrome thường đăng nhập tài khoản **Gia sư**, và 2 cửa sổ Ẩn danh (hoặc Edge/Firefox) đăng nhập 2 tài khoản **Học sinh** cùng bấm nút "Vào lớp học".
2. **Trình diễn tính năng 1-nhiều & Chia sẻ màn hình:** Từ tab của Gia sư, bấm nút **Share Screen** để chiếu slide bài giảng hoặc bật **Bảng trắng (Excalidraw)** rồi chia sẻ tab đó — cả 2 tab Học sinh sẽ thấy hình ảnh sắc nét ngay lập tức với độ trễ gần như bằng 0.
3. **Demo bảo mật đồng bộ với Database:** Thử lấy một tài khoản Học sinh thứ 3 **chưa đăng ký lớp học đó** truy cập vào đường dẫn `/classroom/:id`, Spring Boot sẽ chặn ngay ở bước kiểm tra Supabase và báo lỗi không có quyền vào lớp.
