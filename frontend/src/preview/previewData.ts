import type {
  AdminUserResponse,
  AttendanceRecordResponse,
  AttendanceStatus,
  AvailabilityResponse,
  LeaveRequestResponse,
  MeResponse,
  Role,
  SessionResponse,
  UserInfo,
} from "@/types/api";
import { addDays, startOfToday, toIsoDate } from "@/utils/date";

/* Dữ liệu mẫu của chế độ xem thử — cùng hình dạng với DTO của backend, ngày giờ tính theo hôm nay. */

export interface PreviewUser extends AdminUserResponse {
  profile: MeResponse["profile"];
}

export interface PreviewClass {
  classId: number;
  studentIds: number[];
}

export interface PreviewAttendance {
  locked: boolean;
  teachingConfirmed: boolean;
  records: AttendanceRecordResponse[];
}

export interface PreviewState {
  users: PreviewUser[];
  classes: PreviewClass[];
  sessions: SessionResponse[];
  leaves: LeaveRequestResponse[];
  /** Điểm danh theo mã buổi học */
  attendance: Map<number, PreviewAttendance>;
  /** Lịch rảnh theo mã gia sư */
  availability: Map<number, AvailabilityResponse[]>;
  /** Mã kế tiếp cho bản ghi mới (buổi học, đơn, người dùng…) */
  nextId: number;
}

/** Tài khoản mẫu: quản trị và gia sư dùng để vào khu của mình, học viên chỉ là một người trong dữ liệu mẫu */
export const PREVIEW_ACCOUNTS: Record<Role, UserInfo> = {
  ROLE_ADMIN: { id: 1, email: "quantri@example.com", fullName: "Trần Ngọc Ánh", role: "ROLE_ADMIN" },
  ROLE_TUTOR: { id: 3, email: "thuan@example.com", fullName: "Hồ Đức Thuận", role: "ROLE_TUTOR" },
  ROLE_STUDENT: { id: 9, email: "minhanh@example.com", fullName: "Nguyễn Minh Anh", role: "ROLE_STUDENT" },
};

const TUTORS: [number, string, string][] = [
  [7, "minh.tran@example.com", "Trần Quang Minh"],
  [8, "hoa.le@example.com", "Lê Thị Hoa"],
];

const STUDENT_NAMES = [
  "Trần Gia Bảo",
  "Lê Thu Hà",
  "Phạm Quốc Khánh",
  "Võ Ngọc Lan",
  "Đặng Hải Nam",
  "Bùi Thảo Vy",
  "Hoàng Tuấn Kiệt",
  "Đỗ Mai Chi",
  "Ngô Đức Huy",
  "Dương Khánh Linh",
  "Lý Gia Hân",
  "Phan Anh Tú",
];

/** Kiểu điểm danh lặp lại cho các buổi đã qua */
const ATTENDANCE_PATTERN: AttendanceStatus[] = ["PRESENT", "PRESENT", "LATE", "PRESENT", "ABSENT", "PRESENT", "PRESENT"];

const pad = (value: number) => String(value).padStart(2, "0");

function at(date: string, time: string): Date {
  return new Date(`${date}T${time}`);
}

export function createPreviewState(now: Date = new Date()): PreviewState {
  const today = startOfToday();
  const daysAgo = (days: number) => `${toIsoDate(addDays(today, -days))}T09:00:00`;

  const users: PreviewUser[] = [
    { ...PREVIEW_ACCOUNTS.ROLE_ADMIN, createdAt: daysAgo(120), profile: null },
    {
      ...PREVIEW_ACCOUNTS.ROLE_TUTOR,
      createdAt: daysAgo(90),
      profile: { baseSalary: 5_000_000, sessionRate: 250_000, bio: "Thạc sĩ Toán ứng dụng, 6 năm luyện thi THPT." },
    },
    ...TUTORS.map(([id, email, fullName], index): PreviewUser => ({
      id,
      email,
      fullName,
      role: "ROLE_TUTOR",
      createdAt: daysAgo(80 - index * 12),
      profile: { baseSalary: 4_500_000, sessionRate: 220_000, bio: null },
    })),
    { ...PREVIEW_ACCOUNTS.ROLE_STUDENT, createdAt: daysAgo(45), profile: { phone: "0901 234 567", address: "12 Lê Lợi, Quận 1, TP. Hồ Chí Minh" } },
    ...STUDENT_NAMES.map((fullName, index): PreviewUser => ({
      id: 10 + index,
      email: `hocvien${index + 1}@example.com`,
      fullName,
      role: "ROLE_STUDENT",
      createdAt: daysAgo(44 - index * 3),
      profile: { phone: null, address: null },
    })),
  ];

  const classes: PreviewClass[] = [
    { classId: 12, studentIds: [9, 11, 12, 14] },
    { classId: 15, studentIds: [9, 10, 13, 15, 16] },
    { classId: 18, studentIds: [10, 11, 17] },
    { classId: 21, studentIds: [9, 12, 14] },
  ];

  const sessions: SessionResponse[] = [];
  let nextId = 100;
  function addSession(classGroupId: number, tutorId: number | null, date: Date, startTime: string, endTime: string, sessionNumber: number, meetingUrl: string | null) {
    const isoDate = toIsoDate(date);
    const ended = at(isoDate, endTime) <= now;
    const started = at(isoDate, startTime) <= now;
    sessions.push({
      sessionId: nextId++,
      classGroupId,
      sessionNumber,
      date: isoDate,
      startTime,
      endTime,
      status: ended ? "COMPLETED" : started && tutorId !== null ? "IN_SESSION" : "SCHEDULED",
      scheduledTutorId: tutorId,
      actualTutorId: tutorId,
      meetingUrl,
      topicId: null,
      originalSessionId: null,
      attendanceLocked: ended,
      attendanceNeedsReview: false,
    });
  }
  /** Lớp học theo thứ trong tuần: `count` buổi kể từ `fromOffset` ngày so với hôm nay */
  function weekly(classGroupId: number, tutorId: number | null, weekdays: number[], startTime: string, endTime: string, fromOffset: number, count: number, meetingUrl: string | null) {
    let offset = fromOffset;
    for (let number = 1; number <= count; offset += 1) {
      const date = addDays(today, offset);
      if (weekdays.includes(date.getDay())) addSession(classGroupId, tutorId, date, startTime, endTime, number++, meetingUrl);
    }
  }
  weekly(12, 3, [1, 3, 5], "18:00:00", "20:00:00", -15, 24, "https://meet.example.com/lop-12");
  weekly(15, 7, [6, 0], "08:00:00", "10:00:00", -8, 16, null);
  weekly(18, null, [2, 4], "19:00:00", "21:00:00", 1, 12, null);
  // Lớp 21 luôn có một buổi đang diễn ra lúc mở trang, để xem được điểm danh và nút vào lớp
  const hour = Math.min(Math.max(now.getHours(), 1), 22);
  [-4, -2, 0, 2, 4, 6].forEach((offset, index) =>
    addSession(21, 3, addDays(today, offset), `${pad(hour - 1)}:00:00`, `${pad(hour + 1)}:00:00`, index + 1, "https://meet.example.com/lop-21"),
  );
  sessions.sort((a, b) => `${a.date}${a.startTime}`.localeCompare(`${b.date}${b.startTime}`) || a.sessionId - b.sessionId);

  const studentsOf = (classId: number) => classes.find((item) => item.classId === classId)?.studentIds ?? [];
  const attendance = new Map<number, PreviewAttendance>();
  for (const session of sessions) {
    if (session.status !== "COMPLETED") continue;
    attendance.set(session.sessionId, {
      locked: true,
      teachingConfirmed: true,
      records: studentsOf(session.classGroupId).map((studentId, index): AttendanceRecordResponse => {
        const status = ATTENDANCE_PATTERN[(session.sessionId + index * 3) % ATTENDANCE_PATTERN.length];
        return {
          recordId: session.sessionId * 100 + index,
          studentId,
          status,
          note: status === "LATE" ? "Vào lớp sau khi đã bắt đầu bài mới." : null,
          arrivedAt: null,
          recordedBy: session.actualTutorId,
          recordedAt: `${session.date}T${session.endTime}`,
          locked: true,
        };
      }),
    });
  }

  const upcoming = (classId: number) => sessions.filter((session) => session.classGroupId === classId && session.status === "SCHEDULED");
  const past = (classId: number) => sessions.filter((session) => session.classGroupId === classId && session.status === "COMPLETED").reverse();
  const hoursAgo = (hours: number) => new Date(now.getTime() - hours * 3_600_000).toISOString();
  const leave = (leaveRequestId: number, session: SessionResponse, requester: UserInfo | PreviewUser, reason: string, requestedAt: string, extra: Partial<LeaveRequestResponse> = {}): LeaveRequestResponse => ({
    leaveRequestId,
    sessionId: session.sessionId,
    requesterId: requester.id,
    requesterRole: requester.role,
    reason,
    requestedAt,
    isLateNotice: false,
    status: "PENDING",
    resolution: null,
    resolvedBy: null,
    resolvedAt: null,
    resolutionReason: null,
    replacementSessionId: null,
    sessionNewStatus: session.status,
    ...extra,
  });

  upcoming(15)[3].status = "PENDING_RESCHEDULE";
  const substituted = past(12)[2];
  substituted.actualTutorId = 7;
  const leaves: LeaveRequestResponse[] = [
    leave(31, upcoming(12)[2], PREVIEW_ACCOUNTS.ROLE_TUTOR, "Em có lịch thi giữa kỳ ở trường vào tối hôm đó.", hoursAgo(3)),
    leave(30, upcoming(15)[2], PREVIEW_ACCOUNTS.ROLE_STUDENT, "Con về quê ăn cưới anh họ, xin phép nghỉ một buổi.", hoursAgo(8)),
    leave(29, upcoming(15)[0], users[2], "Tôi đi công tác đột xuất tại Đà Nẵng.", hoursAgo(20), { isLateNotice: true }),
    leave(22, substituted, PREVIEW_ACCOUNTS.ROLE_TUTOR, "Em bị sốt, xin phép nghỉ một buổi.", hoursAgo(24 * 9), {
      status: "APPROVED",
      resolution: "SUBSTITUTE",
      resolvedBy: 1,
      resolvedAt: hoursAgo(24 * 8),
      resolutionReason: "Thầy Minh dạy thay.",
    }),
    leave(18, past(15)[1], PREVIEW_ACCOUNTS.ROLE_STUDENT, "Nhà em có việc đột xuất.", hoursAgo(24 * 6), {
      isLateNotice: true,
      status: "REJECTED",
      resolvedBy: 1,
      resolvedAt: hoursAgo(24 * 6 - 2),
      resolutionReason: "Đơn gửi sát giờ học nên không duyệt nghỉ có phép được.",
    }),
  ];

  const availability = new Map<number, AvailabilityResponse[]>([
    [
      3,
      [2, 4, 9].map((offset) => ({ availableDate: toIsoDate(addDays(today, offset)), startTime: "18:00:00", endTime: "21:00:00" })),
    ],
    [8, upcoming(18).map((session) => ({ availableDate: session.date, startTime: "18:00:00", endTime: "21:30:00" }))],
  ]);

  return { users, classes, sessions, leaves, attendance, availability, nextId: 1000 };
}
