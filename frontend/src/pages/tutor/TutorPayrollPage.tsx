import { PayrollReconciliation } from "@/components/dashboard/PayrollReconciliation";
import { PortalPageHeader } from "@/components/dashboard/PortalPageHeader";
import { PortalEmpty, PortalError, PortalLoading } from "@/components/dashboard/PortalState";
import { StatTile } from "@/components/dashboard/StatTile";
import { useState } from "react";
import { StatusChip } from "@/components/dashboard/StatusChip";
import { Icon } from "@/components/ui/Icon";
import { PORTAL_BTN_SECONDARY, PORTAL_CARD } from "@/constants/classNames";
import { PAYROLL_STATUS } from "@/constants/labels";
import { monthLabel } from "@/constants/management";
import { useMyPayroll, useMyPayrollEstimate } from "@/hooks/useManagementData";
import { useNow } from "@/hooks/useNow";
import type { PayrollLineResponse } from "@/interfaces/dto";
import { fetchMyPayroll } from "@/services/managementService";
import { formatVnd } from "@/utils/currency";
import { downloadPayrollCsv } from "@/utils/payrollExport";

// Tải mọi tháng lương (mỗi lần tối đa 100 tháng) rồi xuất file CSV
async function exportAllMonths(): Promise<void> {
  const all: PayrollLineResponse[] = [];
  for (let page = 0, pages = 1; page < pages; page += 1) {
    const result = await fetchMyPayroll({ page, size: 100 });
    all.push(...result.content);
    pages = result.totalPages;
  }
  downloadPayrollCsv(all, "bang-luong-cua-toi.csv");
}

// Thu nhập của gia sư theo từng tháng đã chốt: lương cứng, thù lao theo buổi hợp lệ, buổi bị hủy / được dạy thay / chưa chốt,
// kèm danh sách từng buổi đã dạy.
// API: GET /tutor/payroll.
export function TutorPayrollPage() {
  const payroll = useMyPayroll();
  // GET /tutor/payroll chỉ trả tháng đã chốt, nên số "đang chờ duyệt" và "dự kiến" phải lấy từ bản tạm tính
  const estimate = useMyPayrollEstimate();
  const now = useNow();
  // Tháng mới nhất lên đầu
  const lines = [...(payroll.data?.content ?? [])].sort((a, b) => b.year - a.year || b.month - a.month);
  const latest = lines[0];
  const yearTotal = latest ? lines.filter((line) => line.year === latest.year).reduce((sum, line) => sum + line.totalPay, 0) : 0;
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState(false);

  // Các mốc thu nhập: Đã chốt (FINALIZED) coi là đã nhận; Tạm tính (DRAFT) của tháng đã qua là đang chờ trung tâm duyệt/chốt;
  // Tạm tính của tháng đang chạy (tháng hiện tại) là số dự kiến, có thể còn đổi khi buổi dạy phát sinh thêm.
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;
  // Bảng lương của tháng đã qua
  const isPast = (line: PayrollLineResponse) => line.year < currentYear || (line.year === currentYear && line.month < currentMonth);
  // Bảng lương của tháng hiện tại
  const isCurrent = (line: PayrollLineResponse) => line.year === currentYear && line.month === currentMonth;
  const estimateLines = estimate.data ?? [];
  // Quá trần một trang thì "Đã nhận" chưa cộng hết, phải nói ra thay vì đưa số thiếu
  const payrollCapped = payroll.data ? payroll.data.totalElements > lines.length : false;
  const received = lines.filter((line) => line.status === "FINALIZED").reduce((sum, line) => sum + line.totalPay, 0);
  const pendingApproval = estimateLines.filter(isPast).reduce((sum, line) => sum + line.totalPay, 0);
  const projected = estimateLines.filter(isCurrent).reduce((sum, line) => sum + line.totalPay, 0);

  return (
    <div>
      <PortalPageHeader
        icon="account_balance_wallet"
        title="Bảng lương của tôi"
        description="Lương cứng cộng thù lao cho mỗi buổi dạy hợp lệ. Bảng lương của một tháng hiện ở đây sau khi trung tâm chốt lương tháng đó."
        action={
          latest && (
            <button
              type="button"
              disabled={exporting}
              onClick={() => {
                setExporting(true);
                setExportError(false);
                exportAllMonths()
                  .catch(() => setExportError(true))
                  .finally(() => setExporting(false));
              }}
              className={PORTAL_BTN_SECONDARY}
            >
              <Icon name="download" className="text-[19px]" />
              {exporting ? "Đang xuất…" : "Xuất Excel (CSV)"}
            </button>
          )
        }
      />
      {exportError && (
        <p role="alert" className="mb-4 text-[14px] font-medium text-red-700">
          Chưa xuất được bảng lương. Vui lòng thử lại.
        </p>
      )}

      {
        // Các mốc thu nhập: đã nhận / đang chờ duyệt / dự kiến tháng này.
        // Hiện cả khi chưa có tháng nào được chốt, vì lúc đó "dự kiến tháng này" mới là số gia sư cần nhất.
      }
      {(latest || estimateLines.length > 0) && (
        <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <StatTile icon="account_balance" tone="green" label="Đã nhận (các tháng đã chốt)" value={formatVnd(received)} />
          <StatTile
            icon="hourglass_top"
            tone="orange"
            label="Đang chờ duyệt (đã qua tháng, chưa chốt)"
            value={estimate.isPending ? "…" : formatVnd(pendingApproval)}
          />
          <StatTile
            icon="query_stats"
            tone="navy"
            label="Dự kiến tháng này"
            value={estimate.isPending ? "…" : formatVnd(projected)}
          />
        </div>
      )}
      {payrollCapped && (
        <p className="mb-4 text-[12.5px] text-brand-muted">
          Ô “Đã nhận” mới cộng {lines.length} tháng gần nhất trong {payroll.data?.totalElements} tháng đã chốt.
        </p>
      )}

      {payroll.isPending ? (
        <PortalLoading label="Đang tải bảng lương" rows={3} />
      ) : payroll.isError ? (
        <PortalError message="Không tải được bảng lương." onRetry={() => void payroll.refetch()} />
      ) : !latest ? (
        <PortalEmpty
          icon="receipt_long"
          title="Chưa có bảng lương nào được chốt."
          description="Phiếu lương của một tháng hiện ở đây sau khi trung tâm chốt lương tháng đó."
        />
      ) : (
        <>
          {
            // Tháng gần nhất nổi bật
          }
          <section className="relative mb-6 overflow-hidden rounded-3xl bg-gradient-to-br from-brand-navyDeep via-brand-navy to-[#1F63D8] p-6 text-white shadow-[0_24px_48px_-28px_rgba(8,42,102,0.9)] sm:p-8">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -right-8 -top-10 h-36 w-36 rounded-full border-[10px] border-brand-orange/70"
            />
            <div className="relative flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="flex items-center gap-2 text-[13px] font-bold uppercase tracking-[0.1em] text-brand-orange">
                  {monthLabel(latest.year, latest.month)}
                  <span className="rounded-full bg-white/15 px-2 py-0.5 text-[11.5px] normal-case tracking-normal text-white">
                    {PAYROLL_STATUS[latest.status].label}
                  </span>
                </p>
                <p className="mt-2 text-[40px] font-extrabold leading-none tracking-tight tabular-nums sm:text-[46px]">
                  {formatVnd(latest.totalPay)}
                </p>
                <p className="mt-2 text-[14.5px] text-white/75">
                  Lương cứng {formatVnd(latest.baseSalary)} + {latest.validSessions} buổi × {formatVnd(latest.sessionRate)}
                </p>
              </div>
              <dl className="grid grid-cols-3 gap-2 text-center">
                {[
                  { label: "Buổi hợp lệ", value: latest.validSessions, icon: "task_alt" },
                  { label: "Buổi được dạy thay", value: latest.substitutedOutSessions, icon: "swap_horiz" },
                  { label: "Buổi chưa chốt", value: latest.unfinalizedSessions, icon: "pending" },
                ].map((item) => (
                  <div key={item.label} className="rounded-2xl bg-white/10 px-3 py-2.5 ring-1 ring-inset ring-white/15">
                    <dt className="flex items-center justify-center gap-1 text-[12px] text-white/70">
                      <Icon name={item.icon} className="text-[15px] text-brand-orange" />
                      {item.label}
                    </dt>
                    <dd className="text-[22px] font-extrabold tabular-nums">{item.value}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </section>

          <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
            <StatTile icon="savings" tone="orange" label={`Tổng thu nhập ${latest.year}`} value={formatVnd(yearTotal)} />
            <StatTile icon="event_available" tone="green" label="Buổi hợp lệ tháng này" value={String(latest.validSessions)} />
            <StatTile icon="event_busy" tone="red" label="Buổi bị hủy tháng này" value={String(latest.cancelledSessions)} />
          </div>

          <h2 className="mb-3 text-[18px] font-bold text-brand-ink">Các tháng</h2>
          <ul className="space-y-3">
            {lines.map((line) => {
              const status = PAYROLL_STATUS[line.status];
              return (
                <li key={`${line.year}-${line.month}`} className={`p-4 sm:p-5 ${PORTAL_CARD}`}>
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-3">
                      <span className="flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-xl bg-brand-tint leading-none text-brand-navy">
                        <span className="text-[11px] font-semibold">Th</span>
                        <span className="text-[18px] font-extrabold">{line.month}</span>
                      </span>
                      <div>
                        <p className="font-bold text-brand-ink">{monthLabel(line.year, line.month)}</p>
                        <p className="text-[13.5px] text-brand-muted">
                          {line.validSessions} buổi hợp lệ - {line.cancelledSessions} hủy - {line.substitutedOutSessions} được dạy thay
                          {line.unfinalizedSessions > 0 && (
                            <span className="font-semibold text-red-600"> - {line.unfinalizedSessions} chưa chốt</span>
                          )}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 sm:flex-col sm:items-end sm:gap-1">
                      <p className="text-[19px] font-extrabold tabular-nums text-brand-navy">{formatVnd(line.totalPay)}</p>
                      <StatusChip tone={status.tone} icon={status.icon}>
                        {status.label}
                      </StatusChip>
                    </div>
                  </div>
                  <details className="mt-3 border-t border-brand-sandLine pt-3">
                    <summary className="cursor-pointer text-[13.5px] font-semibold text-brand-navy">Xem các buổi đã dạy</summary>
                    <div className="mt-2">
                      <PayrollReconciliation summary={line.reconciliation} />
                    </div>
                  </details>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </div>
  );
}
