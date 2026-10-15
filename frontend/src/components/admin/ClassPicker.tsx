import { type FormEvent, useState } from "react";
import { StatusChip } from "@/components/dashboard/StatusChip";
import { PORTAL_BTN_SECONDARY, PORTAL_CARD, PORTAL_INPUT } from "@/constants/classNames";
import type { ClassPickerProps } from "@/interfaces/admin";
import { formatDayMonth, parseIsoDate } from "@/utils/date";
import { dayLabel } from "@/utils/sessions";

/** Danh sách lớp đang có buổi học sắp tới để chọn phân công, kèm ô nhập mã cho lớp chưa có buổi nào. */
export function ClassPicker({ classes, selectedId, nameOf, onSelect }: ClassPickerProps) {
  // Mã lớp nhập tay (chỉ giữ chữ số)
  const [manualId, setManualId] = useState("");

  /** Mở lớp theo mã nhập tay */
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
                    <span className="max-w-[45%] truncate text-right text-[14px] font-medium text-brand-navy">
                      {nameOf(item.tutorId) ?? `Gia sư #${item.tutorId}`}
                    </span>
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
