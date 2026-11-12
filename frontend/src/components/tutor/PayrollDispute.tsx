import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { PortalDialog } from "@/components/dashboard/PortalDialog";
import { Icon } from "@/components/ui/Icon";
import { PORTAL_BTN_ACCENT, PORTAL_BTN_SECONDARY, PORTAL_INPUT, PORTAL_LABEL } from "@/constants/classNames";
import { monthLabel } from "@/constants/management";
import { queryKeys } from "@/constants/queryKeys";
import { useUserId } from "@/hooks/usePortalData";
import type { PayrollDisputeProps } from "@/interfaces/portal";
import { disputePayroll } from "@/services/managementService";
import { formatVnd } from "@/utils/currency";
import { portalErrorMessage } from "@/utils/errors";

// Giới hạn lý do khiếu nại của backend
const REASON_MIN = 10;
const REASON_MAX = 1000;

// Khiếu nại một phiếu lương đã chốt (PAYR-02): gia sư điền lý do, phiếu chuyển sang "Đang khiếu nại"
// và trung tâm nhận email. Phiếu đã khiếu nại thì hiện lại lý do đã gửi.
// API: POST /tutor/payroll/{year}/{month}/dispute.
export function PayrollDispute({ line }: PayrollDisputeProps) {
  const userId = useUserId();
  const cache = useQueryClient();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const send = useMutation({
    mutationFn: () => disputePayroll(line.year, line.month, reason.trim()),
    meta: {
      invalidates: [
        queryKeys.me.payroll(userId),
        queryKeys.admin.payroll(line.year, line.month),
        queryKeys.admin.allPayroll,
      ],
    },
    onSuccess: () => {
      setOpen(false);
      setReason("");
      void cache.invalidateQueries({ queryKey: queryKeys.me.payroll(userId) });
      void cache.invalidateQueries({ queryKey: queryKeys.admin.allPayroll });
      void cache.invalidateQueries({ queryKey: queryKeys.admin.payroll(line.year, line.month) });
    },
  });
  const length = reason.trim().length;

  if (line.status === "DISPUTED") {
    return (
      <div className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-[13.5px] text-red-900">
        <p className="flex items-center gap-1.5 font-semibold">
          <Icon name="report" className="text-[17px]" />
          Đã gửi khiếu nại{line.disputedAt && ` lúc ${new Date(line.disputedAt).toLocaleString("vi-VN")}`}. Trung tâm sẽ liên hệ lại.
        </p>
        <p className="mt-1 whitespace-pre-line break-words">{line.disputeReason}</p>
      </div>
    );
  }
  if (line.status !== "FINALIZED") return null;

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={`mt-3 ${PORTAL_BTN_SECONDARY}`}>
        <Icon name="report" className="text-[18px]" />
        Khiếu nại bảng lương
      </button>
      <PortalDialog
        open={open}
        onClose={() => setOpen(false)}
        title={`Khiếu nại lương ${monthLabel(line.year, line.month).toLowerCase()}`}
        description={`Thực nhận đã chốt ${formatVnd(line.totalPay)}. Trung tâm nhận email và kiểm tra lại phiếu lương này.`}
      >
        <form
          className="space-y-4"
          onSubmit={(event) => {
            event.preventDefault();
            if (length >= REASON_MIN) send.mutate();
          }}
        >
          <div>
            <label htmlFor={`dispute-${line.year}-${line.month}`} className={PORTAL_LABEL}>
              Lý do khiếu nại
            </label>
            <textarea
              id={`dispute-${line.year}-${line.month}`}
              rows={5}
              maxLength={REASON_MAX}
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              placeholder="Ví dụ: buổi ngày 12/10 tôi đã dạy nhưng chưa được tính."
              className={`${PORTAL_INPUT} h-auto resize-y py-2 leading-relaxed`}
            />
            <p className="mt-1 text-right text-[12.5px] text-brand-muted">
              {length}/{REASON_MAX} ký tự{length < REASON_MIN && ` - tối thiểu ${REASON_MIN}`}
            </p>
          </div>
          {send.error && (
            <p role="alert" className="flex items-center gap-1.5 text-[14px] font-medium text-red-700">
              <Icon name="error" className="text-[18px]" />
              {portalErrorMessage(send.error, "Chưa gửi được khiếu nại. Vui lòng thử lại.")}
            </p>
          )}
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setOpen(false)} className={PORTAL_BTN_SECONDARY}>
              Để sau
            </button>
            <button type="submit" disabled={length < REASON_MIN || send.isPending} className={PORTAL_BTN_ACCENT}>
              <Icon name="send" className="text-[18px]" />
              {send.isPending ? "Đang gửi…" : "Gửi khiếu nại"}
            </button>
          </div>
        </form>
      </PortalDialog>
    </>
  );
}
