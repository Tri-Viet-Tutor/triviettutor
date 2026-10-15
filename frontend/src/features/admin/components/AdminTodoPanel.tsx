import { Link } from "react-router-dom";
import { Icon } from "@/components/ui/Icon";
import { AntMascot } from "@/features/portal/components/AntMascot";

export interface TodoTile {
  to: string;
  /** Tên biểu tượng Material Symbols */
  icon: string;
  label: string;
  /** Số việc; undefined khi chưa tải xong */
  count: number | undefined;
  /** Việc cần xử lý (tô cam khi còn việc) hay chỉ là số liệu để xem */
  actionable: boolean;
}

interface AdminTodoPanelProps {
  /** Tên gọi của quản trị viên, dùng trong lời nhắc của chú kiến */
  name: string;
  tiles: TodoTile[];
}

/** Bảng xanh "Việc cần xử lý" ở đầu trang Tổng quan của quản trị: mỗi ô là một việc, bấm để sang trang xử lý. */
export function AdminTodoPanel({ name, tiles }: AdminTodoPanelProps) {
  const loaded = tiles.every((tile) => tile.count !== undefined);
  const todo = tiles.filter((tile) => tile.actionable).reduce((sum, tile) => sum + (tile.count ?? 0), 0);
  const bubble = !loaded ? `Chờ một chút, ${name} nhé!` : todo > 0 ? `Có ${todo} việc đang chờ ${name} xử lý!` : `Mọi việc đã xong rồi, ${name} ơi!`;

  return (
    <section aria-labelledby="todo-panel-title" className="rounded-[22px] bg-gradient-to-br from-[#1456C8] to-[#2F7BEA] p-2 pt-0">
      <div className="flex items-center justify-between gap-3 px-4 py-2.5 sm:px-5">
        <div className="min-w-0">
          <h2 id="todo-panel-title" className="flex items-center gap-2 text-[17px] font-bold text-white">
            <Icon name="checklist" className="text-[20px] text-brand-orange" />
            Việc cần xử lý
          </h2>
          <p className="mt-0.5 text-[13px] font-medium text-white/80">{bubble}</p>
        </div>
        <AntMascot variant="pen" className="h-[60px] w-[58px] shrink-0 opacity-90" />
      </div>

      <ul className="grid grid-cols-1 gap-1.5 rounded-[16px] bg-white p-1.5 sm:grid-cols-3">
        {tiles.map((tile) => {
          const urgent = tile.actionable && (tile.count ?? 0) > 0;
          return (
            <li key={tile.label}>
              <Link
                to={tile.to}
                className={`flex h-full items-center gap-3 rounded-2xl border-2 p-3 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-navy sm:flex-col sm:items-start sm:gap-1.5 ${
                  urgent ? "border-brand-orange bg-amber-50/60 hover:bg-amber-50" : "border-slate-200 hover:border-[#2F7BEA]"
                }`}
              >
                <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${urgent ? "bg-brand-orange text-white" : "bg-brand-tint text-brand-navy"}`}>
                  <Icon name={tile.icon} className="text-[20px]" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[22px] font-bold leading-none tabular-nums text-brand-ink">{tile.count ?? "…"}</span>
                  <span className="mt-0.5 block text-[13px] font-medium text-brand-muted">{tile.label}</span>
                </span>
                <Icon name="chevron_right" className="text-[20px] text-slate-400 sm:hidden" />
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
