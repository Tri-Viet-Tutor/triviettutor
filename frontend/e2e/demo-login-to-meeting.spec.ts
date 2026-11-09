import { test, expect, chromium, BrowserContext, Page } from '@playwright/test';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

interface AuthUserState {
  id: number;
  email: string;
  fullName: string;
  role: 'ROLE_TUTOR' | 'ROLE_STUDENT' | 'ROLE_ADMIN';
}

interface MeetingTokenResponseMock {
  token: string;
  serverUrl: string;
  roomName: string;
  role: 'TUTOR' | 'STUDENT' | 'ADMIN';
  sessionId: number;
  classGroupId: number;
  courseTitle: string;
  sessionNumber: number;
  tutorName: string;
}

// Tài khoản Giảng viên và Học sinh lấy chính xác từ R__sample_data.sql
const sampleTutorUser: AuthUserState = {
  id: 25,
  email: 'hung.pham@viettritutor.local',
  fullName: 'Phạm Quốc Hùng',
  role: 'ROLE_TUTOR',
};

const sampleStudentUser: AuthUserState = {
  id: 22,
  email: 'minhanh.nguyen@viettritutor.local',
  fullName: 'Nguyễn Minh Anh',
  role: 'ROLE_STUDENT',
};

const tutorMeetingTokenData: MeetingTokenResponseMock = {
  token: 'mock-tutor-livekit-token-session-1',
  serverUrl: 'wss://livekit.triviettutor.vn',
  roomName: 'classroom-session-1',
  role: 'TUTOR',
  sessionId: 1,
  classGroupId: 14,
  courseTitle: 'Toán 11 – Cơ bản (MATH-G11-MWF-E1-014)',
  sessionNumber: 1,
  tutorName: 'Phạm Quốc Hùng',
};

const studentMeetingTokenData: MeetingTokenResponseMock = {
  token: 'mock-student-livekit-token-session-1',
  serverUrl: 'wss://livekit.triviettutor.vn',
  roomName: 'classroom-session-1',
  role: 'STUDENT',
  sessionId: 1,
  classGroupId: 14,
  courseTitle: 'Toán 11 – Cơ bản (MATH-G11-MWF-E1-014)',
  sessionNumber: 1,
  tutorName: 'Phạm Quốc Hùng',
};

test.describe('Luồng Demo: Từ Đăng nhập ngoài giao diện đến tham gia Phòng học trực tuyến gặp nhau', () => {
  test.setTimeout(60000);

  let tutorContext: BrowserContext;
  let studentContext: BrowserContext;
  let tutorPage: Page;
  let studentPage: Page;
  let tutorDir: string;
  let studentDir: string;

  const todayIso = new Date().toISOString().slice(0, 10);

  const mockTodaySession = {
    sessionId: 1,
    classGroupId: 14,
    sessionNumber: 1,
    date: todayIso,
    startTime: '00:00:00',
    endTime: '23:59:59',
    status: 'SCHEDULED',
    scheduledTutorId: 25,
    actualTutorId: 25,
    meetingUrl: null,
    topicId: 1,
    originalSessionId: null,
    attendanceLocked: false,
    attendanceNeedsReview: false,
  };

  test.beforeEach(async () => {
    // Tách biệt hoàn toàn 2 profile Chrome (user data dir riêng) để không bao giờ bị ghi đè localStorage / session
    const uniqueTimestamp = Date.now();
    tutorDir = path.join(os.tmpdir(), `pw-demo-tutor-${uniqueTimestamp}`);
    studentDir = path.join(os.tmpdir(), `pw-demo-student-${uniqueTimestamp}`);

    tutorContext = await chromium.launchPersistentContext(tutorDir, {
      channel: 'chrome',
      baseURL: 'http://localhost:5173',
      permissions: ['camera', 'microphone'],
      viewport: { width: 1280, height: 800 },
      args: [
        '--use-fake-ui-for-media-stream',
        '--use-fake-device-for-media-stream',
      ],
    });

    studentContext = await chromium.launchPersistentContext(studentDir, {
      channel: 'chrome',
      baseURL: 'http://localhost:5173',
      permissions: ['camera', 'microphone'],
      viewport: { width: 1280, height: 800 },
      args: [
        '--use-fake-ui-for-media-stream',
        '--use-fake-device-for-media-stream',
      ],
    });

    await tutorContext.addInitScript(() => {
      window.localStorage.setItem('vtt_preview_mode', 'true');
    });

    await studentContext.addInitScript(() => {
      window.localStorage.setItem('vtt_preview_mode', 'true');
    });

    tutorPage = tutorContext.pages()[0] || await tutorContext.newPage();
    studentPage = studentContext.pages()[0] || await studentContext.newPage();

    // Bắt toàn bộ API cho Giảng viên: tránh bất kỳ request nào bị 401 khiến axios interceptor đá về /login
    await tutorPage.route('**/api/v1/**', async (route) => {
      const url = route.request().url();
      if (url.includes('/auth/login')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: {
              accessToken: 'jwt-token-tutor-25',
              user: sampleTutorUser,
            },
          }),
        });
      } else if (url.includes('/me/sessions')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: [mockTodaySession],
          }),
        });
      } else if (url.includes('/meetings/sessions')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: tutorMeetingTokenData,
          }),
        });
      } else {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: [],
          }),
        });
      }
    });

    // Bắt toàn bộ API cho Học sinh: tránh bất kỳ request nào bị 401 khiến axios interceptor đá về /login
    await studentPage.route('**/api/v1/**', async (route) => {
      const url = route.request().url();
      if (url.includes('/auth/login')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: {
              accessToken: 'jwt-token-student-22',
              user: sampleStudentUser,
            },
          }),
        });
      } else if (url.includes('/me/sessions')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: [mockTodaySession],
          }),
        });
      } else if (url.includes('/meetings/sessions')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: studentMeetingTokenData,
          }),
        });
      } else {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: [],
          }),
        });
      }
    });
  });

  test.afterEach(async () => {
    if (tutorContext) {
      await tutorContext.close();
    }
    if (studentContext) {
      await studentContext.close();
    }
    try {
      if (tutorDir && fs.existsSync(tutorDir)) {
        fs.rmSync(tutorDir, { recursive: true, force: true });
      }
    } catch {
      // Bỏ qua lỗi xóa thư mục tạm
    }
    try {
      if (studentDir && fs.existsSync(studentDir)) {
        fs.rmSync(studentDir, { recursive: true, force: true });
      }
    } catch {
      // Bỏ qua lỗi xóa thư mục tạm
    }
  });

  test('Demo: Giảng viên và Học sinh đăng nhập trên 2 profile riêng biệt, cùng bấm Vào lớp và nhìn thấy nhau', async () => {
    await test.step('Bước 1: Giảng viên và Học sinh mở trang Đăng nhập /login trên 2 cửa sổ độc lập', async () => {
      await Promise.all([
        tutorPage.goto('/login'),
        studentPage.goto('/login'),
      ]);

      await expect(tutorPage.getByRole('heading', { name: 'Đăng nhập' })).toBeVisible();
      await expect(studentPage.getByRole('heading', { name: 'Đăng nhập' })).toBeVisible();
    });

    await test.step('Bước 2: Nhập tài khoản tương ứng từ R__sample_data.sql và bấm Đăng nhập', async () => {
      // Cửa sổ 1: Giảng viên Phạm Quốc Hùng
      await tutorPage.locator('#email').fill('hung.pham@viettritutor.local');
      await tutorPage.locator('#password').fill('Admin@123');
      await tutorPage.getByRole('button', { name: 'Đăng nhập' }).click();

      // Cửa sổ 2: Học sinh Nguyễn Minh Anh
      await studentPage.locator('#email').fill('minhanh.nguyen@viettritutor.local');
      await studentPage.locator('#password').fill('Admin@123');
      await studentPage.getByRole('button', { name: 'Đăng nhập' }).click();
    });

    await test.step('Bước 3: Chuyển về Dashboard tương ứng (Tutor / Student) và thấy nút Vào lớp', async () => {
      await Promise.all([
        tutorPage.waitForURL('**/tutor'),
        studentPage.waitForURL('**/student'),
      ]);

      await expect(tutorPage.locator('a[href*="/classroom/"]').first()).toBeVisible();
      await expect(studentPage.locator('a[href*="/classroom/"]').first()).toBeVisible();
    });

    await test.step('Bước 4: Cả hai bấm nút Vào lớp để cùng tham gia phòng học trực tuyến', async () => {
      await Promise.all([
        tutorPage.locator('a[href*="/classroom/"]').first().click(),
        studentPage.locator('a[href*="/classroom/"]').first().click(),
      ]);

      await Promise.all([
        tutorPage.waitForURL('**/classroom/1'),
        studentPage.waitForURL('**/classroom/1'),
      ]);
    });

    await test.step('Bước 5: Xác thực cả hai đã vào phòng thành công và nhìn thấy nhau (Pass case)', async () => {
      // Cả hai cùng thấy Live badge và tên môn học
      await expect(tutorPage.locator('header').getByText('Live')).toBeVisible();
      await expect(studentPage.locator('header').getByText('Live')).toBeVisible();

      const expectedCourseText = 'Toán 11 – Cơ bản (MATH-G11-MWF-E1-014) — Buổi 1';
      await expect(tutorPage.locator('header').getByText(expectedCourseText)).toBeVisible();
      await expect(studentPage.locator('header').getByText(expectedCourseText)).toBeVisible();

      // Xác thực nhãn vai trò hiển thị trên header
      await expect(tutorPage.locator('header').getByText('Gia sư')).toBeVisible();
      await expect(studentPage.locator('header').getByText('Học sinh')).toBeVisible();

      // Giảng viên nhìn thấy Học sinh đã kết nối vào phòng
      await expect(tutorPage.getByText('Học sinh đã kết nối vào phòng')).toBeVisible();

      // Học sinh nhìn thấy Giảng viên phụ trách trong phòng
      await expect(studentPage.getByText('Gia sư: Phạm Quốc Hùng')).toBeVisible();

      // Cả hai xác thực trạng thái LiveKit SFU đã kết nối
      await expect(tutorPage.getByText('LiveKit SFU: Connected')).toBeVisible();
      await expect(studentPage.getByText('LiveKit SFU: Connected')).toBeVisible();
    });
  });
});
