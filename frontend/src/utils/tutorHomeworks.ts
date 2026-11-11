import type { TutorHomeworkResponse } from "@/interfaces/homework";
import type { ClassGroup, HomeworkFilter, HomeworkGroupBy, HomeworkSort, SessionGroup } from "@/interfaces/homework";

// Nhóm, sắp xếp và lọc danh sách bài tập của gia sư (làm phía trình duyệt).

export const GROUP_BY_OPTIONS: { value: HomeworkGroupBy; label: string }[] = [
  { value: "class", label: "Lớp → buổi" },
  { value: "none", label: "Không nhóm" },
];

export const SORT_OPTIONS: { value: HomeworkSort; label: string }[] = [
  { value: "due-nearest", label: "Hạn nộp gần nhất" },
  { value: "due-latest", label: "Hạn nộp mới nhất" },
  { value: "session-latest", label: "Buổi học mới nhất" },
  { value: "session-earliest", label: "Buổi học cũ nhất" },
  { value: "pending", label: "Nhiều bài chờ chấm" },
  { value: "title", label: "Tên bài (A → Z)" },
];

export const FILTER_OPTIONS: { value: HomeworkFilter; label: string }[] = [
  { value: "all", label: "Tất cả trạng thái" },
  { value: "pending", label: "Có bài chờ chấm" },
  { value: "DRAFT", label: "Bản nháp" },
  { value: "PUBLISHED", label: "Đã công bố" },
  { value: "CLOSED", label: "Đã đóng" },
];

// Bài tập có khớp bộ lọc đang chọn không
export function matchesFilter(item: TutorHomeworkResponse, filter: HomeworkFilter): boolean {
  if (filter === "all") return true;
  if (filter === "pending") return item.submittedCount > 0;
  return item.homework.status === filter;
}

// Hàm so sánh theo kiểu sắp xếp. "Hạn nộp gần nhất": các hạn chưa tới xếp trước (gần nhất trước),
// sau đó là các hạn đã qua (vừa qua trước).
export function homeworkComparator(sort: HomeworkSort, now: Date): (a: TutorHomeworkResponse, b: TutorHomeworkResponse) => number {
  // Hạn nộp dạng mili giây
  const due = (item: TutorHomeworkResponse) => new Date(item.homework.dueAt).getTime();
  const nowMs = now.getTime();
  // So sánh theo tên bài
  const byTitle = (a: TutorHomeworkResponse, b: TutorHomeworkResponse) => a.homework.title.localeCompare(b.homework.title, "vi");
  // So sánh theo ngày và số buổi
  const bySession = (a: TutorHomeworkResponse, b: TutorHomeworkResponse) =>
    a.sessionDate.localeCompare(b.sessionDate) || a.sessionNumber - b.sessionNumber;

  switch (sort) {
    case "due-nearest":
      return (a, b) => {
        const da = due(a);
        const db = due(b);
        const pa = da < nowMs;
        const pb = db < nowMs;
        if (pa !== pb) return pa ? 1 : -1;
        return pa ? db - da : da - db;
      };
    case "due-latest":
      return (a, b) => due(b) - due(a);
    case "session-latest":
      return (a, b) => bySession(b, a) || due(b) - due(a);
    case "session-earliest":
      return (a, b) => bySession(a, b) || due(a) - due(b);
    case "pending":
      return (a, b) => b.submittedCount - a.submittedCount || due(a) - due(b);
    case "title":
      return (a, b) => byTitle(a, b) || due(a) - due(b);
  }
}

// Lọc và sắp xếp phẳng
export function sortHomeworks(
  items: TutorHomeworkResponse[],
  sort: HomeworkSort,
  filter: HomeworkFilter,
  now: Date,
): TutorHomeworkResponse[] {
  return items.filter((item) => matchesFilter(item, filter)).sort(homeworkComparator(sort, now));
}

// Nhóm lớp → buổi. Thứ tự lớp và buổi theo phần tử đứng đầu của nhóm trong danh sách đã sắp xếp,
// nên kiểu sắp xếp áp dụng cho cả ba tầng (lớp, buổi, bài).
export function groupHomeworks(sorted: TutorHomeworkResponse[]): ClassGroup[] {
  const classes = new Map<number, ClassGroup>();
  for (const item of sorted) {
    let group = classes.get(item.classGroupId);
    if (!group) {
      group = { key: `c${item.classGroupId}`, classGroupId: item.classGroupId, sessions: [], total: 0, pendingCount: 0, draftCount: 0 };
      classes.set(item.classGroupId, group);
    }
    const sessionKey = `${group.key}-s${item.sessionNumber}-${item.sessionDate}`;
    let session = group.sessions.find((s) => s.key === sessionKey);
    if (!session) {
      session = { key: sessionKey, sessionNumber: item.sessionNumber, sessionDate: item.sessionDate, items: [], pendingCount: 0 };
      group.sessions.push(session);
    }
    session.items.push(item);
    session.pendingCount += item.submittedCount;
    group.total += 1;
    group.pendingCount += item.submittedCount;
    if (item.homework.status === "DRAFT") group.draftCount += 1;
  }
  return [...classes.values()];
}

// Mặc định mở buổi đầu tiên của mỗi lớp và mọi buổi đang có bài chờ chấm
export function sessionOpenByDefault(group: ClassGroup, session: SessionGroup): boolean {
  return group.sessions[0] === session || session.pendingCount > 0;
}
