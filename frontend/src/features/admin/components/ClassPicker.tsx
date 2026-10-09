import { useState, type FormEvent } from "react";
import { StatusChip } from "@/features/portal/components/StatusChip";
import { dayLabel } from "@/features/portal/data/sessions";
import { PORTAL_BTN_SECONDARY, PORTAL_CARD, PORTAL_INPUT } from "@/features/portal/data/ui";
import type { SessionResponse } from "@/types/api";
import { formatDayMonth, parseIsoDate } from "@/utils/date";

/** Một lớp, suy ra từ các buổi học sắp tới (backend chưa có API liệt kê lớp) */
export interface ClassSummary {
  classId: number;
  /** Gia sư chính đang được xếp ở buổi kế tiếp; null là chưa có */
  tutorId: number | null;
  /** Buổi kế tiếp và số buổi sắp tới của lớp */
  nextSession: SessionResponse;
  upcomingCount: number;
}

/** Gom các buổi (đã xếp theo ngày) thành danh sách lớp; lớp chưa có gia sư đứng trước */
export function summarizeClasses(sessions: SessionResponse[]): ClassSummary[] {
  const byClass = new Map<number, ClassSummary>();
  for (const session of sessions) {
    if (session.status === "CANCELLED") continue;
    const known = byClass.get(session.classGroupId);
    if (known) known.upcomingCount += 1;
    else byClass.set(session.classGroupId, { classId: session.classGroupId, tutorId: session.scheduledTutorId, nextSession: session, upcomingCount: 1 });
  }
  return [...byClass.values()].sort((a, b) => Number(a.tutorId !== null) - Number(b.tutorId !== null) || a.classId - b.classId);
}

interface ClassPickerProps {
  classes: ClassSummary[];
  selectedId: number | null;
  /** Tên gia sư theo mã (không biết tên thì trả undefined) */
  nameOf: (userId: number) => string | undefined;
  onSelect: (classId: number) => void;
}

/** Danh sách lớp đang có buổi học sắp tới để chọn phân công, kèm ô nhập mã cho lớp chưa có buổi nào. */
export function ClassPicker({ classes, selectedId, nameOf, onSelect }: ClassPickerProps) {
  const [manualId, setManualId] = useState("");

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const classId = Number(manualId);
    if (classId > 0) {
      onSelect(classId);
      setManualId("");
    }
  }

  return (
    <div className={`overflow-hidden ${PORTAL_CARD}`}>
      {classes.length === 0 ? (
        <p className="px-4 py-4 text-[14.5px] text-brand-muted sm:px-5">Chưa có lớp nào có buổi học sắp tới.</p>
      ) : (
        <ul className="max-h-[440px] divide-y divide-slate-200 overflow-y-auto">
          {classes.map((item) => {
            const selected = item.classId === selectedId;
            const date = parseIsoDate(item.nextSession.date);
            return (
              <li key={item.classId}>
                <button
                  type="button"
                  aria-pressed={selected}
                  onClick={() => onSelect(item.classId)}
                  className={`flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand-navy sm:px-5 ${
                    selected ? "bg-brand-tint" : "hover:bg-slate-50"
                  }`}
                >
                  <span className="min-w-0">
                    <span className="block text-[15.5px] font-semibold text-brand-ink">Lớp #{item.classId}</span>
                    <span className="block truncate text-[13.5px] text-brand-muted">
                      {item.upcomingCount} buổi sắp tới, gần nhất {dayLabel(date).toLowerCase()} {formatDayMonth(date)}
                    </span>
                  </span>
                  {item.tutorId === null ? (
                    <StatusChip tone="amber">Chưa có gia sư</StatusChip>
                  ) : (
                    <span className="max-w-[45%] truncate text-right text-[14px] font-medium text-brand-navy">{nameOf(item.tutorId) ?? `Gia sư #${item.tutorId}`}</span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      )}

      <form onSubmit={handleSubmit} className="flex items-end gap-2 border-t border-slate-200 bg-slate-50/70 px-4 py-3.5 sm:px-5">
        <div className="min-w-0 flex-1">
          <label htmlFor="class-id" className="mb-1.5 block text-[13.5px] font-medium text-brand-ink">
            Lớp khác (nhập mã lớp)
          </label>
          <input
            id="class-id"
            type="text"
            inputMode="numeric"
            placeholder="Ví dụ: 12"
            value={manualId}
            onChange={(event) => setManualId(event.target.value.replace(/\D/g, ""))}
            className={PORTAL_INPUT}
          />
        </div>
        <button type="submit" disabled={!manualId} className={PORTAL_BTN_SECONDARY}>
          Mở lớp
        </button>
      </form>
    </div>
  );
}
