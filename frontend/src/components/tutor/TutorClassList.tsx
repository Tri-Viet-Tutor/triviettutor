import { useMemo } from "react";
import { StatusChip } from "@/components/dashboard/StatusChip";
import { PortalEmpty, PortalLoading, PortalError } from "@/components/dashboard/PortalState";
import { Icon } from "@/components/ui/Icon";
import { FOCUS_RING } from "@/constants/classNames";
import { useMySessions, useUserId } from "@/hooks/usePortalData";
import type { SessionResponse } from "@/interfaces/api";
import { displayCode } from "@/utils/classes";
import { parseIsoDate } from "@/utils/date";
import { formatLongDate, isUpcoming, needsAttendance, sessionStart } from "@/utils/sessions";

interface ClassGroup {
  classGroupId: number;
  sessions: SessionResponse[];
  upcoming: SessionResponse[];
  past: SessionResponse[];
  nextSession: SessionResponse | null;
  attentionCount: number;
}

/** Gom các buổi của tôi theo lớp, lớp có buổi gần nhất lên trước */
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

/**
 * Tầng "Lớp học": gom các buổi dạy của gia sư theo lớp, mỗi thẻ là một lớp.
 * Bấm vào một lớp để xem "Danh sách buổi học" của riêng lớp đó.
 */
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

  return (
    <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {groups.map((group) => (
        <li key={group.classGroupId}>
          <button
            type="button"
            onClick={() => onSelect(group.classGroupId)}
            className={`flex h-full w-full flex-col gap-2.5 rounded-2xl border border-brand-sandLine bg-white p-4 text-left shadow-sm transition-colors hover:border-brand-navy ${FOCUS_RING}`}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="flex items-center gap-1.5 text-[15px] font-extrabold text-brand-navy">
                <Icon name="school" className="text-[19px]" />
                {displayCode("class", group.classGroupId)}
              </span>
              {group.attentionCount > 0 && (
                <StatusChip tone="amber" icon="fact_check">
                  {group.attentionCount} cần điểm danh
                </StatusChip>
              )}
            </div>
            <p className="text-[13px] text-brand-muted">
              {group.sessions.length} buổi · {group.upcoming.length} sắp tới · {group.past.length} đã qua
            </p>
            <p className="mt-auto flex items-center gap-1.5 text-[13.5px] font-semibold text-brand-ink">
              <Icon name="event" className="text-[16px] text-brand-muted" />
              {group.nextSession
                ? `Buổi kế tiếp: ${formatLongDate(parseIsoDate(group.nextSession.date))}`
                : "Không còn buổi sắp tới"}
            </p>
          </button>
        </li>
      ))}
    </ul>
  );
}
