import { addDays, startOfToday, toIsoDate } from "@/utils/date";
import type {
  AdminClassResponse,
  ChangeClassStatusRequest,
  ClassStatus,
  CourseRequest,
  CourseResponse,
  CreateClassRequest,
  EnrollmentResponse,
  GradeLevel,
  PageResponse,
  PayrollLineResponse,
  PayrollResponse,
  ReopenClassRequest,
  SchedulePattern,
  TimeSlot,
} from "@/interfaces/api";
import type { PreviewContext, PreviewHandler, PreviewState } from "@/interfaces/preview";

/*
 * Phần "backend" xem thử cho khóa học, lớp học, ghi danh và bảng lương.
 * Dữ liệu dựng một lần theo PreviewState (WeakMap) để thao tác tạo / sửa còn giữ tới khi tải lại trang.
 */

interface ManagementData {
  courses: CourseResponse[];
  classes: AdminClassResponse[];
  enrollments: EnrollmentResponse[];
  finalized: Set<string>;
}

const store = new WeakMap<PreviewState, ManagementData>();

const SLOT_LABEL: Record<TimeSlot, string> = {
  SLOT_MORNING: "08:00 – 10:00",
  SLOT_AFTERNOON: "14:00 – 16:00",
  SLOT_EVENING: "18:00 – 20:00",
  SLOT_LATE_EVENING: "19:30 – 21:30",
};

/** Lương mẫu của từng gia sư: [lương cứng, thù lao mỗi buổi] */
const TUTOR_PAY: Record<number, [number, number]> = { 3: [3_000_000, 250_000], 7: [2_500_000, 220_000], 8: [2_500_000, 230_000] };

function paginate<T>(items: T[], params: Record<string, unknown>): PageResponse<T> {
  const page = Number(params.page ?? 0);
  const size = Number(params.size ?? 20);
  return {
    content: items.slice(page * size, (page + 1) * size),
    page,
    size,
    totalElements: items.length,
    totalPages: Math.ceil(items.length / size),
  };
}

function fail(status: number, errorCode: string): never {
  throw Object.assign(new Error(errorCode), { previewStatus: status, previewErrorCode: errorCode });
}

function dataOf(state: PreviewState): ManagementData {
  const existing = store.get(state);
  if (existing) return existing;
  const today = startOfToday();
  const created = `${toIsoDate(addDays(today, -60))}T09:00:00`;
  const course = (
    id: number,
    name: string,
    subject: string,
    gradeLevel: GradeLevel,
    price: number,
    active = true,
    description = "",
  ): CourseResponse => ({
    id,
    name,
    subject,
    gradeLevel,
    basePrice1on1: price,
    totalSessions: 24,
    durationMinutes: 120,
    description: description || null,
    active,
    createdAt: created,
  });
  const courses = [
    course(1, "Toán 10 – Nền tảng THPT", "MATH", "GRADE_10", 4_800_000, true, "Hàm số, phương trình, bất phương trình và hình học vectơ."),
    course(2, "Toán 12 – Tổng ôn Tốt nghiệp", "MATH", "GRADE_12", 5_400_000, true, "Luyện đề theo cấu trúc mới, chiến thuật trắc nghiệm."),
    course(
      3,
      "Tiếng Anh 11 – Ngữ pháp & đọc hiểu",
      "ENGLISH",
      "GRADE_11",
      4_500_000,
      true,
      "Hệ thống ngữ pháp trọng tâm và kỹ năng đọc hiểu.",
    ),
    course(4, "Ngữ Văn 12 – Nghị luận", "LITERATURE", "GRADE_12", 4_600_000, true, "Kỹ năng nghị luận xã hội và văn học."),
    course(
      5,
      "Hóa học 10 – Cơ bản",
      "CHEMISTRY",
      "GRADE_10",
      4_400_000,
      false,
      "Cấu tạo nguyên tử, liên kết hóa học, phản ứng oxi hóa – khử.",
    ),
    course(
      6,
      "Tin học 11 – Lập trình Python",
      "INFORMATICS",
      "GRADE_11",
      4_200_000,
      true,
      "Lập trình Python từ cơ bản tới thuật toán thi học sinh giỏi.",
    ),
  ];
  const klass = (
    id: number,
    courseId: number,
    status: ClassStatus,
    pattern: SchedulePattern,
    slot: TimeSlot,
    startOffset: number,
    current: number,
    reserved = 0,
  ): AdminClassResponse => {
    const c = courses.find((item) => item.id === courseId) as CourseResponse;
    const code = `${c.subject.slice(0, 4)}-G${c.gradeLevel.slice(-2)}-${pattern === "MON_WED_FRI" ? "MWF" : pattern === "TUE_THU_SAT" ? "TTS" : "SS"}-${slot.split("_")[1][0]}-${String(id).padStart(3, "0")}`;
    const discount = current >= 6 ? 0.35 : current >= 4 ? 0.25 : current >= 2 ? 0.15 : 0;
    return {
      id,
      classCode: code,
      courseId,
      courseName: c.name,
      subject: c.subject,
      gradeLevel: c.gradeLevel,
      classType: "GROUP",
      deliveryMode: id % 2 ? "OFFLINE" : "ONLINE",
      schedulePattern: pattern,
      timeSlot: slot,
      timeSlotLabel: SLOT_LABEL[slot],
      startDate: toIsoDate(addDays(today, startOffset)),
      enrollmentDeadline: toIsoDate(addDays(today, startOffset - 3)),
      status,
      totalSessions: c.totalSessions,
      maxStudents: 8,
      currentStudents: current,
      reservedStudents: reserved,
      spotsLeft: 8 - current - reserved,
      full: current + reserved >= 8,
      basePrice1on1: c.basePrice1on1,
      estimatedFee: Math.round(c.basePrice1on1 * (1 - discount)),
      discountRate: discount,
      meetingUrl: null,
      createdAt: created,
    };
  };
  const classes = [
    klass(12, 2, "IN_PROGRESS", "MON_WED_FRI", "SLOT_EVENING", -21, 4),
    klass(15, 1, "IN_PROGRESS", "SAT_SUN", "SLOT_MORNING", -28, 5),
    klass(18, 3, "IN_PROGRESS", "TUE_THU_SAT", "SLOT_EVENING", -14, 3),
    klass(21, 4, "IN_PROGRESS", "MON_WED_FRI", "SLOT_MORNING", -7, 3),
    klass(24, 2, "ENROLLING", "TUE_THU_SAT", "SLOT_LATE_EVENING", 11, 5, 1),
    klass(25, 6, "ENROLLING", "SAT_SUN", "SLOT_AFTERNOON", 18, 2),
    klass(26, 1, "ASSIGNED", "MON_WED_FRI", "SLOT_EVENING", 5, 7, 1),
    klass(27, 3, "DRAFT", "MON_WED_FRI", "SLOT_AFTERNOON", 30, 0),
    klass(28, 4, "FAILED_TO_OPEN", "SAT_SUN", "SLOT_MORNING", -2, 1),
  ];
  const enrollments: EnrollmentResponse[] = [];
  let enrollmentId = 500;
  for (const item of state.classes) {
    const info = classes.find((c) => c.id === item.classId);
    for (const studentId of item.studentIds) {
      enrollments.push({
        enrollmentId: enrollmentId++,
        studentId,
        classGroupId: item.classId,
        paymentId: enrollmentId + 300,
        feeCharged: info?.estimatedFee ?? 4_000_000,
        discountRate: info?.discountRate ?? 0,
        enrollmentSizeAtTime: item.studentIds.length,
        status: "ACTIVE",
        enrolledAt: `${toIsoDate(addDays(today, -35 + (studentId % 5)))}T10:15:00`,
        cancelledAt: null,
        cancellationReason: null,
        cancelledBy: null,
      });
    }
  }
  enrollments.push({
    enrollmentId: enrollmentId++,
    studentId: 9,
    classGroupId: 28,
    paymentId: 899,
    feeCharged: 4_600_000,
    discountRate: 0,
    enrollmentSizeAtTime: 1,
    status: "REFUNDED",
    enrolledAt: `${toIsoDate(addDays(today, -20))}T08:00:00`,
    cancelledAt: `${toIsoDate(addDays(today, -2))}T08:00:00`,
    cancellationReason: "Lớp không đủ sĩ số để khai giảng",
    cancelledBy: 1,
  });
  const data: ManagementData = { courses, classes, enrollments, finalized: new Set() };
  store.set(state, data);
  return data;
}

/** Dòng lương của một gia sư trong tháng, tính từ các buổi mẫu */
function payrollLine(
  state: PreviewState,
  tutorId: number,
  year: number,
  month: number,
  finalized: boolean,
  now: Date,
): PayrollLineResponse | null {
  const tutor = state.users.find((user) => user.id === tutorId);
  if (!tutor) return null;
  const inMonth = state.sessions.filter((session) => {
    const [y, m] = session.date.split("-").map(Number);
    return y === year && m === month && (session.actualTutorId ?? session.scheduledTutorId) === tutorId;
  });
  const past = inMonth.filter((session) => new Date(`${session.date}T${session.endTime}`) < now);
  const cancelled = inMonth.filter((session) => session.status === "CANCELLED").length;
  const unfinalized = finalized ? 0 : past.filter((session) => !session.attendanceLocked && session.status !== "CANCELLED").length;
  const valid = past.filter((session) => session.status === "COMPLETED").length + (finalized ? 0 : 0);
  const [base, rate] = TUTOR_PAY[tutorId] ?? [2_500_000, 200_000];
  // Tháng trước không có buổi mẫu nào: dựng số liệu giả cho có hình
  const validSessions = inMonth.length === 0 ? 10 + (tutorId % 5) : valid;
  return {
    tutorId,
    tutorName: tutor.fullName,
    year,
    month,
    status: finalized ? "FINALIZED" : "DRAFT",
    finalizedAt: finalized ? `${year}-${String(month).padStart(2, "0")}-28T17:00:00` : null,
    baseSalary: base,
    sessionRate: rate,
    validSessions,
    cancelledSessions: inMonth.length === 0 ? tutorId % 2 : cancelled,
    substitutedOutSessions: inMonth.length === 0 ? (tutorId === 7 ? 1 : 0) : 0,
    unfinalizedSessions: inMonth.length === 0 ? 0 : unfinalized,
    sessionPay: validSessions * rate,
    totalPay: base + validSessions * rate,
  };
}

function payrollOf(context: PreviewContext, year: number, month: number): PayrollResponse {
  const data = dataOf(context.state);
  const now = context.now;
  const key = `${year}-${month}`;
  // Các tháng trước tháng trước nữa coi như đã chốt
  const monthsAgo = (now.getFullYear() - year) * 12 + (now.getMonth() + 1 - month);
  const finalized = data.finalized.has(key) || monthsAgo >= 2;
  const lines = [3, 7, 8]
    .map((id) => payrollLine(context.state, id, year, month, finalized, now))
    .filter((line): line is PayrollLineResponse => line !== null);
  const blocking = finalized
    ? []
    : context.state.sessions
        .filter((session) => {
          const [y, m] = session.date.split("-").map(Number);
          return (
            y === year &&
            m === month &&
            !session.attendanceLocked &&
            session.status !== "CANCELLED" &&
            new Date(`${session.date}T${session.endTime}`) < now
          );
        })
        .map((session) => session.sessionId);
  return {
    year,
    month,
    status: finalized ? "FINALIZED" : "DRAFT",
    lines,
    totalPayroll: lines.reduce((sum, line) => sum + line.totalPay, 0),
    canFinalize: !finalized && blocking.length === 0,
    blockingSessionIds: blocking,
    finalizedBy: finalized ? 1 : null,
    finalizedAt: finalized ? `${year}-${String(month).padStart(2, "0")}-28T17:00:00` : null,
  };
}

const requireAdmin = (context: PreviewContext) => {
  if (context.user.role !== "ROLE_ADMIN") fail(403, "ACCESS_DENIED");
};

export const MANAGEMENT_ROUTES: [method: string, pattern: RegExp, handler: PreviewHandler][] = [
  [
    "GET",
    /^\/admin\/courses$/,
    (context) => {
      requireAdmin(context);
      const { subject, gradeLevel, active } = context.params;
      const items = dataOf(context.state).courses.filter(
        (course) =>
          (!subject || course.subject === subject) &&
          (!gradeLevel || course.gradeLevel === gradeLevel) &&
          (active === undefined || String(course.active) === String(active)),
      );
      return paginate(items, context.params);
    },
  ],
  [
    "POST",
    /^\/admin\/courses$/,
    (context) => {
      requireAdmin(context);
      const data = dataOf(context.state);
      const body = context.body as CourseRequest;
      const created: CourseResponse = {
        ...body,
        id: context.state.nextId++,
        description: body.description ?? null,
        active: true,
        createdAt: context.now.toISOString(),
      };
      data.courses.push(created);
      return created;
    },
  ],
  [
    "PUT",
    /^\/admin\/courses\/(\d+)$/,
    (context) => {
      requireAdmin(context);
      const course = dataOf(context.state).courses.find((item) => item.id === context.ids[0]) ?? fail(404, "COURSE_NOT_FOUND");
      const body = context.body as CourseRequest;
      Object.assign(course, body, { description: body.description ?? null });
      return course;
    },
  ],
  [
    "PATCH",
    /^\/admin\/courses\/(\d+)\/toggle$/,
    (context) => {
      requireAdmin(context);
      const course = dataOf(context.state).courses.find((item) => item.id === context.ids[0]) ?? fail(404, "COURSE_NOT_FOUND");
      course.active = !course.active;
      return course;
    },
  ],
  [
    "GET",
    /^\/admin\/classes$/,
    (context) => {
      requireAdmin(context);
      const { status, classType, schedulePattern, courseId } = context.params;
      const items = dataOf(context.state).classes.filter(
        (item) =>
          (!status || item.status === status) &&
          (!classType || item.classType === classType) &&
          (!schedulePattern || item.schedulePattern === schedulePattern) &&
          (!courseId || item.courseId === Number(courseId)),
      );
      return paginate(items, context.params);
    },
  ],
  [
    "POST",
    /^\/admin\/classes$/,
    (context) => {
      requireAdmin(context);
      const data = dataOf(context.state);
      const body = context.body as CreateClassRequest;
      const course = data.courses.find((item) => item.id === body.courseId) ?? fail(404, "COURSE_NOT_FOUND");
      const id = context.state.nextId++;
      const created: AdminClassResponse = {
        id,
        classCode: `${course.subject.slice(0, 4)}-G${course.gradeLevel.slice(-2)}-NEW-${String(id).padStart(3, "0")}`,
        courseId: course.id,
        courseName: course.name,
        subject: course.subject,
        gradeLevel: course.gradeLevel,
        classType: body.classType,
        deliveryMode: body.deliveryMode,
        schedulePattern: body.schedulePattern,
        timeSlot: body.timeSlot,
        timeSlotLabel: SLOT_LABEL[body.timeSlot],
        startDate: body.startDate,
        enrollmentDeadline: body.enrollmentDeadline ?? null,
        status: "DRAFT",
        totalSessions: course.totalSessions,
        maxStudents: body.classType === "GROUP" ? 8 : 1,
        currentStudents: 0,
        reservedStudents: 0,
        spotsLeft: body.classType === "GROUP" ? 8 : 1,
        full: false,
        basePrice1on1: course.basePrice1on1,
        estimatedFee: course.basePrice1on1,
        discountRate: 0,
        meetingUrl: body.meetingUrl ?? null,
        createdAt: context.now.toISOString(),
      };
      data.classes.unshift(created);
      return created;
    },
  ],
  [
    "PATCH",
    /^\/admin\/classes\/(\d+)\/status$/,
    (context) => {
      requireAdmin(context);
      const item = dataOf(context.state).classes.find((c) => c.id === context.ids[0]) ?? fail(404, "CLASS_NOT_FOUND");
      item.status = (context.body as ChangeClassStatusRequest).newStatus;
      return item;
    },
  ],
  [
    "POST",
    /^\/admin\/classes\/(\d+)\/reopen$/,
    (context) => {
      requireAdmin(context);
      const item = dataOf(context.state).classes.find((c) => c.id === context.ids[0]) ?? fail(404, "CLASS_NOT_FOUND");
      const body = context.body as ReopenClassRequest;
      Object.assign(item, {
        status: "ENROLLING",
        startDate: body.startDate,
        enrollmentDeadline: body.enrollmentDeadline ?? item.enrollmentDeadline,
      });
      return item;
    },
  ],
  [
    "GET",
    /^\/admin\/classes\/(\d+)\/enrollments$/,
    (context) => {
      requireAdmin(context);
      return paginate(
        dataOf(context.state).enrollments.filter((item) => item.classGroupId === context.ids[0]),
        context.params,
      );
    },
  ],
  [
    "GET",
    /^\/admin\/payroll\/(\d+)\/(\d+)$/,
    (context) => {
      requireAdmin(context);
      return payrollOf(context, context.ids[0], context.ids[1]);
    },
  ],
  [
    "POST",
    /^\/admin\/payroll\/(\d+)\/(\d+)\/finalize$/,
    (context) => {
      requireAdmin(context);
      const current = payrollOf(context, context.ids[0], context.ids[1]);
      if (!current.canFinalize) fail(409, "PAYROLL_FINALIZED");
      dataOf(context.state).finalized.add(`${context.ids[0]}-${context.ids[1]}`);
      return payrollOf(context, context.ids[0], context.ids[1]);
    },
  ],
  [
    "GET",
    /^\/tutor\/payroll$/,
    (context) => {
      if (context.user.role !== "ROLE_TUTOR") fail(403, "ACCESS_DENIED");
      const lines: PayrollLineResponse[] = [];
      for (let back = 0; back < 4; back += 1) {
        const date = new Date(context.now.getFullYear(), context.now.getMonth() - back, 1);
        const sheet = payrollOf(context, date.getFullYear(), date.getMonth() + 1);
        const line = sheet.lines.find((item) => item.tutorId === context.user.id);
        if (line) lines.push(line);
      }
      return paginate(lines, context.params);
    },
  ],
  [
    "GET",
    /^\/enrollments\/my$/,
    (context) => {
      if (context.user.role !== "ROLE_STUDENT") fail(403, "ACCESS_DENIED");
      return paginate(
        dataOf(context.state).enrollments.filter(
          (item) => item.studentId === context.user.id && (!context.params.status || item.status === context.params.status),
        ),
        context.params,
      );
    },
  ],
  [
    "DELETE",
    /^\/enrollments\/(\d+)$/,
    (context) => {
      const item =
        dataOf(context.state).enrollments.find((e) => e.enrollmentId === context.ids[0] && e.studentId === context.user.id) ??
        fail(404, "ENROLLMENT_NOT_FOUND");
      Object.assign(item, {
        status: "REFUNDED",
        cancelledAt: context.now.toISOString(),
        cancellationReason: (context.body as { reason: string }).reason,
        cancelledBy: context.user.id,
      });
      return item;
    },
  ],
];
