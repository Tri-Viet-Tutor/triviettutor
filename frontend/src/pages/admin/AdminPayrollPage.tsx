import { Fragment, useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/constants/queryKeys";
import { PayrollReconciliation } from "@/components/dashboard/PayrollReconciliation";
import { PortalDialog } from "@/components/dashboard/PortalDialog";
import { PortalPageHeader } from "@/components/dashboard/PortalPageHeader";
import { PortalEmpty, PortalError, PortalLoading } from "@/components/dashboard/PortalState";
import { StatTile } from "@/components/dashboard/StatTile";
import { StatusChip } from "@/components/dashboard/StatusChip";
import { Icon } from "@/components/ui/Icon";
import { PORTAL_BTN_ACCENT, PORTAL_BTN_SECONDARY, PORTAL_CARD, PORTAL_TEXT_LINK } from "@/constants/classNames";
import { PAYROLL_STATUS } from "@/constants/labels";
import { monthLabel } from "@/constants/management";
import { ROUTES } from "@/constants/routes";
import { usePayroll } from "@/hooks/useManagementData";
import { useRefreshAdmin } from "@/hooks/useAdminData";
import { finalizePayroll } from "@/services/managementService";
import { formatVnd } from "@/utils/currency";
import { portalErrorMessage } from "@/utils/errors";
import { displayCode } from "@/utils/classes";
import { downloadPayrollCsv } from "@/utils/payrollExport";

// Tháng trước của (năm, tháng)
function shiftMonth(year: number, month: number, delta: number) {
  const date = new Date(year, month - 1 + delta, 1);
  return { year: date.getFullYear(), month: date.getMonth() + 1 };
}

// Mã chống gửi trùng cho lần chốt lương
function newIdempotencyKey(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `payroll-${Date.now()}-${Math.random()}`;
}

// Bảng lương tháng của gia sư: lương cứng + thù lao theo buổi hợp lệ, các buổi bị hủy / được dạy thay / chưa chốt,
// và nút chốt bảng lương khi không còn buổi nào chặn.
// API: GET /admin/payroll/{year}/{month}, POST /admin/payroll/{year}/{month}/finalize (kèm Idempotency-Key).
export function AdminPayrollPage() {
  const now = new Date();
  // Mặc định xem tháng trước (tháng thường được chốt lương)
  const [period, setPeriod] = useState(() => shiftMonth(now.getFullYear(), now.getMonth() + 1, -1));
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Gia sư đang mở danh sách buổi dạy
  const [expanded, setExpanded] = useState<number | null>(null);
  const queryClient = useQueryClient();
  const payroll = usePayroll(period.year, period.month);
  const refresh = useRefreshAdmin();
  // Tháng kế tiếp nằm ở tương lai thì không cho chuyển tới
  const isFutureNext = (() => {
    const next = shiftMonth(period.year, period.month, 1);
    return next.year > now.getFullYear() || (next.year === now.getFullYear() && next.month > now.getMonth() + 1);
  })();

  const finalize = useMutation({
    mutationFn: () => finalizePayroll(period.year, period.month, newIdempotencyKey()),
    meta: {
      invalidates: [
        queryKeys.admin.payroll(period.year, period.month),
        queryKeys.admin.allPayroll,
        queryKeys.admin.all,
      ],
    },
    onSuccess: () => {
      setConfirming(false);
      void refresh();
      void queryClient.invalidateQueries({ queryKey: queryKeys.admin.payroll(period.year, period.month) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.admin.allPayroll });
    },
    onError: (err) => setError(portalErrorMessage(err, "Chưa chốt được bảng lương. Vui lòng thử lại.")),
  });

  const data = payroll.data;
  const totals = data
    ? data.lines.reduce(
        (sum, line) => ({
          valid: sum.valid + line.validSessions,
          unfinalized: sum.unfinalized + line.unfinalizedSessions,
        }),
        { valid: 0, unfinalized: 0 },
      )
    : undefined;

  return (
    <div>
      <PortalPageHeader
        icon="account_balance_wallet"
        title="Bảng lương gia sư"
        description="Lương cứng cộng thù lao theo từng buổi dạy hợp lệ. Chốt bảng lương khi mọi buổi trong tháng đã khóa điểm danh."
      />

      {
        // Chọn tháng
      }
      <div className={`mb-6 flex flex-col gap-3 p-3 sm:flex-row sm:items-center sm:justify-between sm:p-4 ${PORTAL_CARD}`}>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            aria-label="Tháng trước"
            onClick={() => setPeriod(shiftMonth(period.year, period.month, -1))}
            className={`${PORTAL_BTN_SECONDARY} w-10 px-0`}
          >
            <Icon name="chevron_left" className="text-[22px]" />
          </button>
          <p className="min-w-[124px] text-center text-[17px] font-extrabold text-brand-navy sm:min-w-[150px] sm:text-[18px]">
            {monthLabel(period.year, period.month)}
          </p>
          <button
            type="button"
            aria-label="Tháng sau"
            disabled={isFutureNext}
            onClick={() => setPeriod(shiftMonth(period.year, period.month, 1))}
            className={`${PORTAL_BTN_SECONDARY} w-10 px-0`}
          >
            <Icon name="chevron_right" className="text-[22px]" />
          </button>
          {data && (
            <StatusChip tone={PAYROLL_STATUS[data.status].tone} icon={PAYROLL_STATUS[data.status].icon}>
              {PAYROLL_STATUS[data.status].label}
            </StatusChip>
          )}
        </div>
        {data?.status === "DRAFT" && (
          <button
            type="button"
            disabled={!data.canFinalize}
            onClick={() => {
              setError(null);
              setConfirming(true);
            }}
            className={PORTAL_BTN_ACCENT}
            title={data.canFinalize ? undefined : "Còn buổi học chưa chốt điểm danh"}
          >
            <Icon name="lock" className="text-[19px]" />
            Chốt bảng lương
          </button>
        )}
        {data?.status === "FINALIZED" && data.finalizedAt && (
          <p className="flex items-center gap-1.5 text-[14px] text-brand-muted">
            <Icon name="verified" className="text-[18px] text-emerald-600" />
            Đã chốt lúc {new Date(data.finalizedAt).toLocaleString("vi-VN")}
          </p>
        )}
        {data && data.lines.length > 0 && (
          <button
            type="button"
            onClick={() => downloadPayrollCsv(data.lines, `bang-luong-${data.year}-${String(data.month).padStart(2, "0")}.csv`)}
            className={PORTAL_BTN_SECONDARY}
          >
            <Icon name="download" className="text-[19px]" />
            Xuất Excel (CSV)
          </button>
        )}
      </div>

      {payroll.isPending ? (
        <PortalLoading label="Đang tải bảng lương" rows={4} />
      ) : payroll.isError ? (
        <PortalError message="Không tải được bảng lương tháng này." onRetry={() => void payroll.refetch()} />
      ) : (
        <>
          <div className="mb-6 grid grid-cols-2 gap-3 xl:grid-cols-4">
            <StatTile icon="payments" tone="orange" label="Tổng quỹ lương" value={formatVnd(payroll.data.totalPayroll)} />
            <StatTile icon="groups" label="Gia sư có lương" value={String(payroll.data.lines.length)} />
            <StatTile icon="task_alt" tone="green" label="Buổi dạy hợp lệ" value={String(totals?.valid ?? 0)} />
            <StatTile
              icon="pending_actions"
              tone={totals && totals.unfinalized > 0 ? "red" : "green"}
              label="Buổi chưa chốt"
              value={String(totals?.unfinalized ?? 0)}
            />
          </div>

          {payroll.data.status === "DRAFT" && payroll.data.blockingSessionIds.length > 0 && (
            <div className="mb-6 flex flex-col gap-2 rounded-2xl border border-amber-300 bg-amber-50 p-4 text-[14px] text-amber-900 sm:flex-row sm:items-center sm:justify-between">
              <p className="flex items-start gap-2">
                <Icon name="warning" className="text-[20px] text-amber-600" />
                <span>
                  Còn <b>{payroll.data.blockingSessionIds.length} buổi</b> chưa khóa điểm danh / xác nhận đã dạy nên chưa chốt được lương:{" "}
                  <span className="font-mono">
                    {payroll.data.blockingSessionIds
                      .slice(0, 8)
                      .map((id) => displayCode("session", id))
                      .join(", ")}
                    {payroll.data.blockingSessionIds.length > 8 && "…"}
                  </span>
                </span>
              </p>
              <Link to={ROUTES.adminSessions} className={`${PORTAL_TEXT_LINK} shrink-0`}>
                Tới trang buổi học
              </Link>
            </div>
          )}

          {payroll.data.lines.length === 0 ? (
            <PortalEmpty
              icon="receipt_long"
              title="Tháng này chưa có dòng lương nào."
              description="Chưa có gia sư nào dạy buổi học trong tháng đã chọn."
            />
          ) : (
            <div className={`overflow-hidden ${PORTAL_CARD}`}>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[860px] text-left text-[14px]">
                  <thead className="bg-brand-sand/70 text-[12.5px] uppercase tracking-wide text-brand-muted">
                    <tr>
                      <th className="px-5 py-3 font-bold">Gia sư</th>
                      <th className="px-3 py-3 text-right font-bold">Lương cứng</th>
                      <th className="px-3 py-3 text-right font-bold">Thù lao / buổi</th>
                      <th className="px-3 py-3 text-center font-bold">Buổi hợp lệ</th>
                      <th className="px-3 py-3 text-center font-bold">Buổi hủy</th>
                      <th className="px-3 py-3 text-center font-bold">Buổi được dạy thay</th>
                      <th className="px-3 py-3 text-center font-bold">Buổi chưa chốt</th>
                      <th className="px-5 py-3 text-right font-bold">Thực nhận</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-brand-sandLine">
                    {payroll.data.lines.map((line) => (
                      <Fragment key={line.tutorId}>
                        <tr className="hover:bg-brand-tint/40">
                          <td className="px-5 py-3.5">
                            <p className="font-semibold text-brand-ink">{line.tutorName}</p>
                            <p className="text-[12.5px] text-brand-muted">Mã {displayCode("tutor", line.tutorId)}</p>
                            {line.status === "DISPUTED" && (
                              <div className="mt-1.5 max-w-[260px] space-y-1">
                                <StatusChip tone={PAYROLL_STATUS.DISPUTED.tone} icon={PAYROLL_STATUS.DISPUTED.icon}>
                                  {PAYROLL_STATUS.DISPUTED.label}
                                </StatusChip>
                                <p className="whitespace-pre-line break-words text-[12.5px] text-red-800">{line.disputeReason}</p>
                              </div>
                            )}
                            <button
                              type="button"
                              aria-expanded={expanded === line.tutorId}
                              onClick={() => setExpanded(expanded === line.tutorId ? null : line.tutorId)}
                              className={`mt-0.5 inline-flex items-center gap-0.5 text-[12.5px] ${PORTAL_TEXT_LINK}`}
                            >
                              <Icon name={expanded === line.tutorId ? "expand_less" : "expand_more"} className="text-[16px]" />
                              {expanded === line.tutorId ? "Ẩn các buổi" : "Xem các buổi"}
                            </button>
                          </td>
                          <td className="px-3 py-3.5 text-right tabular-nums">{formatVnd(line.baseSalary)}</td>
                          <td className="px-3 py-3.5 text-right tabular-nums">{formatVnd(line.sessionRate)}</td>
                          <td className="px-3 py-3.5 text-center font-semibold tabular-nums text-emerald-700">{line.validSessions}</td>
                          <td className="px-3 py-3.5 text-center tabular-nums text-brand-muted">{line.cancelledSessions}</td>
                          <td className="px-3 py-3.5 text-center tabular-nums text-brand-muted">{line.substitutedOutSessions}</td>
                          <td
                            className={`px-3 py-3.5 text-center tabular-nums ${line.unfinalizedSessions > 0 ? "font-bold text-red-600" : "text-brand-muted"}`}
                          >
                            {line.unfinalizedSessions}
                          </td>
                          <td className="px-5 py-3.5 text-right">
                            <p className="font-extrabold tabular-nums text-brand-navy">{formatVnd(line.totalPay)}</p>
                            <p className="text-[12px] text-brand-muted tabular-nums">thù lao {formatVnd(line.sessionPay)}</p>
                          </td>
                        </tr>
                        {expanded === line.tutorId && (
                          <tr className="bg-brand-sand/40">
                            <td colSpan={8} className="px-5 py-3.5">
                              <PayrollReconciliation summary={line.reconciliation} />
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-brand-navy text-white">
                      <td className="px-5 py-3.5 font-bold" colSpan={7}>
                        Tổng {monthLabel(payroll.data.year, payroll.data.month).toLowerCase()}
                      </td>
                      <td className="px-5 py-3.5 text-right text-[16px] font-extrabold tabular-nums">
                        {formatVnd(payroll.data.totalPayroll)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      <PortalDialog
        open={confirming}
        onClose={() => setConfirming(false)}
        title={`Chốt ${monthLabel(period.year, period.month).toLowerCase()}?`}
        description="Sau khi chốt, các buổi trong tháng không sửa điểm danh được nữa."
      >
        {data && (
          <div className="space-y-4">
            <p className="rounded-2xl bg-brand-sand p-4 text-[15px]">
              Tổng quỹ lương <b className="text-brand-navy">{formatVnd(data.totalPayroll)}</b> cho <b>{data.lines.length}</b> gia sư.
            </p>
            {error && (
              <p role="alert" className="flex items-center gap-1.5 text-[14px] font-medium text-red-700">
                <Icon name="error" className="text-[18px]" />
                {error}
              </p>
            )}
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setConfirming(false)} className={PORTAL_BTN_SECONDARY}>
                Để sau
              </button>
              <button type="button" disabled={finalize.isPending} onClick={() => finalize.mutate()} className={PORTAL_BTN_ACCENT}>
                <Icon name="lock" className="text-[19px]" />
                {finalize.isPending ? "Đang chốt…" : "Chốt bảng lương"}
              </button>
            </div>
          </div>
        )}
      </PortalDialog>
    </div>
  );
}
