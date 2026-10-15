import { Link } from "react-router-dom";
import { AntMascot } from "@/components/dashboard/AntMascot";
import { Icon } from "@/components/ui/Icon";
import { FOCUS_RING } from "@/constants/classNames";
import type { AdminTodoPanelProps } from "@/interfaces/admin";

/** Bảng xanh "Việc cần xử lý" ở đầu trang Tổng quan của quản trị: mỗi ô là một việc, bấm để sang trang xử lý. */
export function AdminTodoPanel({ name, tiles }: AdminTodoPanelProps) {
  // Tổng số việc cần xử lý quyết định câu nói của chú kiến
  const loaded = tiles.every((tile) => tile.count !== undefined);
  const todo = tiles.filter((tile) => tile.actionable).reduce((sum, tile) => sum + (tile.count ?? 0), 0);
  const bubble = !loaded
    ? `Chờ một chút, ${name} nhé!`
    : todo > 0
      ? `Có ${todo} việc đang chờ ${name} xử lý!`
      : `Mọi việc đã xong rồi, ${name} ơi!`;

  return (
    <section
      aria-labelledby="todo-panel-title"
      className="relative rounded-[26px] bg-gradient-to-br from-[#1456C8] to-[#2F7BEA] p-2 pt-0 md:mt-12"
    >
      {/* Chú kiến và bong bóng lời nói nhô lên trên mép bảng (màn hình rộng) */}
      <div aria-hidden="true" className="pointer-events-none absolute -top-14 right-5 hidden items-end gap-1 md:flex">
        <p className="relative mb-7 max-w-[340px] rounded-2xl rounded-br-md bg-brand-navyDeep px-4 py-3 text-[15px] font-semibold leading-snug text-white shadow-[0_14px_28px_-16px_rgba(8,42,102,0.9)]">
          {bubble}
        </p>
        <AntMascot variant="pen" className="h-[124px] w-[119px] drop-shadow-[0_10px_10px_rgba(8,42,102,0.35)]" />
      </div>

      <div className="flex items-center justify-between gap-3 px-4 py-4 sm:px-5">
        <div className="min-w-0">
          <h2 id="todo-panel-title" className="flex items-center gap-2 text-[20px] font-bold text-white">
            <Icon name="checklist" className="text-[24px] text-brand-orange" />
            Việc cần xử lý
          </h2>
          {/* Điện thoại: lời nhắc nằm ngay dưới tiêu đề */}
          <p className="mt-1 text-[14px] font-medium text-white/90 md:hidden">{bubble}</p>
        </div>
        <AntMascot variant="pen" className="h-[76px] w-[73px] shrink-0 md:hidden" />
      </div>

      <ul className="grid grid-cols-1 gap-2 rounded-[20px] bg-white p-2 sm:grid-cols-3">
        {tiles.map((tile) => {
          const urgent = tile.actionable && (tile.count ?? 0) > 0;
          return (
            <li key={tile.label}>
              <Link
                to={tile.to}
                className={`flex h-full items-center gap-3 rounded-2xl border-2 p-4 transition-colors sm:flex-col sm:items-start sm:gap-2 ${FOCUS_RING} ${
                  urgent ? "border-brand-orange bg-amber-50/60 hover:bg-amber-50" : "border-slate-200 hover:border-[#2F7BEA]"
                }`}
              >
                <span
                  className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${urgent ? "bg-brand-orange text-white" : "bg-brand-tint text-brand-navy"}`}
                >
                  <Icon name={tile.icon} className="text-[24px]" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[26px] font-bold leading-none tabular-nums text-brand-ink">{tile.count ?? "…"}</span>
                  <span className="mt-1 block text-[14.5px] font-medium text-brand-muted">{tile.label}</span>
                </span>
                <Icon name="chevron_right" className="text-[22px] text-slate-400 sm:hidden" />
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
