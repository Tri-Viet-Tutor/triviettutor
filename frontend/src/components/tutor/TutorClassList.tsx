import { useMemo } from "react";
import { useQueries } from "@tanstack/react-query";
import { PortalEmpty, PortalLoading, PortalError } from "@/components/dashboard/PortalState";
import { Icon } from "@/components/ui/Icon";
import { FOCUS_RING } from "@/constants/classNames";
import { useMySessions, useUserId } from "@/hooks/usePortalData";
import type { SessionResponse, TuitionClass } from "@/interfaces/dto";
import { getTuitionClass } from "@/services/tuitionPaymentService";
import { subjectLabel, subjectSpine } from "@/constants/management";
import { displayCode } from "@/utils/classes";
import { formatDate, parseIsoDate } from "@/utils/date";
import { isUpcoming, needsAttendance, sessionStart } from "@/utils/sessions";

interface ClassGroup {
  classGroupId: number;
  sessions: SessionResponse[];
  upcoming: SessionResponse[];
  past: SessionResponse[];
  nextSession: SessionResponse | null;
  attentionCount: number;
}

// Gom các buổi của tôi theo lớp, lớp có buổi gần nhất lên trước
function groupByClass(sessions: SessionResponse[], tutorId: number | undefined, now: Date): ClassGroup[] {
  const byClass = new Map<number, SessionResponse[]>();
  for (const session of sessions) {
    const list = byClass.get(session.classGroupId);
    if (list) list.push(session);
    else byClass.set(session.classGroupId, [session]);
  }
  const groups: ClassGroup[] = [];
  for (const [classGroupId, items] of byClass) {
    const upcoming = items.filter((session) => isUpcoming(session, now)).sort((a, b) => sessionStart(a).getTime() - sessionStart(b).getTime());
    const past = items.filter((session) => !isUpcoming(session, now));
    groups.push({
      classGroupId,
      sessions: items,
      upcoming,
      past,
      nextSession: upcoming[0] ?? null,
      attentionCount: items.filter((session) => needsAttendance(session, tutorId, now)).length,
    });
  }
  // Lớp có buổi sắp tới gần nhất lên trước, lớp đã học hết xuống cuối
  groups.sort((a, b) => {
    const aTime = a.nextSession ? sessionStart(a.nextSession).getTime() : Infinity;
    const bTime = b.nextSession ? sessionStart(b.nextSession).getTime() : Infinity;
    return aTime - bTime;
  });
  return groups;
}

// Khối lớp "GRADE_11" → "11"
const gradeNumber = (grade: string) => grade.replace("GRADE_", "");

// Tầng "Lớp học": lớp còn buổi sắp tới quay bìa ra, lớp đã dạy xong cất vào kệ chỉ thấy gáy sách.
// Mỗi thẻ là một lớp; bấm vào để xem "Danh sách buổi học" của riêng lớp đó.
// Bấm vào một lớp để xem "Danh sách buổi học" của riêng lớp đó.
export function TutorClassList({
  now,
  onSelect,
}: {
  now: Date;
  onSelect: (classGroupId: number) => void;
}) {
  const tutorId = useUserId();
  const sessionsQuery = useMySessions();
  const groups = useMemo(() => groupByClass(sessionsQuery.data ?? [], tutorId, now), [sessionsQuery.data, tutorId, now]);

  // Buổi dạy chỉ mang classGroupId, nên lấy thêm chi tiết lớp để hiện tên khóa, môn và khối
  const details = useQueries({
    queries: groups.map((group) => ({
      queryKey: ["catalog-class", group.classGroupId],
      queryFn: () => getTuitionClass(group.classGroupId),
      staleTime: 5 * 60_000,
      retry: false,
    })),
  });
  // Thông tin lớp đã tải theo thứ tự trong danh sách
  const detailOf = (index: number): TuitionClass | undefined => details[index]?.data;

  if (sessionsQuery.isPending) return <PortalLoading label="Đang tải danh sách lớp" rows={3} />;
  if (sessionsQuery.isError) return <PortalError message="Không tải được danh sách lớp." onRetry={() => void sessionsQuery.refetch()} />;
  if (groups.length === 0)
    return (
      <PortalEmpty
        icon="school"
        title="Bạn chưa được phân công lớp nào."
        description="Các lớp bạn đang dạy sẽ hiện ở đây sau khi trung tâm phân công."
      />
    );

  // Bìa sách: nền sáng để tách khỏi thanh điều hướng navy, màu môn chỉ xuất hiện ở ba chỗ
  // (dải trên, dòng môn, thanh tiến độ) nên cả lưới vẫn yên mắt dù mỗi lớp một màu.
  function cover(group: ClassGroup) {
    const detail = detailOf(groups.indexOf(group));
    const live = group.nextSession !== null;
    const tone = subjectSpine(detail?.subject ?? "");
    const accent = live ? tone : "#9AA3B2";
    const total = detail?.totalSessions ?? group.sessions.length;
    const taught = Math.min(group.past.length, total);
    const code = displayCode("class", group.classGroupId);
    return (
      <button
        type="button"
        onClick={() => onSelect(group.classGroupId)}
        className={`flex h-full w-full flex-col overflow-hidden rounded-sm border border-brand-sandLine bg-white text-left transition-shadow hover:shadow-[0_14px_28px_-20px_rgba(20,33,61,0.6)] ${
          live ? "" : "bg-brand-sand/50"
        } ${FOCUS_RING}`}
      >
        {
          // Dải màu môn trên đầu bìa, như màu bộ sách của một nhà xuất bản
        }
        <span aria-hidden="true" className="block h-1.5 w-full" style={{ backgroundColor: accent }} />

        <span className="flex flex-1 flex-col gap-4 p-5">
          <span className="flex items-baseline justify-between gap-3">
            <span className="text-[11.5px] font-bold uppercase tracking-[0.16em]" style={{ color: accent }}>
              {detail ? subjectLabel(detail.subject) : code}
            </span>
            {detail && <span className="shrink-0 text-[11.5px] font-semibold text-brand-muted">Lớp {gradeNumber(detail.gradeLevel)}</span>}
          </span>

          <span className={`block text-[22px] font-bold leading-[1.15] tracking-tight ${live ? "text-brand-ink" : "text-brand-muted"}`}>
            {detail?.courseName ?? code}
          </span>

          <span className="mt-auto block border-t border-brand-sandLine pt-3.5">
            <span className="flex items-center justify-between gap-3 text-[12.5px] text-brand-muted">
              <span className="font-semibold">{code}</span>
              {detail && <span className="tabular-nums">{detail.timeSlotLabel}</span>}
            </span>

            <span className="mt-3 flex items-baseline justify-between gap-3">
              <span className="text-[13.5px] font-semibold text-brand-ink">
                {group.nextSession ? `Buổi kế tiếp ${formatDate(parseIsoDate(group.nextSession.date))}` : "Đã dạy xong"}
              </span>
              {group.attentionCount > 0 && (
                <span className="flex shrink-0 items-center gap-1 text-[12.5px] font-bold text-amber-800">
                  <Icon name="fact_check" className="text-[15px]" />
                  {group.attentionCount}
                </span>
              )}
            </span>

            <span className="mt-2.5 flex items-center gap-2.5">
              <span aria-hidden="true" className="h-[3px] flex-1 overflow-hidden bg-brand-sandDeep">
                <span
                  className="block h-full"
                  style={{ width: `${Math.round((taught / Math.max(total, 1)) * 100)}%`, backgroundColor: accent }}
                />
              </span>
              <span className="shrink-0 text-[12px] tabular-nums text-brand-muted">
                {taught}/{total} buổi
              </span>
            </span>
          </span>
        </span>
      </button>
    );
  }

  return (
    <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {groups.map((group) => (
        <li key={group.classGroupId}>{cover(group)}</li>
      ))}
    </ul>
  );
}
