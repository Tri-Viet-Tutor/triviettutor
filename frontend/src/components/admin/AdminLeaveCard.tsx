import { useMutation, useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Link } from "react-router-dom";
import { MakeupForm } from "@/components/admin/MakeupForm";
import { ReasonForm } from "@/components/admin/ReasonForm";
import { StatusChip } from "@/components/dashboard/StatusChip";
import { AUTH_LABEL, PORTAL_BTN_PRIMARY, PORTAL_BTN_SECONDARY, PORTAL_CARD, PORTAL_INPUT, PORTAL_TEXT_LINK } from "@/constants/classNames";
import { LEAVE_RESOLUTION, LEAVE_STATUS, SESSION_STATUS } from "@/constants/labels";
import { ROUTES } from "@/constants/routes";
import { adminKeys, useAdminSession, useCanOfferMakeup, useRefreshAdmin, useUserDirectory } from "@/hooks/useAdminData";
import type { AdminLeaveRequestsQuery, Role } from "@/interfaces/api";
import { assignSubstitute, cancelSession, excuseLeaveRequest, fetchAdminLeaveRequests, rejectLeaveRequest } from "@/services/admin";
import { formatClockTime, formatDate, parseIsoDate } from "@/utils/date";
import { formatLongDate, formatTimeRange, teacherOf } from "@/utils/sessions";
import type { AdminLeaveCardProps, LeaveCardAction } from "@/interfaces/admin";
import { displayCode } from "@/utils/classes";

export function AdminLeaveCard({ request }: AdminLeaveCardProps) {
  const refresh = useRefreshAdmin();
  const { tutors, label } = useUserDirectory();
  const sessionQuery = useAdminSession(request.sessionId);
  const session = sessionQuery.data;
  const [action, setAction] = useState<LeaveCardAction | null>(null);
  // Dữ liệu form dạy thay
  const [substituteId, setSubstituteId] = useState("");

  /** Xử lý xong: đóng form và tải lại dữ liệu khu quản trị */
  const done = () => {
    setAction(null);
    void refresh();
  };
  const reject = useMutation({ mutationFn: (reason: string) => rejectLeaveRequest(request.leaveRequestId, reason), onSuccess: done });
  const excuse = useMutation({ mutationFn: (reason: string) => excuseLeaveRequest(request.leaveRequestId, reason), onSuccess: done });
  const cancel = useMutation({
    mutationFn: (reason: string) => cancelSession(request.sessionId, { reason, leaveRequestId: request.leaveRequestId }),
    onSuccess: done,
  });
  const substitute = useMutation({
    mutationFn: (reason: string) =>
      assignSubstitute(request.sessionId, { leaveRequestId: request.leaveRequestId, substituteTutorId: Number(substituteId), reason }),
    onSuccess: done,
  });

  const status = LEAVE_STATUS[request.status];
  const requestedAt = new Date(request.requestedAt);
  const fromTutor = request.requesterRole === "ROLE_TUTOR";
  // Đơn học viên báo đủ sớm làm buổi chờ xếp lại (chỉ lớp 1-1): xem buổi có đơn gia sư nào đang chờ không
  const studentReschedules =
    !fromTutor && request.status === "PENDING" && !request.isLateNotice && session?.status === "PENDING_RESCHEDULE";
  const sessionPendingQuery: AdminLeaveRequestsQuery = { sessionId: request.sessionId, status: "PENDING", page: 0, size: 100 };
  const sessionPending = useQuery({
    queryKey: adminKeys.leaveRequests(sessionPendingQuery),
    queryFn: () => fetchAdminLeaveRequests(sessionPendingQuery),
    enabled: studentReschedules,
  });
  // Xếp bù / hủy buổi được với đơn gia sư, hoặc đơn học viên lớp 1-1 khi buổi không còn đơn gia sư nào chờ (lúc đó xử lý ở đơn gia sư)
  const canReschedule =
    fromTutor || (studentReschedules && sessionPending.data?.content.every((other) => other.requesterRole !== "ROLE_TUTOR") === true);
  const pending = request.status === "PENDING";
  // Học viên lớp nhóm báo nghỉ trước ≥ 24 giờ: trung tâm duyệt có phép → học viên được miễn điểm danh buổi đó
  const canExcuse = !fromTutor && pending && !request.isLateNotice && session !== undefined && session.status !== "PENDING_RESCHEDULE" && session.status !== "CANCELLED";
  // Không cho chọn chính người đang dạy buổi đó làm người dạy thay
  const currentTeacher = session ? teacherOf(session) : null;
  // Gia sư đã bị khóa không dạy thay được (backend từ chối), nên không đưa vào danh sách
  const substituteOptions = tutors.filter((tutor) => tutor.id !== currentTeacher && !tutor.locked);
  // Đơn đã duyệt "hủy buổi": vẫn xếp bù được nếu buổi gốc đã hủy chưa có buổi bù nào còn hiệu lực
  const cancelledWithoutMakeup =
    request.status === "APPROVED" &&
    request.resolution === "CANCEL" &&
    session?.status === "CANCELLED" &&
    session.originalSessionId === null;
  const canMakeupCancelled = useCanOfferMakeup(request.sessionId, session?.classGroupId ?? 0, cancelledWithoutMakeup) === true;

  /** Mở form của một cách xử lý, xóa lỗi cũ của các form khác */
  function open(next: LeaveCardAction) {
    reject.reset();
    excuse.reset();
    cancel.reset();
    substitute.reset();
    setAction(next);
  }

  return (
    <li className={`p-4 sm:p-5 ${PORTAL_CARD}`}>
      <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-2">
        <div className="min-w-0">
          <p className="text-[16px] font-semibold text-brand-ink">{label(request.requesterRole as Role, request.requesterId)}</p>
          <p className="text-[14px] text-brand-muted">
            {session ? (
              <>
                Nghỉ buổi {formatLongDate(parseIsoDate(session.date))}, {formatTimeRange(session)} (lớp {displayCode("class", session.classGroupId)}, buổi{" "}
                {session.sessionNumber})
              </>
            ) : (
              `Buổi học ${displayCode("session", request.sessionId)}`
            )}
          </p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {request.isLateNotice && <StatusChip tone="slate">Báo trễ</StatusChip>}
          {session && session.status !== "SCHEDULED" && (
            <StatusChip tone={SESSION_STATUS[session.status].tone}>Buổi: {SESSION_STATUS[session.status].label.toLowerCase()}</StatusChip>
          )}
          <StatusChip tone={status.tone} icon={status.icon}>
            {status.label}
          </StatusChip>
        </div>
      </div>

      <p className="mt-3 whitespace-pre-line break-words text-[14.5px] leading-relaxed text-brand-ink">{request.reason}</p>

      {request.resolution && (
        <p className="mt-3 text-[14.5px] font-medium text-brand-navy">
          {LEAVE_RESOLUTION[request.resolution]}.{" "}
          {request.replacementSessionId !== null && (
            <Link to={`${ROUTES.adminSessions}?buoi=${request.replacementSessionId}`} className={PORTAL_TEXT_LINK}>
              Xem buổi thay thế
            </Link>
          )}
        </p>
      )}
      {request.resolutionReason && <p className="mt-1 text-[14.5px] text-brand-ink">Ghi chú xử lý: {request.resolutionReason}</p>}

      <p className="mt-3 text-[13px] text-brand-muted">
        Gửi lúc {formatClockTime(requestedAt)} ngày {formatDate(requestedAt)} -{" "}
        <Link to={`${ROUTES.adminSessions}?buoi=${request.sessionId}`} className={PORTAL_TEXT_LINK}>
          Mở buổi học
        </Link>
      </p>

      {pending && (
        <div className="mt-4 border-t border-brand-sandLine pt-4">
          {!fromTutor && (
            <p className="mb-3 text-[14px] leading-relaxed text-brand-muted">
              {canExcuse
                ? "Duyệt có phép thì học viên được miễn điểm danh buổi này; gia sư sẽ thấy em đã nghỉ có phép."
                : request.isLateNotice
                  ? "Đơn báo trễ (dưới 24 giờ) không duyệt có phép được."
                  : "Đơn này cần xếp lại buổi học (lớp 1 kèm 1)."}
            </p>
          )}
          {action === null && (
            <div className="flex flex-wrap gap-2">
              {canReschedule && (
                <>
                  {fromTutor && (
                    <button type="button" onClick={() => open("substitute")} className={PORTAL_BTN_PRIMARY}>
                      Phân người dạy thay
                    </button>
                  )}
                  <button type="button" onClick={() => open("makeup")} className={PORTAL_BTN_SECONDARY}>
                    Xếp buổi học bù
                  </button>
                  <button type="button" onClick={() => open("cancel")} className={PORTAL_BTN_SECONDARY}>
                    Hủy buổi
                  </button>
                </>
              )}
              {canExcuse && (
                <button type="button" onClick={() => open("excuse")} className={PORTAL_BTN_PRIMARY}>
                  Duyệt nghỉ có phép
                </button>
              )}
              <button type="button" onClick={() => open("reject")} className={PORTAL_BTN_SECONDARY}>
                Từ chối
              </button>
            </div>
          )}

          {action === "excuse" && (
            <ReasonForm
              id={`excuse-${request.leaveRequestId}`}
              label="Ghi chú gửi kèm (ví dụ: đã có giấy xin phép của phụ huynh)"
              submitLabel="Duyệt nghỉ có phép"
              isPending={excuse.isPending}
              error={excuse.error}
              errorFallback="Chưa duyệt được. Vui lòng thử lại."
              onSubmit={(reason) => excuse.mutate(reason)}
              onCancel={() => setAction(null)}
            />
          )}
          {action === "reject" && (
            <ReasonForm
              id={`reject-${request.leaveRequestId}`}
              label="Lý do từ chối"
              submitLabel="Từ chối đơn"
              danger
              isPending={reject.isPending}
              error={reject.error}
              errorFallback="Chưa từ chối được đơn. Vui lòng thử lại."
              onSubmit={(reason) => reject.mutate(reason)}
              onCancel={() => setAction(null)}
            />
          )}
          {action === "cancel" && (
            <ReasonForm
              id={`cancel-${request.leaveRequestId}`}
              label="Lý do hủy buổi"
              submitLabel="Hủy buổi học"
              danger
              isPending={cancel.isPending}
              error={cancel.error}
              errorFallback="Chưa hủy được buổi học. Vui lòng thử lại."
              onSubmit={(reason) => cancel.mutate(reason)}
              onCancel={() => setAction(null)}
            />
          )}
          {action === "substitute" && (
            <ReasonForm
              id={`substitute-${request.leaveRequestId}`}
              label="Ghi chú phân công"
              submitLabel="Phân dạy thay"
              isPending={substitute.isPending}
              error={substitute.error}
              errorFallback="Chưa phân được người dạy thay. Vui lòng thử lại."
              canSubmit={substituteId !== ""}
              onSubmit={(reason) => substitute.mutate(reason)}
              onCancel={() => setAction(null)}
            >
              <div>
                <label htmlFor={`substitute-tutor-${request.leaveRequestId}`} className={`mb-1.5 ${AUTH_LABEL}`}>
                  Gia sư dạy thay
                </label>
                <select
                  id={`substitute-tutor-${request.leaveRequestId}`}
                  required
                  value={substituteId}
                  onChange={(event) => setSubstituteId(event.target.value)}
                  className={PORTAL_INPUT}
                >
                  <option value="">Chọn gia sư</option>
                  {substituteOptions.map((tutor) => (
                    <option key={tutor.id} value={tutor.id}>
                      {tutor.fullName}
                    </option>
                  ))}
                </select>
              </div>
            </ReasonForm>
          )}
          {action === "makeup" && (
            <MakeupForm
              idPrefix={`makeup-${request.leaveRequestId}`}
              sessionId={request.sessionId}
              leaveRequestId={request.leaveRequestId}
              note="Buổi gốc sẽ bị hủy và buổi học bù được tạo cho cả lớp."
              onDone={done}
              onCancel={() => setAction(null)}
            />
          )}
        </div>
      )}

      {canMakeupCancelled && (
        <div className="mt-4 border-t border-brand-sandLine pt-4">
          {action === "makeup" ? (
            <MakeupForm
              idPrefix={`makeup-${request.leaveRequestId}`}
              sessionId={request.sessionId}
              leaveRequestId={request.leaveRequestId}
              note="Buổi gốc đã hủy; buổi học bù được tạo cho cả lớp để lớp học đủ số buổi."
              onDone={done}
              onCancel={() => setAction(null)}
            />
          ) : (
            <button type="button" onClick={() => open("makeup")} className={PORTAL_BTN_SECONDARY}>
              Xếp buổi học bù
            </button>
          )}
        </div>
      )}
    </li>
  );
}
