import { useState } from "react";
import { Link } from "react-router-dom";
import { Icon } from "@/components/ui/Icon";
import { PORTAL_CARD, PORTAL_MORE_LINK } from "@/constants/classNames";
import { CLASS_STATUS, CLASS_STATUS_ORDER, ROLE_NAME } from "@/constants/labels";
import { ROUTES } from "@/constants/routes";
import { useAdminSessions, useUserCounts } from "@/hooks/useAdminData";
import { useAdminClasses } from "@/hooks/useManagementData";
import { addDays, startOfToday, toIsoDate, weekdayName } from "@/utils/date";
import type { ReactNode } from "react";
import type { ClassStatus, Role } from "@/interfaces/api";

/*
 * Sơ đồ tổng quan của khu quản trị — vẽ bằng HTML/CSS (dự án không dùng thư viện biểu đồ).
 * Một chuỗi dữ liệu dùng một màu (navy); biểu đồ nhiều nhóm dùng bảng màu đã kiểm tra mù màu,
 * luôn kèm chú thích + con số nên không chỉ dựa vào màu.
 */

/** Màu nhóm cho người dùng theo vai trò (đã chạy kiểm tra tương phản / mù màu) */
const ROLE_COLOR: Record<Role, string> = {
  ROLE_STUDENT: "#2F6FD8",
  ROLE_TUTOR: "#D98300",
  ROLE_ADMIN: "#0E9F6E",
};

/** Khung một biểu đồ: tiêu đề, liên kết xem thêm, nội dung */
function ChartCard({
  title,
  subtitle,
  linkTo,
  linkLabel,
  children,
}: {
  title: string;
  subtitle?: string;
  linkTo?: string;
  linkLabel?: string;
  children: ReactNode;
}) {
  return (
    <section className={`p-4 ${PORTAL_CARD}`}>
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-[16px] font-bold text-brand-navy">{title}</h2>
          {subtitle && <p className="text-[13px] text-brand-muted">{subtitle}</p>}
        </div>
        {linkTo && linkLabel && (
          <Link to={linkTo} className={`inline-flex shrink-0 items-center gap-0.5 text-[13.5px] ${PORTAL_MORE_LINK}`}>
            {linkLabel}
            <Icon name="chevron_right" className="text-[17px]" />
          </Link>
        )}
      </div>
      {children}
    </section>
  );
}

/** Buổi học 7 ngày tới — cột dọc, hôm nay tô đậm, rê chuột xem số */
function SessionsWeekChart() {
  const today = startOfToday();
  const days = Array.from({ length: 7 }, (_, index) => addDays(today, index));
  const sessions = useAdminSessions({ from: toIsoDate(days[0]), to: toIsoDate(days[6]), page: 0, size: 100 });
  const [hover, setHover] = useState<number | null>(null);

  const counts = days.map(
    (day) => (sessions.data?.content ?? []).filter((session) => session.date === toIsoDate(day) && session.status !== "CANCELLED").length,
  );
  const max = Math.max(4, ...counts);
  const total = counts.reduce((sum, count) => sum + count, 0);

  return (
    <ChartCard
      title="Buổi học 7 ngày tới"
      subtitle={sessions.data ? `${total} buổi (không tính buổi đã hủy)` : "Đang tải…"}
      linkTo={ROUTES.adminSessions}
      linkLabel="Lịch"
    >
      <div className="relative">
        {/* Lưới ngang mờ */}
        <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-[140px]">
          {[0, 0.5, 1].map((ratio) => (
            <div
              key={ratio}
              className="absolute inset-x-0 border-t border-dashed border-brand-sandLine"
              style={{ top: `${ratio * 100}%` }}
            />
          ))}
        </div>
        <ul className="relative grid h-[140px] grid-cols-7 items-end gap-2" aria-label="Số buổi học theo ngày">
          {days.map((day, index) => {
            const isToday = index === 0;
            return (
              <li
                key={index}
                className="relative flex h-full flex-col items-center justify-end"
                onMouseEnter={() => setHover(index)}
                onMouseLeave={() => setHover(null)}
                aria-label={`${weekdayName(day)} ${day.getDate()}/${day.getMonth() + 1}: ${counts[index]} buổi`}
              >
                {hover === index && (
                  <span className="absolute -top-1 z-10 -translate-y-full whitespace-nowrap rounded-md bg-brand-ink px-2 py-1 text-[12px] font-semibold text-white shadow">
                    {counts[index]} buổi
                  </span>
                )}
                {counts[index] > 0 && <span className="mb-1 text-[12px] font-semibold tabular-nums text-brand-muted">{counts[index]}</span>}
                <span
                  className={`w-full max-w-[34px] rounded-t transition-[height] ${isToday ? "bg-brand-orange" : "bg-brand-navy"} ${hover === index ? "opacity-80" : ""}`}
                  style={{ height: `${(counts[index] / max) * 100}%`, minHeight: counts[index] ? 4 : 0 }}
                />
              </li>
            );
          })}
        </ul>
        <div className="mt-1.5 grid grid-cols-7 gap-2 border-t border-brand-sandLine pt-1.5 text-center">
          {days.map((day, index) => (
            <span key={index} className={`text-[12px] leading-tight ${index === 0 ? "font-bold text-brand-ink" : "text-brand-muted"}`}>
              {index === 0 ? "Hôm nay" : weekdayName(day, true)}
              <span className="block tabular-nums">
                {day.getDate()}/{day.getMonth() + 1}
              </span>
            </span>
          ))}
        </div>
      </div>
    </ChartCard>
  );
}

/** Lớp học theo trạng thái — thanh ngang, một màu, kèm số */
function ClassStatusChart() {
  const classes = useAdminClasses({ page: 0, size: 100 });
  const items = classes.data?.content ?? [];
  const byStatus = CLASS_STATUS_ORDER.map((status) => ({ status, count: items.filter((item) => item.status === status).length })).filter(
    (row) => row.count > 0,
  );
  const max = Math.max(1, ...byStatus.map((row) => row.count));

  return (
    <ChartCard
      title="Lớp học theo trạng thái"
      subtitle={classes.data ? `${classes.data.totalElements} lớp` : "Đang tải…"}
      linkTo={ROUTES.adminClasses}
      linkLabel="Lớp học"
    >
      {classes.isError ? (
        <p className="text-[14px] text-red-700">Không tải được danh sách lớp.</p>
      ) : byStatus.length === 0 ? (
        <p className="text-[14px] text-brand-muted">{classes.isPending ? "Đang tải…" : "Chưa có lớp nào."}</p>
      ) : (
        <ul className="space-y-2">
          {byStatus.map(({ status, count }) => (
            <li
              key={status}
              className="grid grid-cols-[140px_1fr_28px] items-center gap-2 text-[13px]"
              title={`${CLASS_STATUS[status as ClassStatus].label}: ${count} lớp`}
            >
              <span className="flex items-center gap-1.5 truncate text-brand-ink">
                <Icon name={CLASS_STATUS[status].icon} className="text-[16px] text-brand-muted" />
                {CLASS_STATUS[status].label}
              </span>
              <span className="h-3 overflow-hidden rounded-r bg-brand-sand">
                <span className="block h-full rounded-r bg-brand-navy" style={{ width: `${(count / max) * 100}%` }} />
              </span>
              <span className="text-right font-semibold tabular-nums text-brand-ink">{count}</span>
            </li>
          ))}
        </ul>
      )}
    </ChartCard>
  );
}

/** Người dùng theo vai trò — thanh chồng 100% + chú thích có số */
function UserMixChart() {
  const counts = useUserCounts();
  const roles: Role[] = ["ROLE_STUDENT", "ROLE_TUTOR", "ROLE_ADMIN"];
  const loaded = roles.every((role) => counts[role] !== undefined);
  const total = roles.reduce((sum, role) => sum + (counts[role] ?? 0), 0);

  return (
    <ChartCard title="Người dùng" subtitle={loaded ? `${total} tài khoản` : "Đang tải…"} linkTo={ROUTES.adminUsers} linkLabel="Danh sách">
      <div className="flex h-4 gap-[2px] overflow-hidden rounded" aria-hidden="true">
        {loaded &&
          roles.map((role) =>
            counts[role] ? (
              <span key={role} style={{ width: `${((counts[role] ?? 0) / Math.max(1, total)) * 100}%`, background: ROLE_COLOR[role] }} />
            ) : null,
          )}
        {!loaded && <span className="w-full animate-pulse bg-brand-sand" />}
      </div>
      <ul className="mt-3 grid grid-cols-3 gap-2">
        {roles.map((role) => (
          <li key={role} className="rounded-lg bg-brand-sand/60 px-2.5 py-2">
            <span className="flex items-center gap-1.5 text-[12.5px] text-brand-muted">
              <span aria-hidden="true" className="h-2.5 w-2.5 rounded-sm" style={{ background: ROLE_COLOR[role] }} />
              {ROLE_NAME[role]}
            </span>
            <span className="text-[18px] font-bold tabular-nums text-brand-ink">{counts[role] ?? "…"}</span>
            {loaded && total > 0 && (
              <span className="ml-1 text-[12px] tabular-nums text-brand-muted">{Math.round(((counts[role] ?? 0) / total) * 100)}%</span>
            )}
          </li>
        ))}
      </ul>
    </ChartCard>
  );
}

/** Sĩ số các lớp đang tuyển sinh — mỗi lớp một thanh: đã đóng phí + giữ chỗ trên sĩ số tối đa */
function EnrollmentFillChart() {
  const classes = useAdminClasses({ status: "ENROLLING", page: 0, size: 6 });
  const items = classes.data?.content ?? [];

  return (
    <ChartCard
      title="Sĩ số lớp đang tuyển sinh"
      subtitle={classes.data ? `${classes.data.totalElements} lớp đang mở đăng ký` : "Đang tải…"}
      linkTo={`${ROUTES.adminClasses}`}
      linkLabel="Xem lớp"
    >
      {items.length === 0 ? (
        <p className="text-[14px] text-brand-muted">{classes.isPending ? "Đang tải…" : "Không có lớp nào đang tuyển sinh."}</p>
      ) : (
        <>
          <ul className="space-y-2.5">
            {items.map((item) => {
              const paid = (item.currentStudents / item.maxStudents) * 100;
              const held = (item.reservedStudents / item.maxStudents) * 100;
              return (
                <li
                  key={item.id}
                  title={`${item.classCode}: ${item.currentStudents} đã đóng phí, ${item.reservedStudents} giữ chỗ / ${item.maxStudents}`}
                >
                  <div className="flex items-baseline justify-between gap-2 text-[13px]">
                    <span className="truncate font-semibold text-brand-ink">{item.courseName}</span>
                    <span className="shrink-0 tabular-nums text-brand-muted">
                      {item.currentStudents}
                      {item.reservedStudents > 0 && `+${item.reservedStudents}`}/{item.maxStudents}
                    </span>
                  </div>
                  <div className="mt-1 flex h-2.5 gap-[2px] overflow-hidden rounded bg-brand-sand">
                    <span className="h-full bg-brand-navy" style={{ width: `${paid}%` }} />
                    {held > 0 && <span className="h-full bg-brand-navy/35" style={{ width: `${held}%` }} />}
                  </div>
                </li>
              );
            })}
          </ul>
          <p className="mt-3 flex items-center gap-3 text-[12px] text-brand-muted">
            <span className="flex items-center gap-1">
              <span aria-hidden="true" className="h-2.5 w-2.5 rounded-sm bg-brand-navy" />
              Đã đóng phí
            </span>
            <span className="flex items-center gap-1">
              <span aria-hidden="true" className="h-2.5 w-2.5 rounded-sm bg-brand-navy/35" />
              Đang giữ chỗ
            </span>
          </p>
        </>
      )}
    </ChartCard>
  );
}

/** Bốn sơ đồ tổng quan của khu quản trị */
export function AdminOverviewCharts() {
  return (
    <div className="grid gap-5 md:grid-cols-2">
      <SessionsWeekChart />
      <ClassStatusChart />
      <UserMixChart />
      <EnrollmentFillChart />
    </div>
  );
}
