import { ROUTES } from "@/constants/routes";
import { SummaryCard, type SummaryRow } from "@/features/portal/components/SummaryCard";
import { completedHours } from "@/features/portal/data/sessions";
import { type RecentAttendanceItem } from "@/features/portal/hooks/usePortalData";
import type { AttendanceStatus, SessionResponse } from "@/types/api";

interface LearningSummaryProps {
  sessions: SessionResponse[];
  /** Số buổi chưa học (không tính buổi đã hủy) */
  upcomingCount: number;
  /** Điểm danh các buổi gần nhất (useRecentAttendance) */
  attendance: RecentAttendanceItem[];
  /** Tổng số đơn xin nghỉ đã gửi; undefined khi chưa tải xong */
  leaveTotal?: number;
}

/**
 * Thẻ "Hồ sơ học tập" ở cột phải trang Tổng quan của học viên: chuyên cần mấy buổi gần nhất và các con số
 * tổng kết, tất cả tính từ buổi học, điểm danh và đơn xin nghỉ của backend.
 */
export function LearningSummary({ sessions, upcomingCount, attendance, leaveTotal }: LearningSummaryProps) {
  const count = (status: AttendanceStatus) => attendance.filter((item) => item.record?.status === status).length;
  const recorded = attendance.filter((item) => item.record).length;
  const completed = sessions.filter((session) => session.status === "COMPLETED").length;
  const hours = completedHours(sessions);

  const columns = [
    { label: "Có mặt", value: count("PRESENT"), color: "text-brand-ink" },
    { label: "Đi trễ", value: count("LATE"), color: "text-[#1F63D8]" },
    { label: "Vắng", value: count("ABSENT"), color: "text-brand-ink" },
  ];
  const excused = count("EXCUSED");

  const rows: SummaryRow[] = [
    { icon: "timer", iconClassName: "text-[#1F63D8]", label: "Tổng thời lượng đã học", value: `${String(hours).replace(".", ",")} giờ`, valueClassName: "text-[#1F63D8]" },
    { icon: "menu_book", iconClassName: "text-emerald-600", label: "Số buổi đã học", value: String(completed), valueClassName: "text-emerald-600" },
    { icon: "event_upcoming", iconClassName: "text-brand-orange", label: "Số buổi sắp tới", value: String(upcomingCount), valueClassName: "text-brand-orangeHover" },
    { icon: "event_busy", iconClassName: "text-red-500", label: "Đơn xin nghỉ đã gửi", value: leaveTotal === undefined ? "…" : String(leaveTotal), valueClassName: "text-red-600" },
  ];

  return (
    <SummaryCard id="learning-summary-title" title="Hồ sơ học tập" linkLabel="Xem lịch học" linkTo={ROUTES.studentSchedule} rowsTitle="Tổng kết" rows={rows}>
      <h3 className="text-[16px] font-bold text-brand-ink">Chuyên cần</h3>
      <p className="mt-0.5 text-[13.5px] text-brand-muted">
        {recorded > 0 ? `${recorded} buổi được điểm danh gần nhất` : "Chưa có buổi nào được điểm danh"}
      </p>
      <dl className="mt-4 grid grid-cols-3 gap-2 border-b border-slate-200 pb-5">
        {columns.map((column) => (
          <div key={column.label}>
            <dt className="text-[14px] text-brand-muted">{column.label}</dt>
            <dd className={`mt-1 text-[24px] font-bold leading-none tabular-nums ${column.color}`}>{column.value}</dd>
          </div>
        ))}
      </dl>
      {excused > 0 && <p className="mt-3 text-[13.5px] text-brand-muted">Ngoài ra có {excused} buổi nghỉ có phép.</p>}
    </SummaryCard>
  );
}
