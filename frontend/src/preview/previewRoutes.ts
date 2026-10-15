import { LATE_NOTICE_HOURS, sessionEnd, sessionStart, teacherOf } from "@/features/portal/data/sessions";
import type { PreviewAttendance, PreviewState, PreviewUser } from "@/preview/previewData";
import type {
  ApiResponse,
  AssignmentResponse,
  AssignTutorRequest,
  AttendanceCorrection,
  AttendanceLockInput,
  AttendanceResponse,
  AttendanceSubmission,
  AvailabilityRequest,
  AvailableTutorResponse,
  CancelSessionRequest,
  CreateTutorRequest,
  ErrorCode,
  LeaveRequestInput,
  LeaveRequestResponse,
  MakeupRequest,
  MeetingUrlRequest,
  MeResponse,
  PageResponse,
  ReassignTutorRequest,
  Role,
  ScheduleConflictResponse,
  SessionResponse,
  SubstituteRequest,
  UpdateMeRequest,
  UpdateTutorProfileRequest,
  UserInfo,
} from "@/types/api";
import { startOfToday, toIsoDate } from "@/utils/date";

/*
 * "Backend" của chế độ xem thử: trả lời các API mà khu quản trị và khu gia sư gọi, trên dữ liệu mẫu trong bộ nhớ.
 * Các quy tắc ở đây chỉ mô phỏng gần đúng backend thật (đủ để bấm thử giao diện), tải lại trang là dữ liệu về như cũ.
 */

export interface PreviewRequest {
  method: string;
  /** Đường dẫn sau /api/v1, ví dụ "/me/sessions" */
  path: string;
  params: Record<string, unknown>;
  body: unknown;
  user: UserInfo;
}

export interface PreviewReply {
  status: number;
  body: ApiResponse<unknown>;
}

class PreviewError extends Error {
  constructor(
    readonly status: number,
    readonly errorCode: ErrorCode,
  ) {
    super(errorCode);
  }
}

function fail(status: number, errorCode: ErrorCode): never {
  throw new PreviewError(status, errorCode);
}

interface Context extends PreviewRequest {
  state: PreviewState;
  now: Date;
  /** Các nhóm bắt được trong đường dẫn, đã đổi sang số */
  ids: number[];
}

type Handler = (context: Context) => unknown;

const HOUR_MS = 3_600_000;

// ── Hàm dùng chung ───────────────────────────────────────────────────────────

function paginate<T>(items: T[], params: Record<string, unknown>): PageResponse<T> {
  const page = Number(params.page ?? 0);
  const size = Number(params.size ?? 20);
  return { content: items.slice(page * size, (page + 1) * size), page, size, totalElements: items.length, totalPages: Math.ceil(items.length / size) };
}

function findSession(state: PreviewState, sessionId: number): SessionResponse {
  return state.sessions.find((session) => session.sessionId === sessionId) ?? fail(404, "SESSION_NOT_FOUND");
}

function findLeave(state: PreviewState, leaveRequestId: number): LeaveRequestResponse {
  return state.leaves.find((leave) => leave.leaveRequestId === leaveRequestId) ?? fail(404, "LEAVE_REQUEST_NOT_FOUND");
}

function findTutor(state: PreviewState, userId: number): PreviewUser {
  const user = state.users.find((item) => item.id === userId) ?? fail(404, "USER_NOT_FOUND");
  return user.role === "ROLE_TUTOR" ? user : fail(400, "USER_NOT_TUTOR");
}

function studentsOf(state: PreviewState, classId: number): number[] {
  return state.classes.find((item) => item.classId === classId)?.studentIds ?? [];
}

function requireRole(user: UserInfo, ...roles: Role[]) {
  if (!roles.includes(user.role)) fail(403, "ACCESS_DENIED");
}

function sortSessions(sessions: SessionResponse[]): SessionResponse[] {
  return [...sessions].sort((a, b) => `${a.date}${a.startTime}`.localeCompare(`${b.date}${b.startTime}`) || a.sessionId - b.sessionId);
}

function filterSessions(sessions: SessionResponse[], params: Record<string, unknown>): SessionResponse[] {
  const { from, to, status, classGroupId, tutorId } = params;
  return sortSessions(
    sessions.filter(
      (session) =>
        (!from || session.date >= String(from)) &&
        (!to || session.date <= String(to)) &&
        (!status || session.status === status) &&
        (!classGroupId || session.classGroupId === Number(classGroupId)) &&
        (!tutorId || session.scheduledTutorId === Number(tutorId) || session.actualTutorId === Number(tutorId)),
    ),
  );
}

/** Các buổi của một gia sư: buổi được xếp dạy hoặc dạy thay */
function sessionsOf(state: PreviewState, tutor: UserInfo): SessionResponse[] {
  return state.sessions.filter((session) => session.scheduledTutorId === tutor.id || session.actualTutorId === tutor.id);
}

function overlaps(a: SessionResponse, b: SessionResponse): boolean {
  return a.date === b.date && a.startTime < b.endTime && b.startTime < a.endTime;
}

/** Các buổi của `tutorId` (ở lớp khác) trùng giờ với `wanted` */
function conflictsOf(state: PreviewState, tutorId: number, wanted: SessionResponse[]): ScheduleConflictResponse[] {
  const busy = state.sessions.filter((session) => teacherOf(session) === tutorId && session.status !== "CANCELLED");
  return wanted.flatMap((session) =>
    busy
      .filter((other) => other.classGroupId !== session.classGroupId && overlaps(session, other))
      .map((other) => ({
        requestedSessionId: session.sessionId,
        conflictSessionId: other.sessionId,
        conflictClassGroupId: other.classGroupId,
        date: other.date,
        startTime: other.startTime,
        endTime: other.endTime,
      })),
  );
}

/** Các buổi chưa diễn ra của một lớp — phân công gia sư chỉ áp dụng cho những buổi này */
function assignableSessions(state: PreviewState, classId: number, now: Date): SessionResponse[] {
  return state.sessions.filter((session) => session.classGroupId === classId && session.status === "SCHEDULED" && sessionStart(session) > now);
}

function toMe(user: PreviewUser): MeResponse {
  return { id: user.id, email: user.email, fullName: user.fullName, role: user.role, createdAt: user.createdAt, profile: user.profile };
}

function attendanceOf(state: PreviewState, sessionId: number): PreviewAttendance {
  let attendance = state.attendance.get(sessionId);
  if (!attendance) {
    attendance = { locked: false, teachingConfirmed: false, records: [] };
    state.attendance.set(sessionId, attendance);
  }
  return attendance;
}

function attendanceView(state: PreviewState, session: SessionResponse): AttendanceResponse {
  const attendance = attendanceOf(state, session.sessionId);
  const studentIds = studentsOf(state, session.classGroupId);
  const { records } = attendance;
  return {
    sessionId: session.sessionId,
    sessionStatus: session.status,
    locked: attendance.locked,
    editDeadline: new Date(sessionEnd(session).getTime() + 24 * HOUR_MS).toISOString(),
    teachingConfirmed: attendance.teachingConfirmed,
    taughtByTutorId: attendance.teachingConfirmed ? teacherOf(session) : null,
    needsAdminReview: session.attendanceNeedsReview,
    studentIds,
    missingStudentIds: studentIds.filter((studentId) => !records.some((record) => record.studentId === studentId)),
    records,
  };
}

/** Duyệt một đơn đang chờ theo cách xử lý đã chọn */
function resolveLeave(leave: LeaveRequestResponse, adminId: number, patch: Partial<LeaveRequestResponse>) {
  Object.assign(leave, { status: "APPROVED", resolvedBy: adminId, resolvedAt: new Date().toISOString(), ...patch });
}

function requirePendingLeave(state: PreviewState, leaveRequestId: number, sessionId: number): LeaveRequestResponse {
  const leave = findLeave(state, leaveRequestId);
  if (leave.sessionId !== sessionId) fail(400, "LEAVE_REQUEST_SESSION_MISMATCH");
  if (leave.status !== "PENDING") fail(409, "LEAVE_REQUEST_ALREADY_RESOLVED");
  return leave;
}

// ── Các API ──────────────────────────────────────────────────────────────────

const ROUTES: [method: string, pattern: RegExp, handler: Handler][] = [
  // Hồ sơ của tôi
  ["GET", /^\/me$/, ({ state, user }) => toMe(state.users.find((item) => item.id === user.id) ?? fail(404, "USER_NOT_FOUND"))],
  [
    "PUT",
    /^\/me$/,
    ({ state, user, body }) => {
      const me = state.users.find((item) => item.id === user.id) ?? fail(404, "USER_NOT_FOUND");
      const { fullName, phone, address, bio } = body as UpdateMeRequest;
      // Gia sư chỉ được sửa thêm phần giới thiệu, quản trị chỉ sửa họ tên
      const isTutor = me.role === "ROLE_TUTOR";
      if (phone !== undefined || address !== undefined || (!isTutor && bio !== undefined)) fail(400, "INVALID_PROFILE_FIELD");
      me.fullName = fullName;
      if (isTutor && bio !== undefined) me.profile = { ...me.profile, bio };
      return toMe(me);
    },
  ],

  // Buổi học
  ["GET", /^\/me\/sessions$/, ({ state, user, params }) => filterSessions(sessionsOf(state, user), params)],
  ["GET", /^\/sessions\/(\d+)$/, ({ state, ids }) => findSession(state, ids[0])],
  [
    "GET",
    /^\/admin\/sessions$/,
    ({ state, user, params }) => {
      requireRole(user, "ROLE_ADMIN");
      return paginate(filterSessions(state.sessions, params), params);
    },
  ],
  [
    "PUT",
    /^\/admin\/sessions\/(\d+)\/meeting-url$/,
    ({ state, user, ids, body }) => {
      requireRole(user, "ROLE_ADMIN");
      const session = findSession(state, ids[0]);
      const { meetingUrl } = body as MeetingUrlRequest;
      if (!/^https:\/\/\S+$/.test(meetingUrl)) fail(400, "INVALID_MEETING_URL");
      session.meetingUrl = meetingUrl;
      return session;
    },
  ],

  // Xin nghỉ
  [
    "POST",
    /^\/sessions\/(\d+)\/leave$/,
    ({ state, user, ids, body, now }) => {
      requireRole(user, "ROLE_TUTOR");
      const session = findSession(state, ids[0]);
      if (session.status === "CANCELLED" || sessionStart(session) <= now) fail(409, "SESSION_NOT_EDITABLE");
      if (state.leaves.some((leave) => leave.sessionId === session.sessionId && leave.requesterId === user.id && leave.status === "PENDING")) {
        fail(409, "LEAVE_REQUEST_ALREADY_PENDING");
      }
      const leave: LeaveRequestResponse = {
        leaveRequestId: state.nextId++,
        sessionId: session.sessionId,
        requesterId: user.id,
        requesterRole: user.role,
        reason: (body as LeaveRequestInput).reason,
        requestedAt: now.toISOString(),
        isLateNotice: sessionStart(session).getTime() - now.getTime() < LATE_NOTICE_HOURS * HOUR_MS,
        status: "PENDING",
        resolution: null,
        resolvedBy: null,
        resolvedAt: null,
        resolutionReason: null,
        replacementSessionId: null,
        sessionNewStatus: session.status,
      };
      state.leaves.unshift(leave);
      return leave;
    },
  ],
  [
    "GET",
    /^\/me\/leave-requests$/,
    ({ state, user, params }) => paginate(state.leaves.filter((leave) => leave.requesterId === user.id && (!params.status || leave.status === params.status)), params),
  ],
  [
    "GET",
    /^\/admin\/leave-requests$/,
    ({ state, user, params }) => {
      requireRole(user, "ROLE_ADMIN");
      const { status, requesterId, sessionId } = params;
      return paginate(
        state.leaves.filter(
          (leave) => (!status || leave.status === status) && (!requesterId || leave.requesterId === Number(requesterId)) && (!sessionId || leave.sessionId === Number(sessionId)),
        ),
        params,
      );
    },
  ],
  [
    "PATCH",
    /^\/admin\/leave-requests\/(\d+)\/reject$/,
    ({ state, user, ids, body }) => {
      requireRole(user, "ROLE_ADMIN");
      const leave = findLeave(state, ids[0]);
      if (leave.status !== "PENDING") fail(409, "LEAVE_REQUEST_ALREADY_RESOLVED");
      return Object.assign(leave, { status: "REJECTED", resolvedBy: user.id, resolvedAt: new Date().toISOString(), resolutionReason: (body as LeaveRequestInput).reason });
    },
  ],
  [
    "POST",
    /^\/admin\/sessions\/(\d+)\/cancel$/,
    ({ state, user, ids, body }) => {
      requireRole(user, "ROLE_ADMIN");
      const session = findSession(state, ids[0]);
      if (session.status === "CANCELLED") fail(409, "SESSION_ALREADY_CANCELLED");
      session.status = "CANCELLED";
      const { reason } = body as CancelSessionRequest;
      for (const leave of state.leaves) {
        if (leave.sessionId === session.sessionId && leave.status === "PENDING") {
          resolveLeave(leave, user.id, { resolution: "CANCEL", resolutionReason: reason, sessionNewStatus: "CANCELLED" });
        }
      }
      return session;
    },
  ],
  [
    "POST",
    /^\/admin\/sessions\/(\d+)\/makeup$/,
    ({ state, user, ids, body }) => {
      requireRole(user, "ROLE_ADMIN");
      const session = findSession(state, ids[0]);
      const { leaveRequestId, makeupDate, startTime, endTime } = body as MakeupRequest;
      const leave = requirePendingLeave(state, leaveRequestId, session.sessionId);
      if (leave.requesterRole !== "ROLE_TUTOR") fail(409, "LEAVE_RESOLUTION_NOT_ALLOWED");
      if (startTime >= endTime || makeupDate < toIsoDate(startOfToday())) fail(400, "INVALID_MAKEUP_TIME");
      const makeup: SessionResponse = {
        ...session,
        sessionId: state.nextId++,
        date: makeupDate,
        startTime,
        endTime,
        status: "SCHEDULED",
        originalSessionId: session.sessionId,
        attendanceLocked: false,
        attendanceNeedsReview: false,
      };
      const teacher = teacherOf(makeup);
      if (teacher !== null && conflictsOf(state, teacher, [makeup]).length > 0) fail(409, "SCHEDULE_CONFLICT");
      state.sessions.push(makeup);
      session.status = "CANCELLED";
      resolveLeave(leave, user.id, { resolution: "MAKEUP", replacementSessionId: makeup.sessionId, sessionNewStatus: "CANCELLED" });
      return makeup;
    },
  ],
  [
    "POST",
    /^\/admin\/sessions\/(\d+)\/substitute$/,
    ({ state, user, ids, body, now }) => {
      requireRole(user, "ROLE_ADMIN");
      const session = findSession(state, ids[0]);
      const { leaveRequestId, substituteTutorId, reason } = body as SubstituteRequest;
      const leave = requirePendingLeave(state, leaveRequestId, session.sessionId);
      if (leave.requesterRole !== "ROLE_TUTOR" || sessionStart(session) <= now) fail(409, "LEAVE_RESOLUTION_NOT_ALLOWED");
      const substitute = findTutor(state, substituteTutorId);
      if (substitute.id === teacherOf(session)) fail(400, "INVALID_TUTOR");
      if (conflictsOf(state, substitute.id, [session]).length > 0) fail(409, "SCHEDULE_CONFLICT");
      session.actualTutorId = substitute.id;
      session.status = "SCHEDULED";
      resolveLeave(leave, user.id, { resolution: "SUBSTITUTE", resolutionReason: reason, sessionNewStatus: "SCHEDULED" });
      return session;
    },
  ],

  // Điểm danh
  ["GET", /^\/sessions\/(\d+)\/attendance$/, ({ state, ids }) => attendanceView(state, findSession(state, ids[0]))],
  [
    "PUT",
    /^\/sessions\/(\d+)\/attendance$/,
    ({ state, user, ids, body, now }) => {
      requireRole(user, "ROLE_TUTOR", "ROLE_ADMIN");
      const session = findSession(state, ids[0]);
      const attendance = attendanceOf(state, session.sessionId);
      const { records, teachingConfirmed, reason } = body as AttendanceSubmission;
      const isAdmin = user.role === "ROLE_ADMIN";
      if (!isAdmin && teacherOf(session) !== user.id) fail(403, "ACCESS_DENIED");
      if (sessionStart(session) > now || session.status === "CANCELLED" || session.status === "PENDING_RESCHEDULE") fail(409, "SESSION_NOT_IN_PROGRESS");
      if (attendance.locked) fail(409, "ATTENDANCE_LOCKED");
      if (isAdmin && teachingConfirmed && !reason) fail(400, "ATTENDANCE_REASON_REQUIRED");
      const roster = studentsOf(state, session.classGroupId);
      for (const record of records) {
        if (!roster.includes(record.studentId)) fail(400, "ATTENDANCE_STUDENT_NOT_ENROLLED");
        if (record.status !== "EXCUSED") continue;
        // "Nghỉ có phép": cần đơn đã duyệt có phép, hoặc quản trị duyệt luôn đơn xin sớm đang chờ
        const requests = state.leaves.filter((leave) => leave.sessionId === session.sessionId && leave.requesterId === record.studentId);
        const pendingEarly = requests.find((leave) => leave.status === "PENDING" && !leave.isLateNotice);
        if (requests.some((leave) => leave.resolution === "EXCUSED")) continue;
        if (!isAdmin || !pendingEarly) fail(409, "ATTENDANCE_EXCUSED_NOT_ALLOWED");
        resolveLeave(pendingEarly, user.id, { resolution: "EXCUSED" });
      }
      for (const input of records) {
        const patch = { status: input.status, note: input.note ?? null, arrivedAt: input.arrivedAt ?? null, recordedBy: user.id, recordedAt: now.toISOString() };
        const existing = attendance.records.find((record) => record.studentId === input.studentId);
        if (existing) Object.assign(existing, patch);
        else attendance.records.push({ recordId: state.nextId++, studentId: input.studentId, locked: false, ...patch });
      }
      if (!isAdmin || teachingConfirmed) attendance.teachingConfirmed = true;
      if (session.status === "SCHEDULED") session.status = "IN_SESSION";
      return attendanceView(state, session);
    },
  ],
  [
    "PATCH",
    /^\/admin\/sessions\/(\d+)\/attendance\/lock$/,
    ({ state, user, ids, body, now }) => {
      requireRole(user, "ROLE_ADMIN");
      const session = findSession(state, ids[0]);
      if (sessionEnd(session) > now) fail(409, "ATTENDANCE_SESSION_NOT_ENDED");
      const attendance = attendanceOf(state, session.sessionId);
      attendance.locked = (body as AttendanceLockInput).locked;
      for (const record of attendance.records) record.locked = attendance.locked;
      session.attendanceLocked = attendance.locked;
      return attendanceView(state, session);
    },
  ],
  [
    "PATCH",
    /^\/admin\/sessions\/(\d+)\/attendance\/(\d+)$/,
    ({ state, user, ids, body, now }) => {
      requireRole(user, "ROLE_ADMIN");
      const attendance = attendanceOf(state, findSession(state, ids[0]).sessionId);
      if (!attendance.locked) fail(409, "ATTENDANCE_NOT_LOCKED");
      const record = attendance.records.find((item) => item.recordId === ids[1]) ?? fail(404, "ATTENDANCE_NOT_FOUND");
      const { status, note, arrivedAt } = body as AttendanceCorrection;
      return Object.assign(record, { status, note: note ?? null, arrivedAt: arrivedAt ?? null, recordedBy: user.id, recordedAt: now.toISOString() });
    },
  ],

  // Lịch rảnh của gia sư
  [
    "GET",
    /^\/tutor\/availability$/,
    ({ state, user }) => {
      requireRole(user, "ROLE_TUTOR");
      return state.availability.get(user.id) ?? [];
    },
  ],
  [
    "PUT",
    /^\/tutor\/availability$/,
    ({ state, user, body }) => {
      requireRole(user, "ROLE_TUTOR");
      const { slots } = body as AvailabilityRequest;
      if (slots.some((slot) => slot.startTime >= slot.endTime)) fail(400, "INVALID_AVAILABILITY");
      state.availability.set(user.id, slots);
      return slots;
    },
  ],

  // Người dùng
  [
    "GET",
    /^\/admin\/users$/,
    ({ state, user, params }) => {
      requireRole(user, "ROLE_ADMIN");
      const keyword = String(params.search ?? "").toLowerCase();
      const matches = state.users.filter(
        (item) => (!params.role || item.role === params.role) && (!keyword || item.fullName.toLowerCase().includes(keyword) || item.email.toLowerCase().includes(keyword)),
      );
      return paginate(
        [...matches].sort((a, b) => a.id - b.id).map(({ id, email, fullName, role, createdAt }) => ({ id, email, fullName, role, createdAt })),
        params,
      );
    },
  ],
  [
    "GET",
    /^\/admin\/profiles$/,
    ({ state, user, params }) => {
      requireRole(user, "ROLE_ADMIN");
      const keyword = String(params.search ?? "").toLowerCase();
      const matches = state.users.filter(
        (item) => item.role === params.role && (!keyword || item.fullName.toLowerCase().includes(keyword) || item.email.toLowerCase().includes(keyword)),
      );
      return paginate([...matches].sort((a, b) => a.id - b.id).map(toMe), params);
    },
  ],
  [
    "POST",
    /^\/admin\/users\/tutors$/,
    ({ state, user, body, now }) => {
      requireRole(user, "ROLE_ADMIN");
      const { email, fullName, baseSalary, sessionRate, bio } = body as CreateTutorRequest;
      if (state.users.some((item) => item.email.toLowerCase() === email.toLowerCase())) fail(409, "EMAIL_ALREADY_EXISTS");
      const tutor: PreviewUser = { id: state.nextId++, email, fullName, role: "ROLE_TUTOR", createdAt: now.toISOString(), profile: { baseSalary, sessionRate, bio: bio ?? null } };
      state.users.push(tutor);
      return toMe(tutor);
    },
  ],
  [
    "PUT",
    /^\/admin\/users\/(\d+)\/tutor-profile$/,
    ({ state, user, ids, body }) => {
      requireRole(user, "ROLE_ADMIN");
      const tutor = findTutor(state, ids[0]);
      const { baseSalary, sessionRate, bio } = body as UpdateTutorProfileRequest;
      tutor.profile = { baseSalary, sessionRate, bio: bio ?? tutor.profile?.bio ?? null };
      return toMe(tutor);
    },
  ],

  // Phân công gia sư
  [
    "GET",
    /^\/admin\/classes\/(\d+)\/available-tutors$/,
    ({ state, user, ids, now }): AvailableTutorResponse[] => {
      requireRole(user, "ROLE_ADMIN");
      if (!state.classes.some((item) => item.classId === ids[0])) fail(404, "CLASS_NOT_FOUND");
      const wanted = assignableSessions(state, ids[0], now);
      return state.users
        .filter((item) => item.role === "ROLE_TUTOR")
        .map((tutor) => {
          const availability = state.availability.get(tutor.id) ?? [];
          const conflicts = conflictsOf(state, tutor.id, wanted);
          const covered = wanted.length > 0 && wanted.every((session) => availability.some((slot) => slot.availableDate === session.date && slot.startTime <= session.startTime && slot.endTime >= session.endTime));
          return { tutorId: tutor.id, tutorName: tutor.fullName, available: conflicts.length === 0, declaredAvailabilityCovered: covered, availability, conflicts };
        })
        .sort((a, b) => Number(b.available) - Number(a.available) || a.tutorId - b.tutorId);
    },
  ],
  [
    "POST",
    /^\/admin\/classes\/(\d+)\/assign$/,
    (context) => {
      const sessions = assignableSessions(context.state, context.ids[0], context.now);
      if (sessions.some((session) => session.scheduledTutorId !== null)) fail(409, "CLASS_ALREADY_ASSIGNED");
      return assignClass(context, sessions, (context.body as AssignTutorRequest).tutorId, null);
    },
  ],
  [
    "PUT",
    /^\/admin\/classes\/(\d+)\/reassign$/,
    (context) => {
      const sessions = assignableSessions(context.state, context.ids[0], context.now);
      const { tutorId, reason } = context.body as ReassignTutorRequest;
      if (sessions.length > 0 && sessions.every((session) => session.scheduledTutorId === tutorId)) fail(409, "TUTOR_ALREADY_ASSIGNED");
      return assignClass(context, sessions, tutorId, reason);
    },
  ],
];

/** Xếp `tutorId` làm gia sư chính cho các buổi chưa diễn ra của lớp */
function assignClass({ state, user, ids, now }: Context, sessions: SessionResponse[], tutorId: number, reason: string | null): AssignmentResponse {
  requireRole(user, "ROLE_ADMIN");
  if (!state.classes.some((item) => item.classId === ids[0])) fail(404, "CLASS_NOT_FOUND");
  if (sessions.length === 0) fail(409, "NO_ASSIGNABLE_SESSIONS");
  const tutor = findTutor(state, tutorId);
  if (conflictsOf(state, tutor.id, sessions).length > 0) fail(409, "SCHEDULE_CONFLICT");
  for (const session of sessions) {
    session.scheduledTutorId = tutor.id;
    session.actualTutorId = tutor.id;
  }
  return {
    assignmentId: state.nextId++,
    classGroupId: ids[0],
    tutorId: tutor.id,
    tutorName: tutor.fullName,
    status: "ACTIVE",
    classStatus: "ASSIGNED",
    assignedBy: user.id,
    assignedAt: now.toISOString(),
    reason,
  };
}

/** Trả lời một lời gọi API bằng dữ liệu mẫu; trả null nếu API đó không nằm trong chế độ xem thử. */
export function handlePreviewRequest(state: PreviewState, request: PreviewRequest): PreviewReply | null {
  for (const [method, pattern, handler] of ROUTES) {
    const match = method === request.method ? pattern.exec(request.path) : null;
    if (!match) continue;
    try {
      const data = handler({ ...request, state, now: new Date(), ids: match.slice(1).map(Number) });
      return { status: 200, body: { success: true, data } };
    } catch (error) {
      if (error instanceof PreviewError) return { status: error.status, body: { success: false, errorCode: error.errorCode, message: error.errorCode } };
      throw error;
    }
  }
  return null;
}
