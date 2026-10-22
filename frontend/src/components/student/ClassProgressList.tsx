import { AntMascot } from "@/components/dashboard/AntMascot";
import { PORTAL_CARD } from "@/constants/classNames";
import { classProgress } from "@/utils/sessions";
import type { ClassProgressListProps } from "@/interfaces/portal";

/** Vòng tròn tiến độ: bán kính và chu vi (đơn vị của viewBox) */
const RING_RADIUS = 52;

const RING_LENGTH = 2 * Math.PI * RING_RADIUS;

/**
 * Thẻ "Tiến độ": vòng tròn phần trăm số buổi đã học trên tổng số buổi của mọi lớp,
 * và một thanh cho từng lớp (không tính buổi đã hủy).
 */
export function ClassProgressList({ sessions }: ClassProgressListProps) {
  const classes = classProgress(sessions);
  if (classes.length === 0) return null;

  // Gộp tất cả các lớp để tính phần trăm chung
  const completed = classes.reduce((sum, item) => sum + item.completed, 0);
  const total = classes.reduce((sum, item) => sum + item.total, 0);
  const percent = Math.round((completed / total) * 100);

  return (
    <section
      className={`flex flex-col gap-5 p-4 sm:flex-row sm:items-center sm:gap-6 sm:p-5 ${PORTAL_CARD}`}
      aria-labelledby="class-progress-title"
    >
      <div className="relative mx-auto w-[168px] shrink-0 sm:mx-0">
        <svg viewBox="0 0 128 128" className="block h-auto w-full -rotate-90" role="img" aria-label={`Đã học ${percent}% số buổi`}>
          <circle cx="64" cy="64" r={RING_RADIUS} fill="none" stroke="#E6EEFB" strokeWidth="12" />
          <circle
            cx="64"
            cy="64"
            r={RING_RADIUS}
            fill="none"
            stroke="#1F63D8"
            strokeWidth="12"
            strokeLinecap="round"
            strokeDasharray={`${(RING_LENGTH * percent) / 100} ${RING_LENGTH}`}
          />
        </svg>
        <p aria-hidden="true" className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-[30px] font-bold leading-none tabular-nums text-brand-navy">{percent}%</span>
          <span className="mt-1 text-[12.5px] text-brand-muted">đã học</span>
        </p>
        <AntMascot variant="book" className="absolute -bottom-4 -right-7 h-[88px] w-[85px]" />
      </div>

      <div className="min-w-0 flex-1">
        <h2 id="class-progress-title" className="text-[17px] font-bold text-brand-ink">
          Tiến độ
        </h2>
        <p className="mt-0.5 text-[14.5px] text-brand-muted">
          Đã học <strong className="font-bold text-brand-navy">{completed}</strong> / {total} buổi của {classes.length} lớp
        </p>
        <ul className="mt-3 space-y-3">
          {classes.map((item) => (
            <li key={item.classGroupId}>
              <div className="flex items-baseline justify-between gap-3 text-[15px]">
                <span className="font-semibold text-brand-ink">Lớp #{item.classGroupId}</span>
                <span className="tabular-nums text-brand-muted">
                  {item.completed} / {item.total} buổi
                </span>
              </div>
              <div
                role="progressbar"
                aria-label={`Lớp #${item.classGroupId}: đã học ${item.completed} trên ${item.total} buổi`}
                aria-valuemin={0}
                aria-valuemax={item.total}
                aria-valuenow={item.completed}
                className="mt-1.5 h-2.5 overflow-hidden rounded-full bg-[#E6EEFB]"
              >
                <div className="h-full rounded-full bg-emerald-500" style={{ width: `${(item.completed / item.total) * 100}%` }} />
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
