import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { AuthNotice } from "@/components/auth/AuthNotice";
import { AUTH_LABEL, PORTAL_BTN_PRIMARY, PORTAL_BTN_SECONDARY, PORTAL_INPUT } from "@/constants/classNames";
import { createMakeup } from "@/services/adminService";
import { startOfToday, toIsoDate } from "@/utils/date";
import { portalErrorMessage } from "@/utils/errors";
import type { MakeupFormProps } from "@/interfaces/admin";
import { DateField } from "@/components/ui/DateField";
import { TimeField } from "@/components/ui/TimeField";

// Form chọn ngày giờ học bù cho một buổi (theo đơn xin nghỉ, hoặc cho buổi đã hủy khi không có đơn)
export function MakeupForm({ idPrefix, sessionId, leaveRequestId, note, onDone, onCancel }: MakeupFormProps) {
  const [makeupDate, setMakeupDate] = useState("");
  const [startTime, setStartTime] = useState("18:00");
  const [endTime, setEndTime] = useState("20:00");
  const makeup = useMutation({
    mutationFn: () =>
      createMakeup(sessionId, {
        ...(leaveRequestId !== undefined && { leaveRequestId }),
        makeupDate,
        startTime: `${startTime}:00`,
        endTime: `${endTime}:00`,
      }),
    onSuccess: onDone,
  });
  const makeupValid = makeupDate !== "" && startTime < endTime;

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        if (makeupValid) makeup.mutate();
      }}
      className="space-y-3 rounded-xl border border-brand-sandLine bg-white p-3.5"
    >
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div>
          <label htmlFor={`${idPrefix}-date`} className={`mb-1.5 ${AUTH_LABEL}`}>
            Ngày học bù
          </label>
          <DateField
            id={`${idPrefix}-date`}
            required
            min={toIsoDate(startOfToday())}
            value={makeupDate}
            onChange={(value) => setMakeupDate(value)}
            className={PORTAL_INPUT}
          />
        </div>
        <div>
          <label htmlFor={`${idPrefix}-start`} className={`mb-1.5 ${AUTH_LABEL}`}>
            Từ
          </label>
          <TimeField
            id={`${idPrefix}-start`}
            required
            value={startTime}
            onChange={(value) => setStartTime(value)}
            className={PORTAL_INPUT}
          />
        </div>
        <div>
          <label htmlFor={`${idPrefix}-end`} className={`mb-1.5 ${AUTH_LABEL}`}>
            Đến
          </label>
          <TimeField
            id={`${idPrefix}-end`}
            required
            value={endTime}
            onChange={(value) => setEndTime(value)}
            className={PORTAL_INPUT}
          />
        </div>
      </div>
      <p className="text-[13.5px] text-brand-muted">{note}</p>
      {makeup.error && <AuthNotice tone="error">{portalErrorMessage(makeup.error, "Chưa xếp được buổi học bù. Vui lòng thử lại.")}</AuthNotice>}
      <div className="flex flex-wrap gap-2">
        <button type="submit" disabled={!makeupValid || makeup.isPending} className={PORTAL_BTN_PRIMARY}>
          {makeup.isPending ? "Đang xếp…" : "Xếp buổi học bù"}
        </button>
        <button type="button" onClick={onCancel} disabled={makeup.isPending} className={PORTAL_BTN_SECONDARY}>
          Thôi
        </button>
      </div>
    </form>
  );
}
