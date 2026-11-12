import { test, expect, BrowserContext, Page } from '@playwright/test';

interface AuthUserState {
  id: number;
  email: string;
  fullName: string;
  role: 'ROLE_TUTOR' | 'ROLE_STUDENT' | 'ROLE_ADMIN';
}

interface StoredAuthState {
  state: {
    token: string;
    user: AuthUserState;
    isAuthenticated: boolean;
  };
  version: number;
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

interface MeetingParticipantLogMock {
  participantIdentity: string;
  participantName: string;
  userRole: string;
  joinedAt: string;
  durationSeconds: number;
}

interface MeetingSessionLogsResponseMock {
  sessionId: number;
  roomName: string;
  sessionLog: {
    id: string;
    sessionId: string;
    roomName: string;
    status: string;
  };
  participantLogs: MeetingParticipantLogMock[];
  totalParticipants: number;
}

function buildStoredAuthState(user: AuthUserState, token: string): StoredAuthState {
  return {
    state: {
      token,
      user,
      isAuthenticated: true,
    },
    version: 0,
  };
}

const mockTutorUser: AuthUserState = {
  id: 101,
  email: 'hoang.tran@triviettutor.vn',
  fullName: 'Thầy Trần Minh Hoàng',
  role: 'ROLE_TUTOR',
};

const mockStudent1User: AuthUserState = {
  id: 202,
  email: 'an.nguyen@triviettutor.vn',
  fullName: 'Nguyễn Văn An',
  role: 'ROLE_STUDENT',
};

const mockStudent2User: AuthUserState = {
  id: 303,
  email: 'mai.le@triviettutor.vn',
  fullName: 'Lê Thị Mai',
  role: 'ROLE_STUDENT',
};

const tutorMeetingTokenData: MeetingTokenResponseMock = {
  token: 'mock-tutor-livekit-token-session-1',
  serverUrl: 'wss://livekit.triviettutor.vn',
  roomName: 'classroom-session-1',
  role: 'TUTOR',
  sessionId: 1,
  classGroupId: 10,
  courseTitle: 'Toán 12 Chuyên Đề Hàm Số & Khảo Sát Đồ Thị',
  sessionNumber: 3,
  tutorName: 'Thầy Trần Minh Hoàng',
};

const student1MeetingTokenData: MeetingTokenResponseMock = {
  token: 'mock-student1-livekit-token-session-1',
  serverUrl: 'wss://livekit.triviettutor.vn',
  roomName: 'classroom-session-1',
  role: 'STUDENT',
  sessionId: 1,
  classGroupId: 10,
  courseTitle: 'Toán 12 Chuyên Đề Hàm Số & Khảo Sát Đồ Thị',
  sessionNumber: 3,
  tutorName: 'Thầy Trần Minh Hoàng',
};

const student2MeetingTokenData: MeetingTokenResponseMock = {
  token: 'mock-student2-livekit-token-session-1',
  serverUrl: 'wss://livekit.triviettutor.vn',
  roomName: 'classroom-session-1',
  role: 'STUDENT',
  sessionId: 1,
  classGroupId: 10,
  courseTitle: 'Toán 12 Chuyên Đề Hàm Số & Khảo Sát Đồ Thị',
  sessionNumber: 3,
  tutorName: 'Thầy Trần Minh Hoàng',
};

const sessionLogsData: MeetingSessionLogsResponseMock = {
  sessionId: 1,
  roomName: 'classroom-session-1',
  sessionLog: {
    id: 'session-log-1',
    sessionId: '1',
    roomName: 'classroom-session-1',
    status: 'ACTIVE',
  },
  participantLogs: [
    {
      participantIdentity: 'tutor_101',
      participantName: 'Thầy Trần Minh Hoàng',
      userRole: 'ROLE_TUTOR',
      joinedAt: '2026-11-09T08:00:00Z',
      durationSeconds: 1800,
    },
    {
      participantIdentity: 'student_202',
      participantName: 'Nguyễn Văn An',
      userRole: 'ROLE_STUDENT',
      joinedAt: '2026-11-09T08:05:00Z',
      durationSeconds: 1500,
    },
    {
      participantIdentity: 'student_303',
      participantName: 'Lê Thị Mai',
      userRole: 'ROLE_STUDENT',
      joinedAt: '2026-11-09T08:08:00Z',
      durationSeconds: 1320,
    },
  ],
  totalParticipants: 3,
};

test.describe('Phòng học trực tuyến LiveKit - Kiểm thử 3 người dùng đồng thời (1 Gia sư + 2 Học sinh)', () => {
  let tutorContext: BrowserContext;
  let student1Context: BrowserContext;
  let student2Context: BrowserContext;
  let tutorPage: Page;
  let student1Page: Page;
  let student2Page: Page;

  test.beforeEach(async ({ browser }) => {
    tutorContext = await browser.newContext({
      permissions: ['camera', 'microphone'],
      viewport: { width: 1280, height: 800 },
    });

    student1Context = await browser.newContext({
      permissions: ['camera', 'microphone'],
      viewport: { width: 1280, height: 800 },
    });

    student2Context = await browser.newContext({
      permissions: ['camera', 'microphone'],
      viewport: { width: 1280, height: 800 },
    });

    const tutorAuthState = buildStoredAuthState(mockTutorUser, 'jwt-token-tutor-101');
    const student1AuthState = buildStoredAuthState(mockStudent1User, 'jwt-token-student-202');
    const student2AuthState = buildStoredAuthState(mockStudent2User, 'jwt-token-student-303');

    await tutorContext.addInitScript(
      ({ authJson, previewMode }) => {
        window.localStorage.setItem('viettritutor-auth', authJson);
        window.localStorage.setItem('vtt_preview_mode', previewMode);
      },
      { authJson: JSON.stringify(tutorAuthState), previewMode: 'true' },
    );

    await student1Context.addInitScript(
      ({ authJson, previewMode }) => {
        window.localStorage.setItem('viettritutor-auth', authJson);
        window.localStorage.setItem('vtt_preview_mode', previewMode);
      },
      { authJson: JSON.stringify(student1AuthState), previewMode: 'true' },
    );

    await student2Context.addInitScript(
      ({ authJson, previewMode }) => {
        window.localStorage.setItem('viettritutor-auth', authJson);
        window.localStorage.setItem('vtt_preview_mode', previewMode);
      },
      { authJson: JSON.stringify(student2AuthState), previewMode: 'true' },
    );

    tutorPage = await tutorContext.newPage();
    student1Page = await student1Context.newPage();
    student2Page = await student2Context.newPage();

    await tutorPage.route('**/api/v1/meetings/sessions/*/token', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: tutorMeetingTokenData,
        }),
      });
    });

    await tutorPage.route('**/api/v1/meetings/sessions/*/logs', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: sessionLogsData,
        }),
      });
    });

    await student1Page.route('**/api/v1/meetings/sessions/*/token', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: student1MeetingTokenData,
        }),
      });
    });

    await student2Page.route('**/api/v1/meetings/sessions/*/token', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: student2MeetingTokenData,
        }),
      });
    });
  });

  test.afterEach(async () => {
    if (tutorContext) {
      await tutorContext.close();
    }
    if (student1Context) {
      await student1Context.close();
    }
    if (student2Context) {
      await student2Context.close();
    }
  });

  test('Luồng phối hợp toàn diện giữa 1 Gia sư và 2 Học sinh trong cùng phòng học trực tuyến', async () => {
    await test.step('Kịch bản a: Cả ba người dùng cùng vào phòng học /classroom/1 đồng thời', async () => {
      await Promise.all([
        tutorPage.goto('/classroom/1'),
        student1Page.goto('/classroom/1'),
        student2Page.goto('/classroom/1'),
      ]);

      await expect(tutorPage.locator('header').getByText('Live')).toBeVisible();
      await expect(student1Page.locator('header').getByText('Live')).toBeVisible();
      await expect(student2Page.locator('header').getByText('Live')).toBeVisible();

      const expectedCourseText = 'Toán 12 Chuyên Đề Hàm Số & Khảo Sát Đồ Thị — Buổi 3';
      await expect(tutorPage.locator('header').getByText(expectedCourseText)).toBeVisible();
      await expect(student1Page.locator('header').getByText(expectedCourseText)).toBeVisible();
      await expect(student2Page.locator('header').getByText(expectedCourseText)).toBeVisible();

      await expect(tutorPage.locator('header').getByText('Gia sư')).toBeVisible();
      await expect(student1Page.locator('header').getByText('Học sinh')).toBeVisible();
      await expect(student2Page.locator('header').getByText('Học sinh')).toBeVisible();

      const tutorLogsButton = tutorPage.getByRole('button', { name: /Nhật ký phòng học/i });
      await expect(tutorLogsButton).toBeVisible();
      await expect(student1Page.getByRole('button', { name: /Nhật ký phòng học/i })).not.toBeVisible();
      await expect(student2Page.getByRole('button', { name: /Nhật ký phòng học/i })).not.toBeVisible();

      await tutorLogsButton.click();
      const logsModal = tutorPage.locator('div.fixed.inset-0');
      const logsModalTitle = logsModal.getByText('Nhật ký phiên học trực tuyến (MongoDB Atlas)');
      await expect(logsModalTitle).toBeVisible();
      await expect(logsModal.getByText('Thầy Trần Minh Hoàng')).toBeVisible();
      await expect(logsModal.getByText('Nguyễn Văn An')).toBeVisible();
      await expect(logsModal.getByText('Lê Thị Mai')).toBeVisible();
      await expect(logsModal.getByText('3', { exact: true })).toBeVisible();

      const closeLogsBtn = logsModal.getByRole('button', { name: 'Đóng' });
      await closeLogsBtn.click();
      await expect(logsModalTitle).not.toBeVisible();
    });

    await test.step('Kịch bản b: Điều khiển thiết bị Media của các học sinh và gia sư', async () => {
      const student1MicButton = student1Page.locator('footer').getByRole('button', { name: /Mic Bật/i });
      await expect(student1MicButton).toBeVisible();
      await student1MicButton.click();
      const student1MicOffButton = student1Page.locator('footer').getByRole('button', { name: /Mic Tắt/i });
      await expect(student1MicOffButton).toBeVisible();

      const student2CamButton = student2Page.locator('footer').getByRole('button', { name: /Cam Bật/i });
      await expect(student2CamButton).toBeVisible();
      await student2CamButton.click();
      const student2CamOffButton = student2Page.locator('footer').getByRole('button', { name: /Cam Tắt/i });
      await expect(student2CamOffButton).toBeVisible();
      await expect(student2Page.getByText('Camera đã tắt')).toBeVisible();

      const tutorMicButton = tutorPage.locator('footer').getByRole('button', { name: /Mic Bật/i });
      await expect(tutorMicButton).toBeVisible();
      await tutorMicButton.click();
      const tutorMicOffButton = tutorPage.locator('footer').getByRole('button', { name: /Mic Tắt/i });
      await expect(tutorMicOffButton).toBeVisible();
    });

    await test.step('Kịch bản c: Gia sư thao tác trên Bảng trắng Whiteboard', async () => {
      const openWhiteboardButton = tutorPage.getByRole('button', { name: /Mở Bảng Trắng/i });
      await expect(openWhiteboardButton).toBeVisible();
      await openWhiteboardButton.click();

      const canvas = tutorPage.locator('canvas');
      await expect(canvas).toBeVisible();

      const penToolButton = tutorPage.getByRole('button', { name: 'Bút viết' });
      const eraserToolButton = tutorPage.getByRole('button', { name: 'Tẩy xóa' });
      await expect(penToolButton).toBeVisible();
      await expect(eraserToolButton).toBeVisible();

      await eraserToolButton.click();
      await penToolButton.click();

      const canvasBox = await canvas.boundingBox();
      expect(canvasBox).not.toBeNull();
      if (canvasBox) {
        const startX = canvasBox.x + Math.floor(canvasBox.width * 0.2);
        const startY = canvasBox.y + Math.floor(canvasBox.height * 0.2);
        const endX = canvasBox.x + Math.floor(canvasBox.width * 0.45);
        const endY = canvasBox.y + Math.floor(canvasBox.height * 0.45);

        await tutorPage.mouse.move(startX, startY);
        await tutorPage.mouse.down();
        await tutorPage.mouse.move(endX, endY, { steps: 5 });
        await tutorPage.mouse.up();
      }

      const hideWhiteboardButton = tutorPage.getByRole('button', { name: /Ẩn Bảng Trắng/i });
      await expect(hideWhiteboardButton).toBeVisible();
      await hideWhiteboardButton.click();
      await expect(canvas).not.toBeVisible();
    });

    await test.step('Kịch bản d: Học sinh 1 giơ tay phát biểu', async () => {
      const handRaiseButton = student1Page.locator('footer').getByRole('button', { name: /Giơ tay/i });
      await expect(handRaiseButton).toBeVisible();
      await handRaiseButton.click();

      const handRaisedBadge = student1Page.getByText('Đang giơ tay');
      await expect(handRaisedBadge).toBeVisible();

      const lowerHandButton = student1Page.locator('footer').getByRole('button', { name: /Hạ tay xuống/i });
      await expect(lowerHandButton).toBeVisible();
    });

    await test.step('Kịch bản e: Học sinh 1 và Học sinh 2 gửi tin nhắn trong phòng học', async () => {
      const openChatButton1 = student1Page.getByRole('button', { name: /Chat/i });
      await expect(openChatButton1).toBeVisible();
      await openChatButton1.click();

      const chatInput1 = student1Page.getByPlaceholder('Nhắn tin cho cả lớp...');
      await expect(chatInput1).toBeVisible();

      const msgStudent1 = 'Em chao thay va cac ban!';
      await chatInput1.fill(msgStudent1);
      const sendButton1 = student1Page.getByRole('button', { name: 'Gửi' });
      await sendButton1.click();
      await expect(student1Page.locator('div').filter({ hasText: msgStudent1 }).last()).toBeVisible();

      const openChatButton2 = student2Page.getByRole('button', { name: /Chat/i });
      await expect(openChatButton2).toBeVisible();
      await openChatButton2.click();

      const chatInput2 = student2Page.getByPlaceholder('Nhắn tin cho cả lớp...');
      await expect(chatInput2).toBeVisible();

      const msgStudent2 = 'Chao ca lop a!';
      await chatInput2.fill(msgStudent2);
      const sendButton2 = student2Page.getByRole('button', { name: 'Gửi' });
      await sendButton2.click();
      await expect(student2Page.locator('div').filter({ hasText: msgStudent2 }).last()).toBeVisible();
    });

    await test.step('Kịch bản f: Học sinh 2 rời phòng học an toàn qua ConfirmDialog', async () => {
      const leaveClassButton2 = student2Page.locator('footer').getByRole('button', { name: 'Rời phòng' });
      await expect(leaveClassButton2).toBeVisible();
      await leaveClassButton2.click();

      const confirmDialog = student2Page.locator('dialog[open]');
      await expect(confirmDialog).toBeVisible();

      const dialogTitle = confirmDialog.getByText('Rời phòng học?');
      await expect(dialogTitle).toBeVisible();

      const confirmLeaveButton = confirmDialog.getByRole('button', { name: 'Rời phòng' });
      await expect(confirmLeaveButton).toBeVisible();
      await confirmLeaveButton.click();

      await expect(confirmDialog).not.toBeVisible();

      await expect(tutorPage.locator('header').getByText('Live')).toBeVisible();
      await expect(student1Page.locator('header').getByText('Live')).toBeVisible();
    });
  });
});
