import { useState } from "react";
import type { LeaveRequestResponse, SessionResponse } from "@/types/api";
import { parseIsoDate, formatDate } from "@/utils/date";

interface ActivityItem {
  id: string;
  icon: string;
  iconBg: string;
  title: string;
  timeLabel: string;
  description: string;
}

function relativeTime(isoDateTime: string): string {
  const diff = Date.now() - new Date(isoDateTime).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "vừa xong";
  if (mins < 60) return `${mins} phút trước`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} giờ trước`;
  return `${Math.floor(hours / 24)} ngày trước`;
}

const ROLE_LABEL: Record<string, string> = {
  ROLE_STUDENT: "Học viên",
  ROLE_TUTOR: "Gia sư",
};

interface RecentActivityFeedProps {
  leaves: LeaveRequestResponse[];
  sessions: SessionResponse[];
  /** Tra họ tên theo userId (từ useUserDirectory) */
  nameOf: (userId: number) => string | undefined;
  onRefresh?: () => void;
}

/** Feed hoạt động gần đây — dữ liệu thực từ đơn xin nghỉ + buổi học */
export function RecentActivityFeed({ leaves, sessions, nameOf, onRefresh }: RecentActivityFeedProps) {
  const [refreshing, setRefreshing] = useState(false);

  function handleRefresh() {
    setRefreshing(true);
    onRefresh?.();
    setTimeout(() => setRefreshing(false), 700);
  }

  // Ghép đơn xin nghỉ → activity items
  const leaveItems: ActivityItem[] = leaves.map((l) => {
    const name = nameOf(l.requesterId) ?? `#${l.requesterId}`;
    const roleLabel = ROLE_LABEL[l.requesterRole] ?? l.requesterRole;
    return {
      id: `leave-${l.leaveRequestId}`,
      icon: "⚠️",
      iconBg: "bg-amber-100",
      title: "Đơn xin nghỉ chờ duyệt",
      timeLabel: relativeTime(l.requestedAt),
      description: `${roleLabel} ${name} — buổi học #${l.sessionId}`,
    };
  });

  // Ghép buổi học sắp diễn ra → activity items
  const sessionItems: ActivityItem[] = sessions.map((s) => {
    const dateLabel = formatDate(parseIsoDate(s.date));
    const statusLabels: Record<string, string> = {
      SCHEDULED: "Đã xếp lịch",
      IN_SESSION: "Đang diễn ra",
      COMPLETED: "Hoàn thành",
      PENDING_RESCHEDULE: "Chờ xếp lại",
      CANCELLED: "Đã hủy",
    };
    const icon =
      s.status === "COMPLETED" ? "✅"
      : s.status === "PENDING_RESCHEDULE" ? "🔄"
      : s.status === "CANCELLED" ? "❌"
      : "📚";
    const bg =
      s.status === "COMPLETED" ? "bg-emerald-100"
      : s.status === "PENDING_RESCHEDULE" ? "bg-blue-100"
      : s.status === "CANCELLED" ? "bg-red-100"
      : "bg-indigo-100";
    return {
      id: `session-${s.sessionId}`,
      icon,
      iconBg: bg,
      title: `Buổi học #${s.sessionId} (lớp #${s.classGroupId})`,
      timeLabel: dateLabel,
      description: `${s.startTime.slice(0, 5)} – ${s.endTime.slice(0, 5)} | ${statusLabels[s.status] ?? s.status}`,
    };
  });

  // Gộp: đơn xin nghỉ lên đầu (cần xử lý sớm hơn), sau đó buổi học; tối đa 6 mục
  const items = [...leaveItems, ...sessionItems].slice(0, 6);

  const isEmpty = items.length === 0;

  return (
    <section className="rounded-2xl border border-brand-line bg-white shadow-soft">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-brand-line px-5 py-4">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2.5 w-2.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
          </span>
          <h2 className="text-[17px] font-bold text-brand-ink">Hoạt động gần đây</h2>
        </div>
        <button
          type="button"
          onClick={handleRefresh}
          className={`text-[13px] font-semibold text-[#2563EB] transition-opacity hover:opacity-70 ${
            refreshing ? "pointer-events-none opacity-50" : ""
          }`}
        >
          {refreshing ? "Đang tải…" : "Làm mới"}
        </button>
      </div>

      {/* Danh sách */}
      {isEmpty ? (
        <p className="px-5 py-8 text-center text-[14px] text-brand-muted">Chưa có hoạt động nào.</p>
      ) : (
        <ul className="divide-y divide-brand-line px-5">
          {items.map((item) => (
            <li key={item.id} className="flex items-start gap-3 py-3.5">
              <span
                className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[17px] ${item.iconBg}`}
              >
                {item.icon}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-[14px] font-semibold leading-snug text-brand-ink">{item.title}</p>
                  <span className="shrink-0 text-[12px] tabular-nums text-brand-muted">{item.timeLabel}</span>
                </div>
                <p className="mt-0.5 line-clamp-1 text-[13px] text-brand-muted">{item.description}</p>
              </div>
            </li>
          ))}
        </ul>
      )}

    </section>
  );
}
