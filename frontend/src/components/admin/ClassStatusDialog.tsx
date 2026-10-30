import { useEffect, useState, type FormEvent } from "react";
import { useMutation } from "@tanstack/react-query";
import { PortalDialog } from "@/components/dashboard/PortalDialog";
import { StatusChip } from "@/components/dashboard/StatusChip";
import { Icon } from "@/components/ui/Icon";
import { AUTH_ERROR, PORTAL_BTN_PRIMARY, PORTAL_BTN_SECONDARY, PORTAL_INPUT, PORTAL_LABEL } from "@/constants/classNames";
import { CLASS_STATUS } from "@/constants/labels";
import { changeClassStatus, reopenClass } from "@/services/managementService";
import { addDays, startOfToday, toIsoDate } from "@/utils/date";
import { portalErrorMessage } from "@/utils/errors";
import type { ClassStatus } from "@/interfaces/api";
import type { ClassStatusDialogProps } from "@/interfaces/admin";

/**
 * Các bước chuyển mà ClassService.changeStatus chấp nhận (bước đầu tiên là gợi ý mặc định).
 * Lớp FAILED_TO_OPEN mở lại qua API riêng; ASSIGNED → IN_PROGRESS và IN_PROGRESS → COMPLETED
 * cũng được hệ thống tự chuyển khi đủ điều kiện.
 */
const ALLOWED_STATUS: Partial<Record<ClassStatus, ClassStatus[]>> = {
  DRAFT: ["PUBLISHED", "CANCELLED"],
  PUBLISHED: ["ENROLLING", "CANCELLED"],
  ENROLLING: ["FAILED_TO_OPEN", "ASSIGNED", "CANCELLED"],
  FAILED_TO_OPEN: ["CANCELLED"],
  ASSIGNED: ["IN_PROGRESS", "CANCELLED"],
  IN_PROGRESS: ["COMPLETED"],
};

/**
 * Đổi trạng thái lớp (PATCH /admin/classes/{id}/status) hoặc mở lại lớp không đủ sĩ số
 * (POST /admin/classes/{id}/reopen). Backend tự chặn các bước chuyển không hợp lệ.
 */
export function ClassStatusDialog({ classItem, mode, onClose, onSaved }: ClassStatusDialogProps) {
  const [newStatus, setNewStatus] = useState<ClassStatus>("PUBLISHED");
  const [reason, setReason] = useState("");
  const [startDate, setStartDate] = useState(toIsoDate(addDays(startOfToday(), 14)));
  const [deadline, setDeadline] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (!classItem) return;
    setFormError(null);
    setReason("");
    setDeadline("");
    setNewStatus(ALLOWED_STATUS[classItem.status]?.[0] ?? classItem.status);
  }, [classItem]);

  const save = useMutation({
    mutationFn: () => {
      const id = (classItem as NonNullable<typeof classItem>).id;
      return mode === "reopen"
        ? reopenClass(id, { startDate, enrollmentDeadline: deadline || undefined, reason: reason.trim() })
        : changeClassStatus(id, { newStatus, reason: reason.trim() || undefined });
    },
    onSuccess: (saved) => onSaved(saved),
    onError: (error) => setFormError(portalErrorMessage(error, "Chưa cập nhật được lớp. Vui lòng thử lại.")),
  });

  const options = classItem ? (ALLOWED_STATUS[classItem.status] ?? []) : [];

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (mode === "reopen" && !reason.trim()) return setFormError("Hãy nhập lý do mở lại lớp.");
    if (mode === "reopen" && deadline && deadline > startDate) return setFormError("Hạn đăng ký phải trước hoặc bằng ngày khai giảng.");
    if (mode === "status" && !options.includes(newStatus)) return setFormError("Hãy chọn trạng thái mới cho lớp.");
    if (mode === "status" && newStatus === "CANCELLED" && !reason.trim()) return setFormError("Hãy nhập lý do hủy lớp.");
    setFormError(null);
    save.mutate();
  }


  return (
    <PortalDialog
      open={classItem !== null}
      onClose={onClose}
      title={mode === "reopen" ? "Mở lại lớp" : "Đổi trạng thái lớp"}
      description={classItem ? `${classItem.classCode} · ${classItem.courseName}` : undefined}
    >
      {classItem && (
        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          <p className="flex items-center gap-2 text-[14px] text-brand-muted">
            Hiện tại:
            <StatusChip tone={CLASS_STATUS[classItem.status].tone} icon={CLASS_STATUS[classItem.status].icon}>
              {CLASS_STATUS[classItem.status].label}
            </StatusChip>
          </p>

          {mode === "status" ? (
            <fieldset>
              <legend className={PORTAL_LABEL}>Chuyển sang</legend>
              <div className="grid gap-2 sm:grid-cols-2">
                {options.length === 0 && (
                  <p className="text-[14px] text-brand-muted sm:col-span-2">Lớp ở trạng thái này không thể chuyển tiếp.</p>
                )}
                {options.map((status, index) => (
                  <button
                    key={status}
                    type="button"
                    role="radio"
                    aria-checked={newStatus === status}
                    onClick={() => setNewStatus(status)}
                    className={`flex items-center gap-2 rounded-xl border px-3 py-2.5 text-left text-[14px] font-semibold transition-colors ${
                      newStatus === status
                        ? "border-brand-navy bg-brand-tint text-brand-navy ring-1 ring-brand-navy"
                        : "border-brand-sandLine bg-white text-brand-ink hover:border-brand-navy/40"
                    }`}
                  >
                    <Icon name={CLASS_STATUS[status].icon} className="text-[19px]" />
                    {CLASS_STATUS[status].label}
                    {index === 0 && options.length > 1 && (
                      <span className="ml-auto rounded-full bg-brand-orange/15 px-2 py-0.5 text-[11px] font-bold text-brand-orangeHover">
                        Gợi ý
                      </span>
                    )}
                  </button>
                ))}
              </div>
              {newStatus === "PUBLISHED" && (
                <p className="mt-2 flex items-start gap-1.5 text-[13px] text-brand-muted">
                  <Icon name="info" className="text-[17px] text-brand-navy" />
                  Đăng lớp sẽ sinh lịch toàn bộ buổi học theo lịch và ca đã chọn.
                </p>
              )}
            </fieldset>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="reopen-start" className={PORTAL_LABEL}>
                  Ngày khai giảng mới
                </label>
                <input
                  id="reopen-start"
                  type="date"
                  value={startDate}
                  onChange={(event) => setStartDate(event.target.value)}
                  className={PORTAL_INPUT}
                />
              </div>
              <div>
                <label htmlFor="reopen-deadline" className={PORTAL_LABEL}>
                  Hạn đăng ký mới
                </label>
                <input
                  id="reopen-deadline"
                  type="date"
                  value={deadline}
                  onChange={(event) => setDeadline(event.target.value)}
                  className={PORTAL_INPUT}
                />
              </div>
            </div>
          )}

          <div>
            <label htmlFor="class-reason" className={PORTAL_LABEL}>
              Lý do {mode === "status" && newStatus !== "CANCELLED" && <span className="font-normal">(không bắt buộc)</span>}
            </label>
            <textarea
              id="class-reason"
              rows={2}
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              className={`${PORTAL_INPUT} h-auto py-2`}
            />
          </div>

          {formError && (
            <p role="alert" className={`${AUTH_ERROR} flex items-center gap-1.5`}>
              <Icon name="error" className="text-[17px]" />
              {formError}
            </p>
          )}

          <div className="flex justify-end gap-2 border-t border-brand-sandLine pt-4">
            <button type="button" onClick={onClose} className={PORTAL_BTN_SECONDARY}>
              Hủy
            </button>
            <button type="submit" disabled={save.isPending} className={PORTAL_BTN_PRIMARY}>
              {save.isPending ? "Đang lưu…" : mode === "reopen" ? "Mở lại lớp" : "Cập nhật"}
            </button>
          </div>
        </form>
      )}
    </PortalDialog>
  );
}
