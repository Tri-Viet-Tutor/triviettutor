import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery } from "@tanstack/react-query";
import { PortalDialog } from "@/components/dashboard/PortalDialog";
import { Icon } from "@/components/ui/Icon";
import { UserAvatar } from "@/components/ui/UserAvatar";
import { AUTH_ERROR, FOCUS_RING, PORTAL_BTN_PRIMARY, PORTAL_BTN_SECONDARY } from "@/constants/classNames";
import { patternLabel } from "@/constants/management";
import { ROUTES } from "@/constants/routes";
import type { EnrollmentResponse, TuitionClass } from "@/interfaces/dto";
import { transferEnrollment } from "@/services/managementService";
import { listTuitionClasses } from "@/services/tuitionPaymentService";
import { walletService } from "@/services/walletService";
import { useAuthStore } from "@/stores/authStore";
import { formatVnd } from "@/utils/currency";
import { formatDate, parseIsoDate, startOfToday, toIsoDate } from "@/utils/date";
import { portalErrorMessage } from "@/utils/errors";

// Ngày dạng dd/mm/yyyy từ chuỗi ISO
const dateText = (iso: string) => formatDate(parseIsoDate(iso));

// Lớp nhận đổi: cùng khóa, khác lớp hiện tại, đang tuyển sinh, còn chỗ và chưa qua hạn chốt
function isTarget(item: TuitionClass, current: TuitionClass, todayIso: string) {
  const sameCourse = current.courseId != null ? item.courseId === current.courseId : item.courseName === current.courseName;
  return (
    sameCourse &&
    item.id !== current.id &&
    item.status === "ENROLLING" &&
    !item.full &&
    item.spotsLeft > 0 &&
    (!item.enrollmentDeadline || item.enrollmentDeadline >= todayIso)
  );
}

// Khung đổi lớp: chọn một lớp khác cùng khóa (thường do thầy cô khác dạy) còn trước hạn chốt.
// Học phí lớp cũ hoàn vào ví rồi trừ học phí lớp mới, nên phần chênh lệch hiện ngay trên từng lớp.
// Mỗi lớp đã đăng ký chỉ đổi được một lần. API: POST /enrollments/{id}/transfer.
export function TransferClassDialog({
  enrollment,
  current,
  onClose,
  onDone,
}: {
  enrollment: EnrollmentResponse | null;
  current: TuitionClass | undefined;
  onClose: () => void;
  onDone: (message: string) => void;
}) {
  const userId = useAuthStore((state) => state.user?.id);
  const open = enrollment !== null && current !== undefined;
  const [targetId, setTargetId] = useState<number | null>(null);
  const todayIso = toIsoDate(startOfToday());

  const options = useQuery({
    queryKey: ["transfer-options", current?.courseId ?? current?.courseName, current?.gradeLevel],
    queryFn: () => listTuitionClasses({ subject: current!.subject, gradeLevel: current!.gradeLevel, size: 100 }),
    enabled: open,
  });
  const wallet = useQuery({ queryKey: ["wallet", userId], queryFn: walletService.getWallet, enabled: open });

  useEffect(() => {
    if (open) setTargetId(null);
  }, [open, enrollment?.enrollmentId]);

  const move = useMutation({
    mutationFn: () => transferEnrollment(enrollment!.enrollmentId, targetId!),
    onSuccess: () => {
      const target = targets.find((item) => item.id === targetId);
      onDone(`Đã đổi sang lớp ${target?.classCode ?? "mới"}. Lịch học đã cập nhật theo lớp mới.`);
    },
  });

  // Đóng khung đổi lớp và xóa lỗi đang hiện
  function close() {
    move.reset();
    onClose();
  }

  const targets = current ? (options.data?.content ?? []).filter((item) => isTarget(item, current, todayIso)) : [];
  const target = targets.find((item) => item.id === targetId);
  const paid = enrollment?.feeCharged ?? 0;
  const balance = wallet.data?.balance ?? 0;
  const diff = target ? target.estimatedFee - paid : 0;
  const balanceAfter = balance - diff;
  const short = target !== undefined && wallet.isSuccess && balanceAfter < 0;

  return (
    <PortalDialog
      open={open}
      onClose={close}
      title="Đổi sang lớp khác"
      description="Chọn một lớp khác của cùng khóa học còn trước hạn chốt. Mỗi lớp đã đăng ký chỉ đổi được một lần."
      widthClassName="max-w-[680px]"
    >
      {current && enrollment && (
        <div className="space-y-5">
          {
            // Lớp đang học
          }
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-brand-sandLine bg-brand-sand/50 px-4 py-3">
            <div className="flex min-w-0 items-center gap-3">
              <UserAvatar userId={current.tutorId ?? undefined} name={current.tutorName ?? "Gia sư"} size={40} />
              <div className="min-w-0">
                <p className="text-[12px] font-bold uppercase tracking-wide text-brand-muted">Lớp hiện tại</p>
                <p className="truncate text-[15px] font-bold text-brand-ink">
                  {current.classCode} - {current.tutorName ?? "Chưa có gia sư"}
                </p>
                <p className="text-[13px] text-brand-muted">
                  {patternLabel(current.schedulePattern)} - {current.timeSlotLabel}
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-[12px] font-semibold text-brand-muted">Đã đóng</p>
              <p className="text-[16px] font-extrabold tabular-nums text-brand-navy">{formatVnd(paid)}</p>
            </div>
          </div>

          {
            // Các lớp có thể đổi sang
          }
          <fieldset className="min-w-0">
            <legend className="mb-2 text-[14px] font-bold text-brand-ink">Chọn lớp muốn chuyển sang</legend>
            {options.isPending ? (
              <p className="py-6 text-center text-[14px] text-brand-muted">Đang tìm lớp cùng khóa…</p>
            ) : options.isError ? (
              <p className={AUTH_ERROR}>Không tải được danh sách lớp. Vui lòng thử lại.</p>
            ) : targets.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-brand-sandLine px-5 py-8 text-center">
                <Icon name="event_busy" className="text-[34px] text-brand-navy/40" />
                <p className="mt-1 text-[15px] font-bold text-brand-ink">Chưa có lớp nào khác để đổi.</p>
                <p className="text-[13.5px] text-brand-muted">Khóa này hiện không có lớp khác còn chỗ và còn hạn đăng ký.</p>
              </div>
            ) : (
              <ul className="max-h-[340px] space-y-2 overflow-y-auto pr-1">
                {targets.map((item) => {
                  const selected = item.id === targetId;
                  const change = item.estimatedFee - paid;
                  return (
                    <li key={item.id}>
                      <button
                        type="button"
                        role="radio"
                        aria-checked={selected}
                        onClick={() => setTargetId(item.id)}
                        className={`flex w-full items-start gap-3 rounded-2xl border px-4 py-3 text-left transition-colors ${FOCUS_RING} ${
                          selected ? "border-brand-navy bg-brand-tint ring-1 ring-brand-navy" : "border-brand-sandLine bg-white hover:border-brand-navy/40"
                        }`}
                      >
                        <span
                          aria-hidden="true"
                          className={`mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${
                            selected ? "border-brand-navy" : "border-slate-300"
                          }`}
                        >
                          {selected && <span className="h-2.5 w-2.5 rounded-full bg-brand-navy" />}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="flex flex-wrap items-center gap-2">
                            <UserAvatar userId={item.tutorId ?? undefined} name={item.tutorName ?? "Gia sư"} size={24} />
                            <span className="text-[15px] font-bold text-brand-ink">{item.tutorName ?? "Chưa có gia sư"}</span>
                            <span className="font-mono text-[12px] font-semibold text-brand-muted">{item.classCode}</span>
                          </span>
                          <span className="mt-1 block text-[13.5px] text-brand-ink">
                            {patternLabel(item.schedulePattern)} - {item.timeSlotLabel} - {item.totalSessions} buổi
                          </span>
                          <span className="block text-[12.5px] text-brand-muted">
                            Khai giảng {dateText(item.startDate)}
                            {item.enrollmentDeadline && ` - Hạn chốt ${dateText(item.enrollmentDeadline)}`} - Còn {item.spotsLeft} chỗ
                          </span>
                        </span>
                        <span className="shrink-0 text-right">
                          <span className="block text-[15px] font-extrabold tabular-nums text-brand-navy">{formatVnd(item.estimatedFee)}</span>
                          <span
                            className={`block text-[12px] font-semibold ${
                              change > 0 ? "text-orange-700" : change < 0 ? "text-emerald-700" : "text-brand-muted"
                            }`}
                          >
                            {change > 0 ? `Trả thêm ${formatVnd(change)}` : change < 0 ? `Hoàn ${formatVnd(-change)}` : "Không chênh lệch"}
                          </span>
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </fieldset>

          {
            // Tóm tắt bù trừ qua ví
          }
          {target && (
            <div className="rounded-2xl bg-brand-tint/60 px-4 py-3 text-[14px]">
              <dl className="space-y-1.5">
                <div className="flex justify-between gap-3">
                  <dt className="text-brand-muted">Hoàn học phí lớp {current.classCode} vào ví</dt>
                  <dd className="font-semibold tabular-nums text-emerald-700">+{formatVnd(paid)}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-brand-muted">Trừ học phí lớp {target.classCode} từ ví</dt>
                  <dd className="font-semibold tabular-nums text-brand-ink">-{formatVnd(target.estimatedFee)}</dd>
                </div>
                <div className="flex justify-between gap-3 border-t border-dashed border-brand-navy/20 pt-1.5">
                  <dt className="font-semibold text-brand-ink">Số dư ví sau khi đổi</dt>
                  <dd className={`font-extrabold tabular-nums ${short ? "text-red-600" : "text-brand-navy"}`}>
                    {wallet.isSuccess ? formatVnd(balanceAfter) : "Đang tải…"}
                  </dd>
                </div>
              </dl>
              {short && (
                <p className="mt-2 flex flex-wrap items-center gap-x-1.5 text-[13px] font-medium text-red-700">
                  <Icon name="error" className="text-[17px]" />
                  Ví còn thiếu {formatVnd(-balanceAfter)}.
                  <Link to={ROUTES.studentWallet} className="font-semibold text-brand-navy">
                    Nạp thêm vào ví
                  </Link>
                </p>
              )}
            </div>
          )}

          {move.error && (
            <p role="alert" className={`${AUTH_ERROR} flex items-center gap-1.5`}>
              <Icon name="error" className="text-[17px]" />
              {portalErrorMessage(move.error, "Chưa đổi được lớp. Vui lòng thử lại.")}
            </p>
          )}

          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="flex items-center gap-1.5 text-[12.5px] text-brand-muted">
              <Icon name="info" className="text-[16px]" />
              Sau khi đổi sẽ không đổi lại được nữa.
            </p>
            <div className="flex gap-2">
              <button type="button" onClick={close} className={PORTAL_BTN_SECONDARY}>
                Giữ lớp cũ
              </button>
              <button
                type="button"
                onClick={() => move.mutate()}
                disabled={!target || short || move.isPending}
                className={PORTAL_BTN_PRIMARY}
              >
                <Icon name="swap_horiz" className="text-[18px]" />
                {move.isPending ? "Đang đổi…" : target ? `Đổi sang ${target.classCode}` : "Đổi lớp"}
              </button>
            </div>
          </div>
        </div>
      )}
    </PortalDialog>
  );
}
