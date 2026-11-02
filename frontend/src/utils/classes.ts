import type { ClassSummary } from "@/interfaces/admin";
import type { ClassStatus, SessionResponse } from "@/interfaces/api";

/* Hàm gom các buổi học thành danh sách lớp (khu quản trị). */

/** Gom các buổi (đã xếp theo ngày) thành danh sách lớp; lớp chưa có gia sư đứng trước */
export function summarizeClasses(sessions: SessionResponse[]): ClassSummary[] {
  const byClass = new Map<number, ClassSummary>();
  for (const session of sessions) {
    if (session.status === "CANCELLED") continue;
    const known = byClass.get(session.classGroupId);
    if (known) known.upcomingCount += 1;
    else
      byClass.set(session.classGroupId, {
        classId: session.classGroupId,
        tutorId: session.scheduledTutorId,
        nextSession: session,
        upcomingCount: 1,
      });
  }
  return [...byClass.values()].sort((a, b) => Number(a.tutorId !== null) - Number(b.tutorId !== null) || a.classId - b.classId);
}

/** Lớp tối thiểu để tính bước tiếp theo */
type ClassLike = {
  status: string;
  classType: string;
  currentStudents: number;
  enrollmentDeadline?: string | null;
  startDate: string;
  tutorId?: number | null;
};

/** Một thao tác đổi trạng thái lớp; `targets` gọi lần lượt (Bản nháp → Mở đăng ký đi qua PUBLISHED) */
export interface ClassStatusAction {
  key: string;
  label: string;
  hint: string;
  icon: string;
  targets: ClassStatus[];
  /** Thao tác hủy: tô đỏ và bắt buộc nhập lý do */
  danger?: boolean;
}

/** Việc admin cần làm tiếp với một lớp (null nếu không có gì cần làm) */
export interface ClassNextStep {
  text: string;
  /** "assign": phân công gia sư - "status": đổi trạng thái - "reopen": xử lý lớp không đủ sĩ số */
  action: "assign" | "status" | "reopen";
}

const isoOf = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

/** Đã chốt được sĩ số: 1 kèm 1 có học viên; lớp nhóm qua hạn đăng ký và có 2 – 8 học viên */
function readyToClose(item: ClassLike, todayIso: string): boolean {
  if (item.classType === "ONE_ON_ONE") return item.currentStudents === 1;
  const deadlinePassed = item.enrollmentDeadline != null && todayIso > item.enrollmentDeadline;
  return deadlinePassed && item.currentStudents >= 2 && item.currentStudents <= 8;
}

/**
 * Chỉ những bước chuyển hợp lệ lúc này (khớp ClassService.changeStatus ở backend), để admin không phải
 * chọn trong cả danh sách trạng thái. Lớp chưa có học viên mới hủy được.
 */
export function classStatusActions(item: ClassLike, today: Date): ClassStatusAction[] {
  const todayIso = isoOf(today);
  const actions: ClassStatusAction[] = [];
  switch (item.status) {
    case "DRAFT":
    case "PUBLISHED":
      // Chưa có gia sư thì chưa mở đăng ký được (backend trả CLASS_TUTOR_REQUIRED)
      if (!item.tutorId) break;
      actions.push({
        key: "open",
        label: "Mở đăng ký",
        hint: "Lớp hiện trên danh mục, học viên đăng ký được",
        icon: "how_to_reg",
        targets: item.status === "DRAFT" ? ["PUBLISHED", "ENROLLING"] : ["ENROLLING"],
      });
      break;
    case "ENROLLING": {
      const deadlinePassed = item.enrollmentDeadline != null && todayIso > item.enrollmentDeadline;
      if (readyToClose(item, todayIso) && item.tutorId) {
        actions.push({ key: "close", label: "Chốt lớp", hint: "Ngừng nhận đăng ký, chuẩn bị khai giảng", icon: "lock", targets: ["ASSIGNED"] });
      }
      if (item.classType === "GROUP" && deadlinePassed && item.currentStudents === 1) {
        actions.push({
          key: "failed",
          label: "Không đủ sĩ số",
          hint: "Sau đó mở lại, hoàn tiền hoặc chuyển 1 kèm 1",
          icon: "group_off",
          targets: ["FAILED_TO_OPEN"],
        });
      }
      break;
    }
    case "ASSIGNED":
      if (todayIso >= item.startDate) {
        actions.push({ key: "start", label: "Bắt đầu học", hint: "Đã tới ngày khai giảng", icon: "play_circle", targets: ["IN_PROGRESS"] });
      }
      break;
    case "IN_PROGRESS":
      actions.push({ key: "complete", label: "Kết thúc lớp", hint: "Khi đã dạy và chốt điểm danh mọi buổi", icon: "task_alt", targets: ["COMPLETED"] });
      break;
  }
  const cancellable = ["DRAFT", "PUBLISHED", "ENROLLING", "FAILED_TO_OPEN"].includes(item.status)
    || (item.status === "ASSIGNED" && todayIso < item.startDate);
  if (cancellable && item.currentStudents === 0) {
    actions.push({ key: "cancel", label: "Hủy lớp", hint: "Lớp chưa có học viên", icon: "cancel", targets: ["CANCELLED"], danger: true });
  }
  return actions;
}

/** Gợi ý bước tiếp theo theo vòng đời lớp (BR-04), hiện dưới trạng thái của lớp */
export function classNextStep(item: ClassLike, today: Date): ClassNextStep | null {
  const todayIso = isoOf(today);
  switch (item.status) {
    case "DRAFT":
    case "PUBLISHED":
      return item.tutorId
        ? { text: "Chưa mở đăng ký", action: "status" }
        : { text: "Cần phân công gia sư trước khi mở đăng ký", action: "assign" };
    case "ENROLLING":
      if (!item.tutorId) return { text: "Chưa có gia sư, học viên chưa thấy lớp", action: "assign" };
      if (readyToClose(item, todayIso)) return { text: "Đủ sĩ số, có thể chốt lớp", action: "status" };
      if (item.classType === "GROUP" && item.enrollmentDeadline != null && todayIso > item.enrollmentDeadline && item.currentStudents === 1)
        return { text: "Hết hạn, chỉ có 1 học viên", action: "status" };
      return null;
    case "FAILED_TO_OPEN":
      return { text: "Mở lại, hoàn tiền hoặc chuyển 1 kèm 1", action: "reopen" };
    case "ASSIGNED":
      return todayIso >= item.startDate ? { text: "Tới ngày khai giảng", action: "status" } : null;
    default:
      return null;
  }
}

/** Thứ trong tuần (0 = Chủ nhật) của từng mẫu lịch */
const PATTERN_DAYS: Record<string, number[]> = {
  MON_WED_FRI: [1, 3, 5],
  TUE_THU_SAT: [2, 4, 6],
  SAT_SUN: [6, 0],
};

/**
 * Ngày học dự kiến của buổi cuối: đếm các ngày đúng mẫu lịch kể từ ngày khai giảng (cùng cách backend sinh buổi).
 * Không tính buổi bù phát sinh sau; lịch thật xem trong chi tiết lớp.
 */
export function estimatedEndDate(startDate: string, pattern: string, totalSessions: number): string | null {
  const days = PATTERN_DAYS[pattern];
  if (!days || totalSessions < 1) return null;
  const [y, m, d] = startDate.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  let count = 0;
  for (let guard = 0; guard < 2000; guard++) {
    if (days.includes(date.getDay())) count++;
    if (count === totalSessions) break;
    date.setDate(date.getDate() + 1);
  }
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

/** Mức giảm theo sĩ số (BR-02.11): 1 kèm 1 không giảm; nhóm 2–3: 20%, 4–5: 35%, 6–8: 40% */
export function discountForSize(classType: string, size: number): number {
  if (classType === "ONE_ON_ONE") return 0;
  const n = Math.max(2, size);
  return n <= 3 ? 0.2 : n <= 5 ? 0.35 : 0.4;
}

/** Nhãn bậc sĩ số, ví dụ "nhóm 4–5 người" */
export function sizeTierLabel(classType: string, size: number): string {
  if (classType === "ONE_ON_ONE") return "1 kèm 1";
  const n = Math.max(2, size);
  return n <= 3 ? "nhóm 2–3 người" : n <= 5 ? "nhóm 4–5 người" : "nhóm 6–8 người";
}

/** Mã hiển thị: khóa học KH001, lớp học LH001 (theo id trong database) */
/** Tiền tố mã hiển thị theo loại đối tượng: KH001 (khóa), LH001 (lớp), BH001 (buổi học)… */
const CODE_PREFIX = {
  course: "KH",
  class: "LH",
  session: "BH",
  student: "HV",
  tutor: "GV",
  user: "ND",
  order: "DH",
  payment: "TT",
  refund: "HT",
  enrollment: "GD",
  topup: "NT",
  intent: "YC",
} as const;

export type DisplayCodeKind = keyof typeof CODE_PREFIX;

/** Mã dễ đọc thay cho "#id": displayCode("class", 12) → "LH012" */
export function displayCode(kind: DisplayCodeKind, id: number): string {
  return `${CODE_PREFIX[kind]}${String(id).padStart(3, "0")}`;
}
