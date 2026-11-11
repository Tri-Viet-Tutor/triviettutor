import { Fragment, useRef, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AuthNotice } from "@/components/auth/AuthNotice";
import { PortalPageHeader } from "@/components/dashboard/PortalPageHeader";
import { PORTAL_BTN_PRIMARY, PORTAL_BTN_SECONDARY, PORTAL_INPUT } from "@/constants/classNames";
import { TRANSACTION_STATUS, transactionStatus } from "@/constants/labels";
import type { PaymentCardProps } from "@/interfaces/admin";
import type { PaymentStatus } from "@/interfaces/dto";
import { getApiError } from "@/services/apiClient";
import { listPayments, refundPayment, updateRefund } from "@/services/tuitionPaymentService";
import { formatVnd } from "@/utils/currency";
import { displayCode } from "@/utils/classes";
import { Select } from "@/components/ui/Select";

// Tên trạng thái giao dịch, theo nhãn chuẩn TRANSACTION_STATUS
const STATUSES: Record<PaymentStatus, string> = {
  COMPLETED: transactionStatus("COMPLETED").label,
  FAILED: transactionStatus("FAILED").label,
  REQUIRES_REFUND: transactionStatus("REQUIRES_REFUND").label,
  PARTIALLY_REFUNDED: transactionStatus("PARTIALLY_REFUNDED").label,
  REFUNDED: transactionStatus("REFUNDED").label,
};

// Trang Thanh toán của quản trị: xem giao dịch học phí theo trạng thái và hoàn tiền (GET /admin/payments).
export function AdminPaymentsPage() {
  const cache = useQueryClient();
  const [status, setStatus] = useState<PaymentStatus | "">("");
  const [page, setPage] = useState(0);
  const [openId, setOpenId] = useState<number | null>(null);
  const payments = useQuery({ queryKey: ["admin-payments", status, page], queryFn: () => listPayments(status, page) });
  return (
    <div className="space-y-5">
      <PortalPageHeader
        icon="payments"
        title="Thanh toán và hoàn tiền"
        description="Giao dịch học phí qua VNPay hoặc ví và các lần hoàn tiền cho học viên."
      />
      <label className="block max-w-sm text-sm">
        Trạng thái
        <Select
          className={PORTAL_INPUT}
          value={status}
          onChange={(event) => {
            setStatus(event.target.value as PaymentStatus | "");
            setPage(0);
          }}
        >
          <option value="">Tất cả</option>
          {Object.entries(STATUSES).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </Select>
      </label>
      {payments.isPending && <p>Đang tải giao dịch…</p>}
      {payments.isError && (
        <AuthNotice tone="error">
          Không tải được giao dịch. <button onClick={() => void payments.refetch()}>Thử lại</button>
        </AuthNotice>
      )}
      {payments.data?.content.length === 0 && <p>Chưa có giao dịch phù hợp.</p>}
      {payments.data && payments.data.content.length > 0 && (
        <div className="overflow-x-auto rounded-sm border border-brand-sandLine bg-white">
          <table className="w-full min-w-[920px] table-fixed border-collapse text-left">
            <thead className="bg-brand-sand/70 text-[11.5px] font-bold uppercase tracking-wide text-brand-muted">
              <tr>
                <th scope="col" className="w-[13%] px-4 py-3">Mã giao dịch</th>
                <th scope="col" className="w-[13%] border-l border-brand-sandLine px-4 py-3">Học viên</th>
                <th scope="col" className="w-[12%] border-l border-brand-sandLine px-4 py-3">Lớp</th>
                <th scope="col" className="w-[11%] border-l border-brand-sandLine px-4 py-3">Hình thức</th>
                <th scope="col" className="w-[16%] border-l border-brand-sandLine px-4 py-3 text-right">Số tiền</th>
                <th scope="col" className="w-[15%] border-l border-brand-sandLine px-4 py-3 text-right">Đã hoàn</th>
                <th scope="col" className="w-[15%] border-l border-brand-sandLine px-4 py-3">Trạng thái</th>
                <th scope="col" className="w-[5%] border-l border-brand-sandLine px-2 py-3">
                  <span className="sr-only">Chi tiết</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {payments.data.content.map((payment) => (
                <PaymentRow
                  key={payment.paymentId}
                  payment={payment}
                  open={openId === payment.paymentId}
                  onToggle={() => setOpenId((current) => (current === payment.paymentId ? null : payment.paymentId))}
                  onUpdated={() => {
                    void cache.invalidateQueries({ queryKey: ["admin-payments"] });
                    void cache.invalidateQueries({ queryKey: ["wallet"] });
                    void cache.invalidateQueries({ queryKey: ["wallet-history"] });
                  }}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
      {payments.data && payments.data.totalPages > 1 && (
        <div className="flex items-center gap-3">
          <button className={PORTAL_BTN_SECONDARY} disabled={page === 0} onClick={() => setPage(page - 1)}>
            Trang trước
          </button>
          <span>
            {page + 1}/{payments.data.totalPages}
          </span>
          <button className={PORTAL_BTN_SECONDARY} disabled={page + 1 >= payments.data.totalPages} onClick={() => setPage(page + 1)}>
            Trang sau
          </button>
        </div>
      )}
    </div>
  );
}

// Một giao dịch: dòng tóm tắt, mở ra là phần hoàn tiền và đối soát với VNPay
function PaymentRow({ payment, open, onToggle, onUpdated }: PaymentCardProps & { open: boolean; onToggle: () => void }) {
  const [reason, setReason] = useState("");
  const [percentage, setPercentage] = useState(100);
  const [message, setMessage] = useState("");
  const attempt = useRef<{ fingerprint: string; key: string } | null>(null);
  const refund = payment.refunds[0];
  const action = useMutation({
    mutationFn: async (operation: "refund" | "reconcile" | "retry") => {
      if (operation !== "refund") return updateRefund(refund.refundId, operation);
      const fingerprint = `${percentage}:${reason.trim()}`;
      if (attempt.current?.fingerprint !== fingerprint) attempt.current = { fingerprint, key: crypto.randomUUID() };
      return refundPayment(payment, reason.trim(), percentage, attempt.current.key);
    },
    onSuccess: (result) => {
      setMessage(
        result.status === "COMPLETED"
          ? "Đã hoàn tiền và cập nhật quyền học."
          : result.status === "FAILED"
            ? "VNPay từ chối yêu cầu hoàn tiền. Kiểm tra cấu hình và giao dịch trước khi thử lại."
            : "Yêu cầu đang chờ xác nhận. Đối soát trước khi thực hiện yêu cầu khác.",
      );
      onUpdated();
    },
  });
  const code = getApiError(action.error).errorCode;
  const error =
    code === "INVALID_REFUND_PERCENTAGE"
      ? "Trường hợp này cần hoàn 100%."
      : code === "PAYMENT_GATEWAY_DISABLED"
        ? "Cổng VNPay chưa được cấu hình đầy đủ."
        : code === "REFUND_ALREADY_SETTLED"
          ? "Yêu cầu hoàn tiền đã tồn tại hoặc chưa được phép thử lại."
          : "Không xử lý được yêu cầu hoàn tiền. Vui lòng kiểm tra và thử lại.";
  return (
    <Fragment>
      <tr className={`border-t border-brand-sandLine ${open ? "bg-brand-tint/50" : "hover:bg-brand-sand/50"}`}>
        <td className="h-14 px-4 py-2 align-middle">
          <span className="text-[14px] font-bold tabular-nums text-brand-navy">{displayCode("payment", payment.paymentId)}</span>
        </td>
        <td className="border-l border-brand-sandLine px-4 py-2 align-middle">
          <span className="text-[14px] tabular-nums text-brand-ink">{displayCode("student", payment.studentId)}</span>
        </td>
        <td className="border-l border-brand-sandLine px-4 py-2 align-middle">
          <span className="text-[14px] tabular-nums text-brand-ink">{displayCode("class", payment.classGroupId)}</span>
        </td>
        <td className="border-l border-brand-sandLine px-4 py-2 align-middle">
          <span className="text-[14px] text-brand-ink">{payment.method}</span>
        </td>
        <td className="border-l border-brand-sandLine px-4 py-2 text-right align-middle">
          <span className="text-[14px] font-bold tabular-nums text-brand-ink">{formatVnd(payment.amount)}</span>
        </td>
        <td className="border-l border-brand-sandLine px-4 py-2 text-right align-middle">
          <span className={`text-[14px] tabular-nums ${payment.refundedAmount > 0 ? "font-semibold text-red-700" : "text-brand-muted"}`}>
            {formatVnd(payment.refundedAmount)}
          </span>
        </td>
        <td className="border-l border-brand-sandLine px-4 py-2 align-middle">
          <span className="text-[13.5px] font-semibold text-brand-ink">{STATUSES[payment.status]}</span>
        </td>
        <td className="border-l border-brand-sandLine px-2 py-2 text-center align-middle">
          <button
            type="button"
            onClick={onToggle}
            aria-expanded={open}
            aria-label={`${open ? "Đóng" : "Mở"} chi tiết giao dịch ${displayCode("payment", payment.paymentId)}`}
            className="inline-flex h-8 w-8 items-center justify-center rounded-sm text-slate-400 hover:bg-brand-sand hover:text-brand-navy focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-navy"
          >
            <Icon name="expand_more" className={`text-[21px] transition-transform ${open ? "rotate-180" : ""}`} />
          </button>
        </td>
      </tr>
      {open && (
        <tr className="border-t border-brand-sandLine bg-brand-tint/30">
          <td colSpan={8} className="space-y-3 px-4 py-3">
      <p className="break-all text-xs text-brand-muted">Mã giao dịch: {payment.transactionRef}</p>
      {payment.status === "REQUIRES_REFUND" && (
        <AuthNotice tone="info">Đã nhận tiền nhưng chưa ghi danh. Cần hoàn toàn bộ học phí.</AuthNotice>
      )}
      {refund && (
        <p className="text-sm">
          Hoàn tiền {displayCode("refund", refund.refundId)}:{" "}
          {refund.status === "COMPLETED"
            ? TRANSACTION_STATUS.REFUNDED.label
            : refund.status === "FAILED"
              ? TRANSACTION_STATUS.FAILED.label
              : "Đang xử lý"}{" "}
          - {formatVnd(refund.amount)}
        </p>
      )}
      {message && <AuthNotice tone="info">{message}</AuthNotice>}
      {action.isError && <AuthNotice tone="error">{error}</AuthNotice>}
      {!refund && ["COMPLETED", "REQUIRES_REFUND"].includes(payment.status) && (
        <form
          className="flex flex-wrap items-end gap-3"
          onSubmit={(event) => {
            event.preventDefault();
            action.mutate("refund");
          }}
        >
          <label className="min-w-48 flex-1 text-sm">
            Lý do hoàn tiền
            <input className={PORTAL_INPUT} required maxLength={1000} value={reason} onChange={(event) => setReason(event.target.value)} />
          </label>
          <label className="w-28 text-sm">
            Tỷ lệ (%)
            <input
              className={PORTAL_INPUT}
              type="number"
              min={1}
              max={100}
              step={1}
              required
              disabled={payment.status === "REQUIRES_REFUND"}
              value={percentage}
              onChange={(event) => setPercentage(Number(event.target.value))}
            />
          </label>
          <button className={PORTAL_BTN_PRIMARY} disabled={action.isPending || !reason.trim()}>
            Yêu cầu hoàn tiền
          </button>
        </form>
      )}
      {payment.method === "VNPAY" && refund && refund.status !== "COMPLETED" && (
        <div className="flex flex-wrap gap-3">
          <button className={PORTAL_BTN_SECONDARY} disabled={action.isPending} onClick={() => action.mutate("reconcile")}>
            Đối soát với VNPay
          </button>
          {refund.status === "FAILED" && (
            <button className={PORTAL_BTN_PRIMARY} disabled={action.isPending} onClick={() => action.mutate("retry")}>
              Gửi lại yêu cầu bị từ chối
            </button>
          )}
        </div>
      )}
          </td>
        </tr>
      )}
    </Fragment>
  );
}
