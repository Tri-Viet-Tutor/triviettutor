import { SummaryCard } from "@/components/dashboard/SummaryCard";
import { ROUTES } from "@/constants/routes";
import type { AttendanceStatus } from "@/interfaces/dto";
import type { LearningSummaryProps } from "@/interfaces/portal";
import type { SummaryRow } from "@/interfaces/ui";
import { completedHours, formatHours } from "@/utils/sessions";

// Thẻ "Hồ sơ học tập" ở cột phải trang Tổng quan của học viên: chuyên cần mấy buổi gần nhất và các con số
// tổng kết, tất cả tính từ buổi học, điểm danh và đơn xin nghỉ của backend.
export function LearningSummary({ sessions, upcomingCount, attendance, leaveTotal }: LearningSummaryProps) {
  // Số buổi gần nhất có trạng thái điểm danh `status`
  const count = (status: AttendanceStatus) => attendance.filter((item) => item.record?.status === status).length;
  const recorded = attendance.filter((item) => item.record).length;
  const completed = sessions.filter((session) => session.status === "COMPLETED").length;
  const hours = completedHours(sessions);

  // Chuyên cần: có mặt / vắng mặt; buổi có phép (bản ghi cũ) ghi riêng một dòng bên dưới
  const columns = [
    { label: "Có mặt", value: count("PRESENT"), color: "text-brand-ink" },
    { label: "Vắng mặt", value: count("ABSENT"), color: "text-red-600" },
  ];
  const excused = count("EXCUSED");

  // Các dòng tổng kết
  const rows: SummaryRow[] = [
    {
      icon: "timer",
      iconClassName: "text-[#1F63D8]",
      label: "Tổng thời lượng đã học",
      value: formatHours(hours),
      valueClassName: "text-[#1F63D8]",
    },
    {
      icon: "menu_book",
      iconClassName: "text-emerald-600",
      label: "Số buổi đã học",
      value: String(completed),
      valueClassName: "text-emerald-600",
    },
    {
      icon: "event_upcoming",
      iconClassName: "text-brand-orange",
      label: "Số buổi sắp tới",
      value: String(upcomingCount),
      valueClassName: "text-brand-orangeHover",
    },
    {
      icon: "event_busy",
      iconClassName: "text-red-500",
      label: "Đơn xin nghỉ đã gửi",
      value: leaveTotal === undefined ? "…" : String(leaveTotal),
      valueClassName: "text-red-600",
    },
  ];

  return (
    <SummaryCard
      id="learning-summary-title"
      title="Hồ sơ học tập"
      linkLabel="Xem lịch học"
      linkTo={ROUTES.studentSchedule}
      rowsTitle="Tổng kết"
      rows={rows}
    >
      <h3 className="text-[16px] font-bold text-brand-ink">Chuyên cần</h3>
      <p className="mt-0.5 text-[13.5px] text-brand-muted">
        {recorded > 0 ? `${recorded} buổi được điểm danh gần nhất` : "Chưa có buổi nào được điểm danh."}
      </p>
      <dl className="mt-3 grid grid-cols-2 gap-2 border-b border-brand-sandLine pb-4">
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
