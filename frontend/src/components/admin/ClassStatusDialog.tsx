import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useMutation } from "@tanstack/react-query";
import { PortalDialog } from "@/components/dashboard/PortalDialog";
import { Icon } from "@/components/ui/Icon";
import { AUTH_ERROR, FOCUS_RING, PORTAL_BTN_PRIMARY, PORTAL_BTN_SECONDARY, PORTAL_INPUT, PORTAL_LABEL } from "@/constants/classNames";
import { changeClassStatus, reopenClass } from "@/services/managementService";
import { classStatusActions } from "@/utils/classes";
import { addDays, startOfToday, toIsoDate } from "@/utils/date";
import { portalErrorMessage } from "@/utils/errors";
import type { AdminClassResponse } from "@/interfaces/api";
import type { ClassStatusDialogProps } from "@/interfaces/admin";
import { DateField } from "@/components/ui/DateField";

/**
 * Cập nhật lớp: chỉ đưa ra các bước hợp lệ lúc này (Mở đăng ký, Chốt lớp, Bắt đầu học, Kết thúc, Hủy…)
 * rồi gọi PATCH /admin/classes/{id}/status lần lượt; hoặc mở lại lớp không đủ sĩ số (POST /admin/classes/{id}/reopen).
 */
export function ClassStatusDialog({ classItem, mode, onClose, onSaved }: ClassStatusDialogProps) {
  const actions = useMemo(() => (classItem ? classStatusActions(classItem, new Date()) : []), [classItem]);
  const [actionKey, setActionKey] = useState("");
  const [reason, setReason] = useState("");
  const [startDate, setStartDate] = useState(toIsoDate(addDays(startOfToday(), 14)));
  const [deadline, setDeadline] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const action = actions.find((item) => item.key === actionKey) ?? actions[0];

  useEffect(() => {
    if (!classItem) return;
    setFormError(null);
    setReason("");
    setDeadline("");
    setActionKey("");
  }, [classItem]);

  const save = useMutation({
    mutationFn: async () => {
      const id = (classItem as NonNullable<typeof classItem>).id;
      if (mode === "reopen") return reopenClass(id, { startDate, enrollmentDeadline: deadline || undefined, reason: reason.trim() });
      let updated: AdminClassResponse | undefined;
      for (const target of action.targets) {
        updated = await changeClassStatus(id, { newStatus: target, reason: reason.trim() || undefined });
      }
      return updated as AdminClassResponse;
    },
    onSuccess: (saved) => onSaved(saved),
    onError: (error) => setFormError(portalErrorMessage(error, "Chưa cập nhật được lớp. Vui lòng thử lại.")),
  });

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (mode === "reopen" && !reason.trim()) return setFormError("Hãy nhập lý do mở lại lớp.");
    if (mode === "reopen" && deadline && deadline > startDate) return setFormError("Hạn đăng ký phải trước hoặc bằng ngày khai giảng.");
    if (mode === "status" && !action) return;
    if (mode === "status" && action.danger && !reason.trim()) return setFormError("Hãy nhập lý do hủy lớp.");
    setFormError(null);
    save.mutate();
  }

  const showReason = mode === "reopen" || action?.danger;

  return (
    <PortalDialog
      open={classItem !== null}
      onClose={onClose}
      title={mode === "reopen" ? "Mở lại lớp" : "Cập nhật lớp"}
      description={classItem ? `${classItem.classCode} - ${classItem.courseName}` : undefined}
    >
      {classItem && (
        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          {mode === "status" ? (
            actions.length === 0 ? (
              <p className="rounded-xl bg-slate-50 px-4 py-3 text-[14px] text-brand-muted">Lớp chưa có bước nào cần làm lúc này.</p>
            ) : (
              <div role="radiogroup" aria-label="Thao tác" className="space-y-2">
                {actions.map((item) => {
                  const selected = action?.key === item.key;
                  return (
                    <button
                      key={item.key}
                      type="button"
                      role="radio"
                      aria-checked={selected}
                      onClick={() => setActionKey(item.key)}
                      className={`flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left transition-colors ${FOCUS_RING} ${
                        selected
                          ? item.danger
                            ? "border-red-300 bg-red-50 ring-1 ring-red-300"
                            : "border-brand-navy bg-brand-tint ring-1 ring-brand-navy"
                          : "border-brand-sandLine bg-white hover:border-brand-navy/40"
                      }`}
                    >
                      <Icon name={item.icon} className={`text-[21px] ${item.danger ? "text-red-600" : "text-brand-navy"}`} />
                      <span className="min-w-0">
                        <span className={`block text-[14.5px] font-semibold ${item.danger ? "text-red-700" : "text-brand-ink"}`}>{item.label}</span>
                        <span className="block text-[12.5px] text-brand-muted">{item.hint}</span>
                      </span>
                    </button>
                  );
                })}
              </div>
            )
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="reopen-start" className={PORTAL_LABEL}>
                  Ngày khai giảng mới
                </label>
                <DateField
                  id="reopen-start"
                  value={startDate}
                  onChange={(value) => setStartDate(value)}
                  className={PORTAL_INPUT}
                />
              </div>
              <div>
                <label htmlFor="reopen-deadline" className={PORTAL_LABEL}>
                  Hạn đăng ký mới
                </label>
                <DateField
                  id="reopen-deadline"
                  value={deadline}
                  onChange={(value) => setDeadline(value)}
                  className={PORTAL_INPUT}
                />
              </div>
            </div>
          )}

          {showReason && (
            <div>
              <label htmlFor="class-reason" className={PORTAL_LABEL}>
                Lý do
              </label>
              <textarea
                id="class-reason"
                rows={2}
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                className={`${PORTAL_INPUT} h-auto py-2`}
              />
            </div>
          )}

          {formError && (
            <p role="alert" className={`${AUTH_ERROR} flex items-center gap-1.5`}>
              <Icon name="error" className="text-[17px]" />
              {formError}
            </p>
          )}

          <div className="flex justify-end gap-2 border-t border-brand-sandLine pt-4">
            <button type="button" onClick={onClose} className={PORTAL_BTN_SECONDARY}>
              Đóng
            </button>
            {(mode === "reopen" || action) && (
              <button
                type="submit"
                disabled={save.isPending}
                className={action?.danger && mode === "status" ? `${PORTAL_BTN_PRIMARY} !bg-red-600 hover:!bg-red-700` : PORTAL_BTN_PRIMARY}
              >
                {save.isPending ? "Đang lưu…" : mode === "reopen" ? "Mở lại lớp" : action.label}
              </button>
            )}
          </div>
        </form>
      )}
    </PortalDialog>
  );
}
