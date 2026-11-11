import { useMutation, useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { ReasonForm } from "@/components/admin/ReasonForm";
import { AuthNotice } from "@/components/auth/AuthNotice";
import { PortalEmpty, PortalError, PortalLoading } from "@/components/dashboard/PortalState";
import { Icon } from "@/components/ui/Icon";
import { PORTAL_BTN_PRIMARY, PORTAL_BTN_SECONDARY } from "@/constants/classNames";
import { adminKeys, useRefreshAdmin } from "@/hooks/useAdminData";
import { assignTutor, fetchAvailableTutors, reassignTutor } from "@/services/adminService";
import { getApiError } from "@/services/apiClient";
import { formatDate, parseIsoDate } from "@/utils/date";
import { portalErrorMessage } from "@/utils/errors";
import type { AssignmentPanelProps } from "@/interfaces/admin";
import { displayCode } from "@/utils/classes";
import { UserAvatar } from "@/components/ui/UserAvatar";
import { CLASS_STATUS } from "@/constants/labels";
import { SCHEDULE_PATTERN_OPTIONS } from "@/constants/classOptions";
import { subjectIcon } from "@/constants/management";

// Gia sư gợi ý cho một lớp (GET /admin/classes/{id}/available-tutors) và nút phân công:
// lớp chưa có gia sư thì "Phân công" (POST …/assign), đã có thì "Đổi sang gia sư này" kèm lý do (PUT …/reassign).
// Backend xếp người không trùng lịch lên trước; lịch rảnh gia sư tự khai chỉ để tham khảo.
export function AssignmentPanel({ classId, currentTutorId, info }: AssignmentPanelProps) {
  const refresh = useRefreshAdmin();
  const query = useQuery({ queryKey: adminKeys.availableTutors(classId), queryFn: () => fetchAvailableTutors(classId), retry: false });
  // Mã gia sư đang mở form đổi (cần lý do)
  const [reassigning, setReassigning] = useState<number | null>(null);
  // Tên gia sư vừa phân công xong, để hiện thông báo thành công
  const [doneName, setDoneName] = useState("");
  // Mở danh sách gia sư trùng lịch
  const [showClashing, setShowClashing] = useState(false);

  // Phân công xong: báo thành công, đóng form, tải lại dữ liệu
  const finish = (name: string) => {
    setDoneName(name);
    setReassigning(null);
    void refresh();
  };
  // Backend chặn vì trùng lịch: đóng form đổi gia sư (lỗi hiện ở đầu danh sách) và tải lại để thấy các buổi trùng mới nhất
  const reloadOnConflict = (error: Error) => {
    if (getApiError(error).errorCode !== "SCHEDULE_CONFLICT") return;
    setReassigning(null);
    void query.refetch();
  };
  const assign = useMutation({
    mutationFn: (tutorId: number) => assignTutor(classId, tutorId),
    onSuccess: (result) => finish(result.tutorName),
    onError: reloadOnConflict,
  });
  const reassign = useMutation({
    mutationFn: ({ tutorId, reason }: { tutorId: number; reason: string }) => reassignTutor(classId, tutorId, reason),
    onSuccess: (result) => finish(result.tutorName),
    onError: reloadOnConflict,
  });

  const tutors = query.data ?? [];
  const current = tutors.find((tutor) => tutor.tutorId === currentTutorId);
  const others = tutors.filter((tutor) => tutor.tutorId !== currentTutorId);
  const fit = others.filter((tutor) => tutor.available);
  const clashing = others.filter((tutor) => !tutor.available);
  const statusStyle = info ? CLASS_STATUS[info.status] : null;

  // Một thẻ gia sư: ảnh, tên, nhãn lịch, nút phân công / đổi và các buổi trùng
  const tutorCard = (tutor: (typeof tutors)[number]) => {
    const canPick = tutor.available && tutor.tutorId !== currentTutorId;
    const busy = assign.isPending && assign.variables === tutor.tutorId;
    return (
      <li
        key={tutor.tutorId}
        className={`flex flex-col rounded-2xl border bg-white p-4 transition-all ${
          tutor.available
            ? "border-brand-sandLine hover:-translate-y-0.5 hover:border-brand-navy/30 hover:shadow-[0_16px_32px_-24px_rgba(11,58,140,0.55)]"
            : "border-red-100"
        }`}
      >
        <div className="flex items-center gap-3">
          <UserAvatar userId={tutor.tutorId} name={tutor.tutorName} size={48} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-[15.5px] font-bold text-brand-ink">{tutor.tutorName}</p>
            <p className="text-[12px] text-brand-muted">{displayCode("tutor", tutor.tutorId)}</p>
          </div>
        </div>

        <ul className="mt-3 space-y-1.5 text-[13px]">
          <li className={`flex items-center gap-1.5 ${tutor.available ? "text-emerald-700" : "text-red-700"}`}>
            <Icon name={tutor.available ? "check_circle" : "cancel"} className="text-[17px]" />
            {tutor.available ? "Không trùng buổi nào của lớp" : `Trùng ${tutor.conflicts.length} buổi với lớp khác`}
          </li>
          <li className={`flex items-center gap-1.5 ${tutor.declaredAvailabilityCovered ? "text-emerald-700" : "text-brand-muted"}`}>
            <Icon name={tutor.declaredAvailabilityCovered ? "event_available" : "help"} className="text-[17px]" />
            {tutor.declaredAvailabilityCovered ? "Lịch rảnh đã khai phủ đủ" : "Lịch rảnh đã khai chưa phủ đủ"}
          </li>
        </ul>

        {
          // Tối đa 3 buổi trùng lịch
        }
        {tutor.conflicts.length > 0 && (
          <ul className="mt-3 space-y-1 rounded-xl bg-red-50 px-3 py-2 text-[12.5px] text-red-900">
            {tutor.conflicts.slice(0, 3).map((conflict) => (
              <li key={`${conflict.requestedSessionId}-${conflict.conflictSessionId}`}>
                {formatDate(parseIsoDate(conflict.date))} - {conflict.startTime.slice(0, 5)}–{conflict.endTime.slice(0, 5)} - lớp{" "}
                <strong className="font-semibold">{displayCode("class", conflict.conflictClassGroupId)}</strong>
              </li>
            ))}
            {tutor.conflicts.length > 3 && <li>và {tutor.conflicts.length - 3} buổi khác</li>}
          </ul>
        )}

        {canPick && reassigning !== tutor.tutorId && (
          <div className="mt-auto pt-4">
            {currentTutorId === null ? (
              <button
                type="button"
                disabled={assign.isPending}
                onClick={() => assign.mutate(tutor.tutorId)}
                className={`${PORTAL_BTN_PRIMARY} w-full`}
              >
                <Icon name="person_add" className="text-[18px]" />
                {busy ? "Đang phân công…" : "Phân công dạy lớp này"}
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  reassign.reset();
                  setReassigning(tutor.tutorId);
                }}
                className={`${PORTAL_BTN_SECONDARY} w-full`}
              >
                <Icon name="swap_horiz" className="text-[18px]" />
                Đổi sang gia sư này
              </button>
            )}
          </div>
        )}

        {reassigning === tutor.tutorId && (
          <div className="mt-3">
            <ReasonForm
              id={`reassign-${classId}-${tutor.tutorId}`}
              label="Lý do đổi gia sư"
              submitLabel={`Đổi sang ${tutor.tutorName}`}
              isPending={reassign.isPending}
              canSubmit={tutor.available}
              error={reassign.error}
              errorFallback="Chưa đổi được gia sư. Vui lòng thử lại."
              onSubmit={(reason) => reassign.mutate({ tutorId: tutor.tutorId, reason })}
              onCancel={() => setReassigning(null)}
            />
          </div>
        )}
      </li>
    );
  };

  const currentName = current?.tutorName ?? info?.tutorName ?? (currentTutorId ? `Gia sư ${displayCode("tutor", currentTutorId)}` : null);

  return (
    <div className="space-y-5">
      {
        // Băng đầu: lớp đang phân công + gia sư phụ trách
      }
      <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-brand-navyDeep via-brand-navy to-[#1F56B8] text-white shadow-[0_24px_48px_-30px_rgba(8,42,102,0.8)]">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-[0.08] [background-image:radial-gradient(#fff_1px,transparent_1px)] [background-size:16px_16px]"
        />
        <div aria-hidden="true" className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full bg-brand-orange/25 blur-3xl" />
        <div className="relative flex flex-col gap-5 p-5 sm:p-6 md:flex-row md:items-center">
          <div className="flex min-w-0 flex-1 items-start gap-4">
            <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-white/15 ring-1 ring-white/25">
              <Icon name={info ? subjectIcon(info.subject) : "school"} className="text-[28px]" />
            </span>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-md bg-white/15 px-2 py-0.5 font-mono text-[12px] font-bold tracking-wide">{displayCode("class", classId)}</span>
                {statusStyle && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-white/15 px-2.5 py-0.5 text-[12px] font-semibold">
                    <Icon name={statusStyle.icon} className="text-[14px]" />
                    {statusStyle.label}
                  </span>
                )}
              </div>
              <h2 className="mt-1.5 text-[22px] font-extrabold leading-tight tracking-tight">{info?.courseName ?? `Lớp ${displayCode("class", classId)}`}</h2>
              {info && (
                <p className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[13px] text-white/80">
                  <span className="flex items-center gap-1">
                    <Icon name="calendar_month" className="text-[16px]" />
                    {SCHEDULE_PATTERN_OPTIONS.find((option) => option.value === info.schedulePattern)?.label} - {info.timeSlotLabel}
                  </span>
                  <span className="flex items-center gap-1">
                    <Icon name="rocket_launch" className="text-[16px]" />
                    Khai giảng {formatDate(parseIsoDate(info.startDate))}
                  </span>
                  <span className="flex items-center gap-1">
                    <Icon name="groups" className="text-[16px]" />
                    {info.currentStudents}/{info.maxStudents} học viên
                  </span>
                </p>
              )}
            </div>
          </div>

          <div className="shrink-0 rounded-xl bg-white/10 px-4 py-3 ring-1 ring-white/15 md:w-[220px]">
            <p className="text-[11.5px] font-semibold uppercase tracking-[0.12em] text-white/70">Gia sư phụ trách</p>
            {currentName ? (
              <p className="mt-1.5 flex items-center gap-2 text-[15px] font-bold">
                <UserAvatar userId={currentTutorId ?? undefined} name={currentName} size={30} />
                <span className="truncate">{currentName}</span>
              </p>
            ) : (
              <p className="mt-1.5 flex items-center gap-1.5 text-[15px] font-bold text-brand-orange">
                <Icon name="person_off" className="text-[19px]" />
                Chưa phân công
              </p>
            )}
          </div>
        </div>
      </section>

      {doneName && (
        <AuthNotice tone="success">
          Đã phân công {doneName} dạy lớp {displayCode("class", classId)}.
        </AuthNotice>
      )}
      {assign.error && <AuthNotice tone="error">{portalErrorMessage(assign.error, "Chưa phân công được. Vui lòng thử lại.")}</AuthNotice>}
      {
        // Lỗi đổi gia sư khi form đã đóng (bị chặn vì trùng lịch)
      }
      {reassign.error && reassigning === null && (
        <AuthNotice tone="error">{portalErrorMessage(reassign.error, "Chưa đổi được gia sư. Vui lòng thử lại.")}</AuthNotice>
      )}

      {query.isPending ? (
        <PortalLoading label="Đang tải gia sư gợi ý" />
      ) : query.isError ? (
        <PortalError
          message={portalErrorMessage(query.error, "Không tải được gia sư gợi ý cho lớp này.")}
          onRetry={() => void query.refetch()}
        />
      ) : tutors.length === 0 ? (
        <PortalEmpty icon="person_search" title="Chưa có gia sư nào." description="Thêm tài khoản gia sư ở trang Người dùng trước." />
      ) : (
        <>
          <section>
            <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
              <div>
                <h3 className="text-[17px] font-extrabold text-brand-navy">
                  {currentTutorId === null ? "Gia sư rảnh lịch" : "Có thể đổi sang"}
                  <span className="ml-2 rounded-full bg-emerald-100 px-2 py-0.5 align-middle text-[12px] font-bold text-emerald-800">{fit.length}</span>
                </h3>
                <p className="mt-0.5 text-[13px] text-brand-muted">Không trùng buổi nào với lịch của lớp — bấm để phân công ngay.</p>
              </div>
            </div>
            {fit.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-brand-sandLine bg-white/70 px-6 py-8 text-center">
                <Icon name="event_busy" className="text-[36px] text-brand-muted/60" />
                <p className="mt-1 text-[14.5px] font-semibold text-brand-ink">Chưa có gia sư nào rảnh trọn lịch lớp này.</p>
                <p className="mt-0.5 text-[13px] text-brand-muted">Xem các gia sư trùng lịch bên dưới hoặc đổi lịch lớp.</p>
              </div>
            ) : (
              <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">{fit.map(tutorCard)}</ul>
            )}
          </section>

          {clashing.length > 0 && (
            <section className="rounded-2xl border border-brand-sandLine bg-white/70">
              <button
                type="button"
                aria-expanded={showClashing}
                onClick={() => setShowClashing((value) => !value)}
                className="flex w-full items-center gap-2.5 rounded-2xl px-4 py-3.5 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-navy"
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-50 text-red-600">
                  <Icon name="event_busy" className="text-[18px]" />
                </span>
                <span className="text-[14.5px] font-bold text-brand-ink">Trùng lịch, không phân công được</span>
                <span className="rounded-full bg-red-100 px-2 text-[12px] font-bold text-red-800">{clashing.length}</span>
                <Icon name={showClashing ? "expand_less" : "expand_more"} className="ml-auto text-[22px] text-brand-muted" />
              </button>
              {showClashing && <ul className="grid grid-cols-1 gap-3 px-4 pb-4 sm:grid-cols-2">{clashing.map(tutorCard)}</ul>}
            </section>
          )}
        </>
      )}
    </div>
  );
}
