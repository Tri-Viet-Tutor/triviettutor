import { useQuery } from "@tanstack/react-query";
import { type ReactNode, useState } from "react";
import { Link } from "react-router-dom";
import { Icon } from "@/components/ui/Icon";
import { PORTAL_CARD, PORTAL_MORE_LINK } from "@/constants/classNames";
import { ROLE_NAME } from "@/constants/labels";
import { subjectLabel } from "@/constants/management";
import { ROUTES } from "@/constants/routes";
import { adminKeys, useAdminSessions, useUserCounts } from "@/hooks/useAdminData";
import { useAdminClasses } from "@/hooks/useManagementData";
import type { ClassStatus, Role } from "@/interfaces/dto";
import { fetchPaymentsSince } from "@/services/adminService";
import { displayCode } from "@/utils/classes";
import { formatVnd } from "@/utils/currency";
import { addDays, startOfToday, toIsoDate, weekdayName } from "@/utils/date";

// Báo cáo tổng quan của khu quản trị, vẽ bằng SVG / CSS (không thêm thư viện biểu đồ).
// Một chuỗi số liệu dùng một màu navy; biểu đồ nhiều nhóm dùng bảng màu phân loại cố định
// (thứ tự xanh dương, cam, xanh ngọc, vàng, hồng, xanh lá) và luôn có chú thích kèm con số.
const SERIES = ["#2a78d6", "#eb6834", "#1baf7a", "#eda100", "#e87ba4", "#008300"];
const ROLE_COLOR: Record<Role, string> = { ROLE_STUDENT: SERIES[0], ROLE_TUTOR: SERIES[1], ROLE_ADMIN: SERIES[2] };
const NAVY = "#0B3A8C";

// Giai đoạn lớp học gộp từ trạng thái (để biểu đồ gọn)
const STAGES: { label: string; statuses: ClassStatus[] }[] = [
  { label: "Chuẩn bị", statuses: ["DRAFT", "PUBLISHED"] },
  { label: "Đang tuyển sinh", statuses: ["ENROLLING"] },
  { label: "Đã chốt lớp", statuses: ["ASSIGNED"] },
  { label: "Đang học", statuses: ["IN_PROGRESS"] },
  { label: "Đã kết thúc", statuses: ["COMPLETED"] },
  { label: "Hủy / không mở", statuses: ["CANCELLED", "FAILED_TO_OPEN"] },
];
const ACTIVE: ClassStatus[] = ["ENROLLING", "ASSIGNED", "IN_PROGRESS"];

// Số tiền đầy đủ không kèm đơn vị cho trục biểu đồ: 5400000 → "5.400.000" (đơn vị VNĐ ghi ở tiêu đề trục)
const plainVnd = (value: number) => new Intl.NumberFormat("vi-VN").format(value);
// Ngày dạng "ngày/tháng" cho nhãn biểu đồ
const dm = (date: Date) => `${date.getDate()}/${date.getMonth() + 1}`;

// Khung một ô báo cáo: tiêu đề, phụ đề, nút bên phải và nội dung
function Card({ title, subtitle, action, children, className = "" }: { title: string; subtitle?: string; action?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`flex flex-col p-5 ${PORTAL_CARD} ${className}`}>
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-[16px] font-extrabold text-brand-navy">{title}</h2>
          {subtitle && <p className="mt-0.5 text-[13px] text-brand-muted">{subtitle}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

// Link "xem thêm" ở góc ô báo cáo
function More({ to, label }: { to: string; label: string }) {
  return (
    <Link to={to} className={`shrink-0 text-[13px] ${PORTAL_MORE_LINK}`}>
      {label}
      <Icon name="chevron_right" className="text-[17px]" />
    </Link>
  );
}

// Biểu đồ cột dọc một chuỗi, rê chuột xem giá trị; `highlight` tô cột đặc biệt (hôm nay)
function Columns({
  values,
  labels,
  format,
  tooltip,
  highlight,
  height = 180,
  unit,
}: {
  values: number[];
  labels: string[];
  format: (value: number) => string;
  tooltip: (index: number) => string;
  highlight?: number;
  height?: number;
  // Đơn vị của trục dọc, ghi trên đầu trục
  unit?: string;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const max = Math.max(1, ...values);
  // Mốc lưới tròn: 0, nửa, đỉnh
  const top = max <= 4 ? 4 : max;
  const ticks = [top, top / 2, 0];
  const every = Math.ceil(labels.length / 7);
  return (
    <div className={`relative flex gap-2 ${unit ? "pt-5" : ""}`}>
      {unit && <span className="absolute left-0 top-0 text-[11px] font-semibold text-brand-muted">{unit}</span>}
      <div className={`flex shrink-0 flex-col justify-between text-right text-[11px] tabular-nums text-brand-muted ${unit ? "w-[74px]" : "w-10"}`} style={{ height }}>
        {ticks.map((tick) => (
          <span key={tick} className="-translate-y-1/2 first:translate-y-0 last:translate-y-0">
            {format(Math.round(tick))}
          </span>
        ))}
      </div>
      <div className="min-w-0 flex-1">
        <div className="relative" style={{ height }}>
          {ticks.map((tick, index) => (
            <div key={tick} aria-hidden="true" className="absolute inset-x-0 border-t border-brand-sandLine" style={{ top: `${(index / 2) * 100}%` }} />
          ))}
          <ul className="absolute inset-0 flex items-end gap-[2px]">
            {values.map((value, index) => (
              <li
                key={index}
                className="relative flex h-full flex-1 items-end justify-center"
                onMouseEnter={() => setHover(index)}
                onMouseLeave={() => setHover(null)}
                aria-label={tooltip(index)}
              >
                {hover === index && (
                  <span className="pointer-events-none absolute bottom-full z-10 mb-1 whitespace-nowrap rounded-lg bg-brand-ink px-2.5 py-1.5 text-[12px] font-semibold text-white shadow-lg">
                    {tooltip(index)}
                  </span>
                )}
                <span
                  className="w-full max-w-[28px] rounded-t-[4px] transition-opacity"
                  style={{
                    height: `${(value / top) * 100}%`,
                    minHeight: value > 0 ? 3 : 0,
                    background: index === highlight ? "#F5A00F" : NAVY,
                    opacity: hover === null || hover === index ? 1 : 0.55,
                  }}
                />
              </li>
            ))}
          </ul>
        </div>
        <div className="mt-1.5 flex gap-[2px]">
          {labels.map((label, index) => (
            <span
              key={index}
              className={`relative flex-1 whitespace-nowrap text-center text-[11px] tabular-nums ${index === highlight ? "font-bold text-brand-ink" : "text-brand-muted"}`}
            >
              <span className="absolute left-1/2 -translate-x-1/2">{index % every === 0 || index === highlight ? label : ""}</span>
              &nbsp;
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

// Biểu đồ vành khuyên nhiều nhóm, giữa ghi tổng; khe trắng 2px giữa các phần
function Donut({ parts, total, center }: { parts: { label: string; value: number; color: string }[]; total: number; center: string }) {
  const [hover, setHover] = useState<number | null>(null);
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;
  return (
    <div className="flex flex-wrap items-center gap-5">
      <svg viewBox="0 0 140 140" className="h-[150px] w-[150px] shrink-0 -rotate-90" role="img" aria-label={center}>
        <circle cx="70" cy="70" r={radius} fill="none" stroke="#F1EBE0" strokeWidth="18" />
        {total > 0 &&
          parts.map((part, index) => {
            const length = (part.value / total) * circumference;
            const gap = part.value > 0 && parts.filter((p) => p.value > 0).length > 1 ? 2 : 0;
            const circle = (
              <circle
                key={part.label}
                cx="70"
                cy="70"
                r={radius}
                fill="none"
                stroke={part.color}
                strokeWidth={hover === index ? 22 : 18}
                strokeDasharray={`${Math.max(0, length - gap)} ${circumference}`}
                strokeDashoffset={-offset}
                onMouseEnter={() => setHover(index)}
                onMouseLeave={() => setHover(null)}
                className="cursor-default transition-all"
              />
            );
            offset += length;
            return circle;
          })}
        <text x="70" y="66" textAnchor="middle" className="fill-brand-ink text-[24px] font-extrabold" transform="rotate(90 70 70)">
          {hover !== null ? parts[hover].value : total}
        </text>
        <text x="70" y="86" textAnchor="middle" className="fill-brand-muted text-[10.5px] font-semibold" transform="rotate(90 70 70)">
          {hover !== null ? parts[hover].label : center}
        </text>
      </svg>
      <ul className="min-w-[150px] flex-1 space-y-1.5">
        {parts.map((part, index) => (
          <li
            key={part.label}
            onMouseEnter={() => setHover(index)}
            onMouseLeave={() => setHover(null)}
            className={`flex items-center gap-2 rounded-lg px-1.5 py-0.5 text-[13px] ${hover === index ? "bg-brand-sand" : ""}`}
          >
            <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: part.color }} />
            <span className="flex-1 text-brand-ink">{part.label}</span>
            <span className="font-bold tabular-nums text-brand-ink">{part.value}</span>
            <span className="w-10 text-right text-[12px] tabular-nums text-brand-muted">{total ? Math.round((part.value / total) * 100) : 0}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

// Ô số liệu chính (KPI): biểu tượng, nhãn, giá trị, có thể bấm sang trang chi tiết
function Kpi({ icon, label, value, sub, to, wide = false }: { icon: string; label: string; value: string; sub?: string; to?: string; wide?: boolean }) {
  const body = (
    <>
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-brand-tint text-brand-navy">
        <Icon name={icon} className="text-[23px]" />
      </span>
      <span className="min-w-0">
        <span className="block truncate text-[12.5px] font-semibold text-brand-muted">{label}</span>
        <span className="block truncate text-[19px] font-extrabold leading-tight tabular-nums text-brand-ink" title={value}>{value}</span>
        {sub && <span className="block truncate text-[12px] text-brand-muted">{sub}</span>}
      </span>
    </>
  );
  const className = `flex items-center gap-3 p-4 ${PORTAL_CARD} ${wide ? "col-span-2" : ""}`;
  return to ? (
    <Link to={to} className={`${className} transition-shadow hover:shadow-[0_18px_36px_-24px_rgba(11,58,140,0.5)]`}>
      {body}
    </Link>
  ) : (
    <div className={className}>{body}</div>
  );
}

// Báo cáo tổng quan: hàng chỉ số chính, doanh thu học phí 30 ngày, buổi học 14 ngày tới,
// lớp theo giai đoạn, học viên theo môn, sĩ số lớp đang tuyển sinh và người dùng theo vai trò.
// Dữ liệu: GET /admin/payments, /admin/sessions, /admin/classes, /admin/users.
export function AdminReport() {
  const today = startOfToday();
  const todayIso = toIsoDate(today);
  const monthStart = addDays(today, -29);
  const payments = useQuery({
    queryKey: [...adminKeys.all, "report-payments", toIsoDate(monthStart)],
    queryFn: () => fetchPaymentsSince(toIsoDate(monthStart)),
  });
  const next14 = Array.from({ length: 14 }, (_, index) => addDays(today, index));
  const sessions = useAdminSessions({ from: todayIso, to: toIsoDate(next14[13]), page: 0, size: 100 });
  const classesQuery = useAdminClasses({ page: 0, size: 100 });
  const users = useUserCounts();

  const classes = classesQuery.data?.content ?? [];
  const active = classes.filter((item) => ACTIVE.includes(item.status));
  const learners = active.reduce((sum, item) => sum + item.currentStudents, 0);

  // Doanh thu theo ngày (giao dịch thành công, trừ phần đã hoàn)
  const days30 = Array.from({ length: 30 }, (_, index) => addDays(monthStart, index));
  const paid = (payments.data?.content ?? []).filter((item) => item.status === "COMPLETED" || item.status === "PARTIALLY_REFUNDED");
  // Ưu đãi lớp nhóm hoàn vào ví cũng là tiền trả lại học viên, nên trừ khỏi doanh thu như hoàn tiền.
  const net = (item: (typeof paid)[number]) => item.amount - (item.refundedAmount ?? 0) - (item.discountCredited ?? 0);
  const revenueByDay = days30.map((day) => {
    const iso = toIsoDate(day);
    return paid.filter((item) => toIsoDate(new Date(item.paidAt ?? item.createdAt)) === iso).reduce((sum, item) => sum + net(item), 0);
  });
  const revenue = revenueByDay.reduce((sum, value) => sum + value, 0);
  const byMethod = [
    { label: "VNPay", value: paid.filter((item) => item.method === "VNPAY").reduce((s, i) => s + net(i), 0), color: SERIES[0] },
    { label: "Ví học phí", value: paid.filter((item) => item.method === "WALLET").reduce((s, i) => s + net(i), 0), color: SERIES[1] },
    { label: "Khác", value: paid.filter((item) => item.method === "MOCK").reduce((s, i) => s + net(i), 0), color: SERIES[2] },
  ].filter((part) => part.value > 0);

  // Buổi học 14 ngày tới (không tính buổi đã hủy)
  const sessionCounts = next14.map(
    (day) => (sessions.data?.content ?? []).filter((item) => item.date === toIsoDate(day) && item.status !== "CANCELLED").length,
  );

  // Lớp theo giai đoạn
  const stages = STAGES.map((stage, index) => ({
    label: stage.label,
    value: classes.filter((item) => stage.statuses.includes(item.status)).length,
    color: SERIES[index],
  }));

  // Học viên theo môn (lớp đang hoạt động)
  const subjects = [...new Set(active.map((item) => item.subject))]
    .map((subject) => ({ subject, value: active.filter((item) => item.subject === subject).reduce((s, i) => s + i.currentStudents, 0) }))
    .sort((a, b) => b.value - a.value);
  const subjectMax = Math.max(1, ...subjects.map((item) => item.value));

  // Sĩ số lớp đang tuyển sinh
  const enrolling = classes.filter((item) => item.status === "ENROLLING").sort((a, b) => b.currentStudents / b.maxStudents - a.currentStudents / a.maxStudents);
  const seats = enrolling.reduce((s, i) => s + i.maxStudents, 0);
  const taken = enrolling.reduce((s, i) => s + i.currentStudents, 0);
  // Danh sách chỉ hiện 6 lớp cần chú ý nhất, trong khi phụ đề cộng toàn bộ lớp đang tuyển,
  // nên phải nói rõ kẻo người đọc cộng tay 6 dòng rồi thấy lệch với phụ đề
  const shownEnrolling = enrolling.slice(0, 6);
  // Truy vấn lấy tối đa 100 lớp: quá ngưỡng này thì phụ đề cũng chưa cộng đủ
  const classesCapped = classesQuery.data ? classesQuery.data.totalElements > classes.length : false;

  const roles: Role[] = ["ROLE_STUDENT", "ROLE_TUTOR", "ROLE_ADMIN"];
  const userTotal = roles.reduce((s, role) => s + (users[role] ?? 0), 0);

  return (
    <div className="space-y-5">
      {
        // Chỉ số chính
      }
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-6">
        <Kpi icon="payments" label="Doanh thu 30 ngày" value={payments.data ? formatVnd(revenue) : "…"} sub={`${paid.length} giao dịch thành công`} to={ROUTES.adminPayments} wide />
        <Kpi icon="school" label="Lớp hoạt động" value={classesQuery.data ? String(active.length) : "…"} sub={`${classesQuery.data?.totalElements ?? classes.length} lớp tất cả`} to={ROUTES.adminClasses} />
        <Kpi icon="groups" label="Đang theo học" value={classesQuery.data ? String(learners) : "…"} sub="học viên trong lớp" />
        <Kpi icon="person" label="Học viên" value={users.ROLE_STUDENT !== undefined ? String(users.ROLE_STUDENT) : "…"} sub="tài khoản" to={ROUTES.adminUsers} />
        <Kpi icon="badge" label="Gia sư" value={users.ROLE_TUTOR !== undefined ? String(users.ROLE_TUTOR) : "…"} sub="tài khoản" to={ROUTES.adminUsers} />
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
        <Card
          className="xl:col-span-2"
          title="Doanh thu học phí 30 ngày qua"
          subtitle={payments.isError ? "Không tải được giao dịch." : payments.data ? `Tổng ${formatVnd(revenue)} (đã trừ hoàn tiền)` : "Đang tải…"}
          action={<More to={ROUTES.adminPayments} label="Giao dịch" />}
        >
          <Columns
            values={revenueByDay}
            labels={days30.map(dm)}
            format={plainVnd}
            unit="VNĐ"
            highlight={29}
            tooltip={(index) => `${weekdayName(days30[index], true)} ${dm(days30[index])}: ${formatVnd(revenueByDay[index])}`}
          />
          {payments.data && payments.data.totalElements > 100 && (
            <p className="mt-2 text-[12px] text-brand-muted">Chỉ tính 100 giao dịch gần nhất trong khoảng này.</p>
          )}
        </Card>

        <Card title="Doanh thu theo phương thức" subtitle="30 ngày qua">
          {byMethod.length === 0 ? (
            <p className="text-[13.5px] text-brand-muted">Chưa có giao dịch thành công.</p>
          ) : (
            <>
              <div className="flex h-4 overflow-hidden rounded-full bg-brand-sand" role="img" aria-label="Tỉ lệ doanh thu theo phương thức">
                {byMethod.map((part) => (
                  <span key={part.label} style={{ width: `${(part.value / revenue) * 100}%`, background: part.color }} className="border-r-2 border-white last:border-r-0" />
                ))}
              </div>
              <ul className="mt-4 space-y-2.5">
                {byMethod.map((part) => (
                  <li key={part.label} className="flex items-center gap-2 text-[13.5px]">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ background: part.color }} />
                    <span className="flex-1 text-brand-ink">{part.label}</span>
                    <span className="font-bold tabular-nums text-brand-ink">{formatVnd(part.value)}</span>
                    <span className="w-10 text-right text-[12px] tabular-nums text-brand-muted">{Math.round((part.value / revenue) * 100)}%</span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
        <Card
          className="xl:col-span-2"
          title="Buổi học 14 ngày tới"
          subtitle={sessions.data ? `${sessionCounts.reduce((s, c) => s + c, 0)} buổi, không tính buổi đã hủy` : "Đang tải…"}
          action={<More to={ROUTES.adminSessions} label="Buổi học" />}
        >
          <Columns
            values={sessionCounts}
            labels={next14.map((day, index) => (index === 0 ? "Nay" : dm(day)))}
            format={(value) => String(value)}
            highlight={0}
            tooltip={(index) => `${weekdayName(next14[index])} ${dm(next14[index])}: ${sessionCounts[index]} buổi`}
            height={160}
          />
          {sessions.data && sessions.data.totalElements > sessions.data.content.length && (
            <p className="mt-2 text-[12px] text-brand-muted">Chỉ tính {sessions.data.content.length} buổi đầu tiên trong khoảng này.</p>
          )}
        </Card>

        <Card title="Lớp học theo giai đoạn" action={<More to={ROUTES.adminClasses} label="Lớp học" />}>
          <Donut parts={stages} total={classes.length} center="lớp học" />
          {classesQuery.data && classesQuery.data.totalElements > classes.length && (
            <p className="mt-2 text-[12px] text-brand-muted">Chỉ tính {classes.length} lớp đầu tiên.</p>
          )}
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
        <Card title="Học viên theo môn" subtitle="Trong các lớp đang hoạt động">
          {subjects.length === 0 ? (
            <p className="text-[13.5px] text-brand-muted">Chưa có học viên trong lớp nào.</p>
          ) : (
            <ul className="space-y-3">
              {subjects.map((row) => (
                <li key={row.subject}>
                  <div className="mb-1 flex items-center justify-between text-[13px]">
                    <span className="font-semibold text-brand-ink">{subjectLabel(row.subject)}</span>
                    <span className="font-bold tabular-nums text-brand-ink">{row.value}</span>
                  </div>
                  <div className="h-2.5 rounded-full bg-brand-sand">
                    <div className="h-full rounded-full" style={{ width: `${(row.value / subjectMax) * 100}%`, background: NAVY }} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card title="Sĩ số lớp đang tuyển sinh" subtitle={seats ? `${taken}/${seats} chỗ đã có học viên đăng ký (${Math.round((taken / seats) * 100)}%)` : undefined}>
          {enrolling.length === 0 ? (
            <p className="text-[13.5px] text-brand-muted">Không có lớp nào đang tuyển sinh.</p>
          ) : (
            <ul className="space-y-3">
              {shownEnrolling.map((item) => {
                // Lớp vượt sĩ số (dữ liệu lệch) vẫn phải vẽ gọn trong khung, nếu không thanh tràn ra ngoài thẻ
                const ratio = item.currentStudents / item.maxStudents;
                const over = item.currentStudents > item.maxStudents;
                return (
                  <li key={item.id}>
                    <div className="mb-1 flex items-center justify-between gap-2 text-[13px]">
                      <span className="min-w-0 truncate font-semibold text-brand-ink">
                        {item.courseName} <span className="font-normal text-brand-muted">{displayCode("class", item.id)}</span>
                      </span>
                      <span className={`shrink-0 font-bold tabular-nums ${over ? "text-red-700" : "text-brand-ink"}`}>
                        {item.currentStudents}/{item.maxStudents}
                        {over && <Icon name="warning" className="ml-1 align-[-3px] text-[15px]" />}
                      </span>
                    </div>
                    <div className="h-2.5 rounded-full bg-brand-sand">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${Math.min(1, ratio) * 100}%`,
                          minWidth: item.currentStudents ? 6 : 0,
                          background: over ? "#B91C1C" : ratio >= 1 ? SERIES[2] : NAVY,
                        }}
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
          {enrolling.length > shownEnrolling.length && (
            <p className="mt-3 text-[12px] text-brand-muted">
              Đang hiện {shownEnrolling.length} lớp đầy nhất trong {enrolling.length} lớp đang tuyển; phụ đề phía trên cộng cả {enrolling.length} lớp.
            </p>
          )}
          {classesCapped && <p className="mt-1 text-[12px] text-brand-muted">Chỉ cộng {classes.length} lớp đầu tiên.</p>}
        </Card>

        <Card title="Người dùng" subtitle={userTotal ? `${userTotal} tài khoản` : undefined} action={<More to={ROUTES.adminUsers} label="Người dùng" />}>
          <Donut parts={roles.map((role) => ({ label: ROLE_NAME[role], value: users[role] ?? 0, color: ROLE_COLOR[role] }))} total={userTotal} center="tài khoản" />
        </Card>
      </div>
    </div>
  );
}
