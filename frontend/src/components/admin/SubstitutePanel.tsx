import { useMutation, useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { ReasonForm } from "@/components/admin/ReasonForm";
import { AuthNotice } from "@/components/auth/AuthNotice";
import { PortalEmpty, PortalError, PortalLoading } from "@/components/dashboard/PortalState";
import { Icon } from "@/components/ui/Icon";
import { UserAvatar } from "@/components/ui/UserAvatar";
import { PORTAL_BTN_PRIMARY } from "@/constants/classNames";
import { subjectIcon } from "@/constants/management";
import { adminKeys, useRefreshAdmin } from "@/hooks/useAdminData";
import type { AdminClassResponse, AvailableTutorResponse, LeaveRequestResponse, SessionResponse } from "@/interfaces/api";
import { assignSubstitute, fetchSubstituteTutors } from "@/services/admin";
import { displayCode } from "@/utils/classes";
import { formatDate, parseIsoDate, weekdayName } from "@/utils/date";
import { portalErrorMessage } from "@/utils/errors";
import { formatTimeRange } from "@/utils/sessions";

interface SubstitutePanelProps {
  request: LeaveRequestResponse;
  session: SessionResponse;
  info?: AdminClassResponse;
  /** Tên gia sư đang bận (người xin nghỉ) */
  busyName: string;
}

const hhmm = (time: string) => time.slice(0, 5);

/**
 * Chọn gia sư dạy thay một buổi khi gia sư phụ trách xin nghỉ: gợi ý từ GET /admin/sessions/{id}/available-tutors
 * (rảnh đúng giờ đó xếp trước, kèm khung rảnh đã khai trong ngày), bấm "Nhờ dạy thay" rồi ghi lý do
 * → POST /admin/sessions/{id}/substitute. Gia sư chính của lớp không đổi.
 */
export function SubstitutePanel({ request, session, info, busyName }: SubstitutePanelProps) {
  const refresh = useRefreshAdmin();
  const query = useQuery({
    queryKey: adminKeys.substituteTutors(session.sessionId),
    queryFn: () => fetchSubstituteTutors(session.sessionId),
    retry: false,
  });
  const [picking, setPicking] = useState<number | null>(null);
  const [done, setDone] = useState("");
  const [showBusy, setShowBusy] = useState(false);
  const substitute = useMutation({
    mutationFn: ({ tutor, reason }: { tutor: AvailableTutorResponse; reason: string }) =>
      assignSubstitute(session.sessionId, { leaveRequestId: request.leaveRequestId, substituteTutorId: tutor.tutorId, reason }),
    onSuccess: (_, { tutor }) => {
      setDone(tutor.tutorName);
      setPicking(null);
      void refresh();
    },
  });

  const day = parseIsoDate(session.date);
  const tutors = query.data ?? [];
  const free = tutors.filter((tutor) => tutor.available);
  const busy = tutors.filter((tutor) => !tutor.available);

  const card = (tutor: AvailableTutorResponse) => (
    <li
      key={tutor.tutorId}
      className={`flex flex-col rounded-2xl border bg-white p-4 transition-all ${
        tutor.available
          ? "border-brand-sandLine hover:-translate-y-0.5 hover:border-brand-navy/30 hover:shadow-[0_16px_32px_-24px_rgba(11,58,140,0.55)]"
          : "border-red-100"
      }`}
    >
      <div className="flex items-center gap-3">
        <UserAvatar userId={tutor.tutorId} name={tutor.tutorName} size={46} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[15.5px] font-bold text-brand-ink">{tutor.tutorName}</p>
          <p className="text-[12px] text-brand-muted">{displayCode("tutor", tutor.tutorId)}</p>
        </div>
        {tutor.available && tutor.declaredAvailabilityCovered && (
          <span className="shrink-0 rounded-full bg-emerald-100 px-2 py-0.5 text-[11.5px] font-bold text-emerald-800">Phù hợp nhất</span>
        )}
      </div>

      <ul className="mt-3 space-y-1.5 text-[13px]">
        <li className={`flex items-center gap-1.5 ${tutor.available ? "text-emerald-700" : "text-red-700"}`}>
          <Icon name={tutor.available ? "check_circle" : "cancel"} className="text-[17px]" />
          {tutor.available ? `Trống lịch ${hhmm(session.startTime)} – ${hhmm(session.endTime)}` : "Đang có buổi dạy khác giờ này"}
        </li>
        <li className="flex items-start gap-1.5 text-brand-ink">
          <Icon name="event_available" className={`mt-px text-[17px] ${tutor.availability.length > 0 ? "text-brand-navy" : "text-slate-400"}`} />
          {tutor.availability.length > 0 ? (
            <span>
              Đã khai rảnh{" "}
              {tutor.availability.map((slot, index) => (
                <span key={`${slot.startTime}-${index}`}>
                  {index > 0 && ", "}
                  <strong className="font-semibold">
                    {hhmm(slot.startTime)}–{hhmm(slot.endTime)}
                  </strong>
                </span>
              ))}
            </span>
          ) : (
            <span className="text-brand-muted">Chưa khai lịch rảnh ngày này</span>
          )}
        </li>
      </ul>

      {tutor.conflicts.length > 0 && (
        <ul className="mt-3 space-y-1 rounded-xl bg-red-50 px-3 py-2 text-[12.5px] text-red-900">
          {tutor.conflicts.slice(0, 2).map((conflict) => (
            <li key={conflict.conflictSessionId}>
              {hhmm(conflict.startTime)}–{hhmm(conflict.endTime)} - đang dạy lớp{" "}
              <strong className="font-semibold">{displayCode("class", conflict.conflictClassGroupId)}</strong>
            </li>
          ))}
        </ul>
      )}

      {tutor.available && !done && (
        <div className="mt-auto pt-4">
          {picking === tutor.tutorId ? (
            <ReasonForm
              id={`substitute-${session.sessionId}-${tutor.tutorId}`}
              label="Ghi chú cho buổi dạy thay"
              submitLabel={`Nhờ ${tutor.tutorName} dạy thay`}
              isPending={substitute.isPending}
              error={substitute.error}
              errorFallback="Chưa phân dạy thay được. Vui lòng thử lại."
              onSubmit={(reason) => substitute.mutate({ tutor, reason })}
              onCancel={() => setPicking(null)}
            />
          ) : (
            <button
              type="button"
              onClick={() => {
                substitute.reset();
                setPicking(tutor.tutorId);
              }}
              className={`${PORTAL_BTN_PRIMARY} w-full`}
            >
              <Icon name="swap_horiz" className="text-[18px]" />
              Nhờ dạy thay buổi này
            </button>
          )}
        </div>
      )}
    </li>
  );

  return (
    <div className="space-y-5">
      {/* Băng đầu: buổi cần người dạy thay */}
      <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-brand-navyDeep via-brand-navy to-[#1F56B8] text-white shadow-[0_24px_48px_-30px_rgba(8,42,102,0.8)]">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-[0.08] [background-image:radial-gradient(#fff_1px,transparent_1px)] [background-size:16px_16px]"
        />
        <div aria-hidden="true" className="pointer-events-none absolute -right-16 -top-20 h-56 w-56 rounded-full bg-brand-orange/25 blur-3xl" />
        <div className="relative flex flex-col gap-5 p-5 sm:p-6 md:flex-row md:items-center">
          <div className="flex shrink-0 flex-col items-center justify-center rounded-2xl bg-white px-4 py-2.5 text-brand-navy shadow-lg">
            <span className="text-[12px] font-bold uppercase">{weekdayName(day, true)}</span>
            <span className="text-[30px] font-extrabold leading-none">{day.getDate()}</span>
            <span className="text-[11.5px] font-semibold text-brand-muted">Th {day.getMonth() + 1}</span>
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-md bg-white/15 px-2 py-0.5 font-mono text-[12px] font-bold">{displayCode("class", session.classGroupId)}</span>
              <span className="rounded-md bg-white/15 px-2 py-0.5 text-[12px] font-semibold">Buổi {session.sessionNumber}</span>
              {request.isLateNotice && (
                <span className="rounded-full bg-brand-orange px-2.5 py-0.5 text-[12px] font-bold text-brand-navyDeep">Báo gấp</span>
              )}
            </div>
            <h2 className="mt-1.5 flex items-center gap-2 text-[21px] font-extrabold leading-tight">
              {info && <Icon name={subjectIcon(info.subject)} className="text-[22px] text-white/80" />}
              {info?.courseName ?? `Lớp ${displayCode("class", session.classGroupId)}`}
            </h2>
            <p className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-[13.5px] text-white/85">
              <span className="flex items-center gap-1">
                <Icon name="schedule" className="text-[16px]" />
                {formatDate(day)} - {formatTimeRange(session)}
              </span>
              {info && (
                <span className="flex items-center gap-1">
                  <Icon name="groups" className="text-[16px]" />
                  {info.currentStudents} học viên
                </span>
              )}
            </p>
          </div>
          <div className="shrink-0 rounded-xl bg-white/10 px-4 py-3 ring-1 ring-white/15 md:w-[230px]">
            <p className="text-[11.5px] font-semibold uppercase tracking-[0.12em] text-white/70">Gia sư xin nghỉ</p>
            <p className="mt-1.5 flex items-center gap-2 text-[15px] font-bold">
              <UserAvatar userId={request.requesterId} name={busyName} size={28} />
              <span className="truncate">{busyName}</span>
            </p>
            <p className="mt-1.5 line-clamp-2 text-[12.5px] italic text-white/75">“{request.reason}”</p>
          </div>
        </div>
      </section>

      {done && (
        <AuthNotice tone="success">
          Đã nhờ {done} dạy thay buổi {session.sessionNumber} lớp {displayCode("class", session.classGroupId)}. Gia sư chính của lớp không đổi.
        </AuthNotice>
      )}

      {query.isPending ? (
        <PortalLoading label="Đang tìm gia sư rảnh" />
      ) : query.isError ? (
        <PortalError message={portalErrorMessage(query.error, "Không tải được gia sư rảnh cho buổi này.")} onRetry={() => void query.refetch()} />
      ) : tutors.length === 0 ? (
        <PortalEmpty icon="person_search" title="Chưa có gia sư nào khác." description="Thêm tài khoản gia sư ở trang Người dùng trước." />
      ) : (
        <>
          <section>
            <h3 className="text-[17px] font-extrabold text-brand-navy">
              Gia sư rảnh giờ này
              <span className="ml-2 rounded-full bg-emerald-100 px-2 py-0.5 align-middle text-[12px] font-bold text-emerald-800">{free.length}</span>
            </h3>
            <p className="mb-3 mt-0.5 text-[13px] text-brand-muted">
              Không có buổi dạy nào trùng {formatTimeRange(session)} ngày {formatDate(day)}. Người đã khai rảnh khung giờ này xếp trước.
            </p>
            {free.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-brand-sandLine bg-white/70 px-6 py-8 text-center">
                <Icon name="event_busy" className="text-[36px] text-brand-muted/60" />
                <p className="mt-1 text-[14.5px] font-semibold text-brand-ink">Không còn gia sư nào trống giờ này.</p>
                <p className="mt-0.5 text-[13px] text-brand-muted">Có thể xếp buổi học bù hoặc hủy buổi ở trang Duyệt nghỉ / xếp bù.</p>
              </div>
            ) : (
              <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">{free.map(card)}</ul>
            )}
          </section>

          {busy.length > 0 && (
            <section className="rounded-2xl border border-brand-sandLine bg-white/70">
              <button
                type="button"
                aria-expanded={showBusy}
                onClick={() => setShowBusy((value) => !value)}
                className="flex w-full items-center gap-2.5 rounded-2xl px-4 py-3.5 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-navy"
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-50 text-red-600">
                  <Icon name="event_busy" className="text-[18px]" />
                </span>
                <span className="text-[14.5px] font-bold text-brand-ink">Đang bận giờ này</span>
                <span className="rounded-full bg-red-100 px-2 text-[12px] font-bold text-red-800">{busy.length}</span>
                <Icon name={showBusy ? "expand_less" : "expand_more"} className="ml-auto text-[22px] text-brand-muted" />
              </button>
              {showBusy && <ul className="grid grid-cols-1 gap-3 px-4 pb-4 sm:grid-cols-2">{busy.map(card)}</ul>}
            </section>
          )}
        </>
      )}
    </div>
  );
}
