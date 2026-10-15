import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceDot,
} from "recharts";
import { useWeeklyActivityChart } from "@/features/admin/hooks/useWeeklyActivityChart";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-brand-line bg-white px-4 py-3 shadow-soft text-[13px]">
      <p className="mb-1.5 font-semibold text-brand-ink">{label}</p>
      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
      {payload.map((p: any) => (
        <p key={p.dataKey} className="flex items-center gap-2">
          <span className="inline-block h-2 w-2 rounded-full" style={{ background: p.color }} />
          <span className="text-brand-muted">{p.name}:</span>
          <span className="font-semibold tabular-nums text-brand-ink">{p.value ?? "—"}</span>
        </p>
      ))}
    </div>
  );
}

const LINES = [
  { key: "total", color: "#2563EB", label: "Tổng buổi học", dashed: false, width: 2.5 },
  { key: "completed", color: "#0B3A8C", label: "Đã hoàn thành", dashed: true, width: 2 },
];

/** Biểu đồ hoạt động hệ thống 7 ngày — dữ liệu thực từ /admin/sessions */
export function SystemActivityChart() {
  const { data, isLoading, peakPoint, weekTotal, weekCompleted, totalStudents, totalTutors } =
    useWeeklyActivityChart();

  const peak = peakPoint;

  return (
    <section className="rounded-2xl border border-brand-line bg-white p-5 shadow-soft">
      <p className="text-[11px] font-semibold uppercase tracking-widest text-brand-muted">
        Hoạt động hệ thống
      </p>
      <h2 className="mt-0.5 text-[20px] font-bold text-brand-ink">7 ngày qua</h2>
      <p className="mt-0.5 text-[13px] text-brand-muted">
        Dữ liệu thực từ hệ thống: số buổi học mỗi ngày trong 7 ngày gần nhất
      </p>

      {/* Legend */}
      <div className="mt-3 flex flex-wrap items-center gap-4">
        {LINES.map(({ key, color, label, dashed }) => (
          <span key={key} className="flex items-center gap-1.5 text-[13px] font-medium">
            <svg width="24" height="4" viewBox="0 0 24 4" aria-hidden="true">
              {dashed ? (
                <line x1="0" y1="2" x2="24" y2="2" stroke={color} strokeWidth="2.5" strokeDasharray="5 3" />
              ) : (
                <line x1="0" y1="2" x2="24" y2="2" stroke={color} strokeWidth="2.5" />
              )}
            </svg>
            <span style={{ color }}>{label}</span>
          </span>
        ))}
      </div>

      {/* Nhãn đỉnh điểm */}
      {peak && !isLoading ? (
        <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-[#2563EB]/20 bg-[#EFF6FF] px-3 py-1 text-[13px] font-semibold text-[#1D4ED8]">
          Đỉnh điểm {peak.day}: {peak.total?.toLocaleString("vi-VN")} buổi học •{" "}
          {peak.completed?.toLocaleString("vi-VN")} hoàn thành
        </div>
      ) : (
        <div className="mt-3 h-7 w-64 animate-pulse rounded-full bg-brand-tint" />
      )}

      {/* Biểu đồ */}
      <div className="mt-4 h-[220px]">
        {isLoading ? (
          <div className="flex h-full items-center justify-center text-[13px] text-brand-muted">
            Đang tải dữ liệu…
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -16 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F4" vertical={false} />
              <XAxis dataKey="day" tick={{ fontSize: 12, fill: "#52607A" }} axisLine={false} tickLine={false} />
              <YAxis
                allowDecimals={false}
                tick={{ fontSize: 12, fill: "#52607A" }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v: number) => (v >= 1000 ? `${(v / 1000).toFixed(1)}k` : String(v))}
              />
              <Tooltip content={<CustomTooltip />} />

              {LINES.map(({ key, color, dashed, width, label }) => (
                <Line
                  key={key}
                  type="monotone"
                  dataKey={key}
                  name={label}
                  stroke={color}
                  strokeWidth={width}
                  strokeDasharray={dashed ? "5 3" : undefined}
                  dot={false}
                  activeDot={{ r: 5, strokeWidth: 0 }}
                  connectNulls={false}
                />
              ))}

              {peak && (
                <ReferenceDot x={peak.day} y={peak.total ?? 0} r={5} fill="#2563EB" stroke="#fff" strokeWidth={2} />
              )}
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Chỉ số tóm tắt — dữ liệu thực */}
      <div className="mt-4 grid grid-cols-2 gap-3 border-t border-brand-line pt-4 sm:grid-cols-4">
        <div>
          <p className="text-[20px] font-bold tabular-nums text-brand-ink">
            {isLoading ? "…" : weekTotal.toLocaleString("vi-VN")}
          </p>
          <p className="mt-0.5 text-[12px] text-brand-muted">Buổi học 7 ngày</p>
        </div>
        <div>
          <p className="text-[20px] font-bold tabular-nums text-[#0B3A8C]">
            {isLoading ? "…" : weekCompleted.toLocaleString("vi-VN")}
          </p>
          <p className="mt-0.5 text-[12px] text-brand-muted">Hoàn thành</p>
        </div>
        <div>
          <p className="text-[20px] font-bold tabular-nums text-[#2563EB]">
            {totalStudents === undefined ? "…" : totalStudents.toLocaleString("vi-VN")}
          </p>
          <p className="mt-0.5 text-[12px] text-brand-muted">Tổng học viên</p>
        </div>
        <div>
          <p className="text-[20px] font-bold tabular-nums text-emerald-600">
            {totalTutors === undefined ? "…" : totalTutors.toLocaleString("vi-VN")}
          </p>
          <p className="mt-0.5 text-[12px] text-brand-muted">Tổng gia sư</p>
        </div>
      </div>
    </section>
  );
}
