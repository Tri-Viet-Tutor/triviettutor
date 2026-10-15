import { useQueries } from "@tanstack/react-query";
import { fetchAdminSessions } from "@/features/admin/api/adminApi";
import { addDays, startOfToday, toIsoDate, weekdayName } from "@/utils/date";
import { useUserCounts } from "./useAdminData";

export interface ChartPoint {
  day: string;
  /** Tổng số buổi học trong ngày (mọi trạng thái) */
  total: number | null;
  /** Số buổi đã hoàn thành trong ngày */
  completed: number | null;
}

const STALE_MS = 10 * 60 * 1000; // cache 10 phút

/** 7 ngày gần nhất tính từ hôm nay */
function buildWeekDates(): { iso: string; label: string }[] {
  const today = startOfToday();
  return Array.from({ length: 7 }, (_, i) => {
    const d = addDays(today, i - 6);
    return { iso: toIsoDate(d), label: weekdayName(d, true) };
  });
}

/**
 * Lấy số buổi học mỗi ngày trong 7 ngày qua từ backend.
 * Gọi 14 query song song (7 ngày × 2 loại: tổng + hoàn thành) — tất cả cached 10 phút.
 */
export function useWeeklyActivityChart() {
  const dates = buildWeekDates();
  const counts = useUserCounts();

  // 7 queries: tổng buổi học mỗi ngày (không lọc trạng thái)
  const totalQueries = useQueries({
    queries: dates.map(({ iso }) => ({
      queryKey: ["admin", "chart-total", iso] as const,
      queryFn: () => fetchAdminSessions({ from: iso, to: iso, page: 0, size: 1 }).then((r) => r.totalElements),
      staleTime: STALE_MS,
    })),
  });

  // 7 queries: buổi COMPLETED mỗi ngày
  const completedQueries = useQueries({
    queries: dates.map(({ iso }) => ({
      queryKey: ["admin", "chart-completed", iso] as const,
      queryFn: () =>
        fetchAdminSessions({ from: iso, to: iso, status: "COMPLETED", page: 0, size: 1 }).then((r) => r.totalElements),
      staleTime: STALE_MS,
    })),
  });

  const isLoading = totalQueries.some((q) => q.isPending) || completedQueries.some((q) => q.isPending);

  const data: ChartPoint[] = dates.map(({ label }, i) => ({
    day: label,
    total: totalQueries[i].data ?? null,
    completed: completedQueries[i].data ?? null,
  }));

  // Ngày đỉnh (nhiều buổi nhất)
  const peakPoint = data.reduce<ChartPoint | null>((best, d) => {
    if (d.total === null) return best;
    return !best || d.total > (best.total ?? 0) ? d : best;
  }, null);

  // Tổng 7 ngày
  const weekTotal = data.reduce((sum, d) => sum + (d.total ?? 0), 0);
  const weekCompleted = data.reduce((sum, d) => sum + (d.completed ?? 0), 0);

  return {
    data,
    isLoading,
    peakPoint,
    weekTotal,
    weekCompleted,
    totalStudents: counts.ROLE_STUDENT,
    totalTutors: counts.ROLE_TUTOR,
  };
}
