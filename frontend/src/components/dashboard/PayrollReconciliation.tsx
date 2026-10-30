import type { TeachingPeriodSummary, TeachingSessionResponse } from "@/interfaces/api";
import { formatDate, parseIsoDate } from "@/utils/date";

/** Các nhóm buổi trong bảng đối soát, theo thứ tự hiển thị */
const GROUPS: {
  key: keyof Pick<TeachingPeriodSummary, "completed" | "unfinalized" | "cancelled" | "substitutedOut">;
  label: string;
  tone: string;
}[] = [
  { key: "completed", label: "Buổi hợp lệ (được tính thù lao)", tone: "text-emerald-700" },
  { key: "unfinalized", label: "Buổi chưa chốt", tone: "text-red-600" },
  { key: "cancelled", label: "Buổi bị hủy", tone: "text-brand-muted" },
  { key: "substitutedOut", label: "Buổi được dạy thay (gia sư khác dạy)", tone: "text-brand-muted" },
];

function sessionLine(session: TeachingSessionResponse): string {
  const time = `${session.startTime.slice(0, 5)} – ${session.endTime.slice(0, 5)}`;
  const makeup = session.originalSessionId !== null ? ` · học bù cho #${session.originalSessionId}` : "";
  return `${formatDate(parseIsoDate(session.date))}, ${time} · Lớp #${session.classGroupId} · Buổi #${session.sessionId}${makeup}`;
}

/** Danh sách các buổi dạy của một dòng lương, chia theo nhóm hợp lệ / chưa chốt / hủy / được dạy thay */
export function PayrollReconciliation({ summary }: { summary: TeachingPeriodSummary | null | undefined }) {
  if (!summary) {
    return <p className="text-[13.5px] text-brand-muted">Chưa có dữ liệu đối soát cho tháng này.</p>;
  }
  const groups = GROUPS.filter((group) => summary[group.key].length > 0);
  if (groups.length === 0) {
    return <p className="text-[13.5px] text-brand-muted">Không có buổi dạy nào trong tháng.</p>;
  }
  return (
    <div className="space-y-3">
      {groups.map((group) => (
        <section key={group.key}>
          <h4 className={`mb-1 text-[13.5px] font-bold ${group.tone}`}>
            {group.label}: {summary[group.key].length}
          </h4>
          <ul className="space-y-0.5 text-[13.5px] text-brand-ink">
            {summary[group.key].map((session) => (
              <li key={session.sessionId} className="tabular-nums">
                {sessionLine(session)}
                {session.cancellationReason && <span className="text-brand-muted"> · Lý do: {session.cancellationReason}</span>}
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
