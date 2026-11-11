import { useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AuthNotice } from "@/components/auth/AuthNotice";
import { PortalPageHeader } from "@/components/dashboard/PortalPageHeader";
import { PORTAL_BTN_PRIMARY, PORTAL_BTN_SECONDARY, PORTAL_CARD, PORTAL_INPUT } from "@/constants/classNames";
import type { PaymentCardProps } from "@/interfaces/admin";
import type { PaymentStatus } from "@/interfaces/api";
import { getApiError } from "@/services/api";
import { listPayments, refundPayment, updateRefund } from "@/services/tuitionPaymentService";
import { formatVnd } from "@/utils/currency";
import { displayCode } from "@/utils/classes";
import { Select } from "@/components/ui/Select";

/** Tên trạng thái giao dịch */
const STATUSES: Record<PaymentStatus, string> = {
  COMPLETED: "Đã thanh toán",
  FAILED: "Thất bại",
  REQUIRES_REFUND: "Cần hoàn tiền",
  PARTIALLY_REFUNDED: "Hoàn một phần",
  REFUNDED: "Đã hoàn tiền",
};

/** Trang Thanh toán của quản trị: xem giao dịch học phí theo trạng thái và hoàn tiền (GET /admin/payments). */
export function AdminPaymentsPage() {
  const cache = useQueryClient();
  const [status, setStatus] = useState<PaymentStatus | "">("");
  const [page, setPage] = useState(0);
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
      <div className="space-y-4">
        {payments.data?.content.map((payment) => (
          <PaymentCard
            key={payment.paymentId}
            payment={payment}
            onUpdated={() => {
              void cache.invalidateQueries({ queryKey: ["admin-payments"] });
              void cache.invalidateQueries({ queryKey: ["wallet"] });
              void cache.invalidateQueries({ queryKey: ["wallet-history"] });
            }}
          />
        ))}
      </div>
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

/** Một giao dịch: thông tin, yêu cầu hoàn tiền, đối soát / gửi lại với VNPay */
function PaymentCard({ payment, onUpdated }: PaymentCardProps) {
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
    <section className={`${PORTAL_CARD} space-y-3 p-5`}>
      <h2 className="font-bold text-brand-navy">
        Giao dịch {displayCode("payment", payment.paymentId)} - {STATUSES[payment.status]}
      </h2>
      <p className="text-sm">
        Học viên {displayCode("student", payment.studentId)} - Lớp {displayCode("class", payment.classGroupId)} - {payment.method}
      </p>
      <p>
        {formatVnd(payment.amount)} - Đã hoàn {formatVnd(payment.refundedAmount)}
      </p>
      <p className="break-all text-xs text-brand-muted">Mã giao dịch: {payment.transactionRef}</p>
      {payment.status === "REQUIRES_REFUND" && (
        <AuthNotice tone="info">Đã nhận tiền nhưng chưa ghi danh. Cần hoàn toàn bộ học phí.</AuthNotice>
      )}
      {refund && (
        <p className="text-sm">
          Hoàn tiền {displayCode("refund", refund.refundId)}:{" "}
          {refund.status === "COMPLETED" ? "Đã hoàn" : refund.status === "FAILED" ? "Bị từ chối" : "Chờ xác nhận"} -{" "}
          {formatVnd(refund.amount)}
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
    </section>
  );
}
