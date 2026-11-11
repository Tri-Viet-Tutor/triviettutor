import { Link } from "react-router-dom";
import { AntMascot } from "@/components/dashboard/AntMascot";
import { Icon } from "@/components/ui/Icon";
import { FOCUS_RING } from "@/constants/classNames";
import type { AdminTodoPanelProps } from "@/interfaces/admin";

// Bảng xanh "Việc cần xử lý" ở đầu trang Tổng quan của quản trị: mỗi ô là một việc, bấm để sang trang xử lý.
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
    <section aria-labelledby="todo-panel-title" className="relative rounded-2xl bg-gradient-to-br from-brand-navy to-[#1F63D8] p-1.5 pt-0">
      <div className="flex items-center justify-between gap-3 px-3.5 py-2.5 sm:px-4">
        <div className="min-w-0">
          <h2 id="todo-panel-title" className="flex items-center gap-2 text-[17px] font-bold text-white">
            <Icon name="checklist" className="text-[21px] text-brand-orange" />
            Việc cần xử lý
          </h2>
          <p className="mt-0.5 text-[13.5px] font-medium text-white/85">{bubble}</p>
        </div>
        <AntMascot variant="pen" className="-mb-2 h-[58px] w-[56px] shrink-0" />
      </div>

      <ul className="grid grid-cols-1 gap-1.5 rounded-xl bg-white p-1.5 sm:grid-cols-3">
        {tiles.map((tile) => {
          const urgent = tile.actionable && (tile.count ?? 0) > 0;
          return (
            <li key={tile.label}>
              <Link
                to={tile.to}
                className={`flex h-full items-center gap-3 rounded-xl border p-3 transition-colors ${FOCUS_RING} ${
                  urgent ? "border-brand-orange bg-amber-50/60 hover:bg-amber-50" : "border-brand-sandLine hover:border-[#2F7BEA]"
                }`}
              >
                <span
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${urgent ? "bg-brand-orange text-white" : "bg-brand-tint text-brand-navy"}`}
                >
                  <Icon name={tile.icon} className="text-[21px]" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[22px] font-bold leading-none tabular-nums text-brand-ink">{tile.count ?? "…"}</span>
                  <span className="mt-0.5 block text-[13px] font-medium text-brand-muted">{tile.label}</span>
                </span>
                <Icon name="chevron_right" className="text-[20px] text-slate-400" />
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
