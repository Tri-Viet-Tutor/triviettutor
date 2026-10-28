import { useState } from "react";
import { Link } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { FilterTabs } from "@/components/dashboard/FilterTabs";
import { PortalDialog } from "@/components/dashboard/PortalDialog";
import { PortalPageHeader } from "@/components/dashboard/PortalPageHeader";
import { PortalEmpty, PortalError, PortalLoading } from "@/components/dashboard/PortalState";
import { StatTile } from "@/components/dashboard/StatTile";
import { StatusChip } from "@/components/dashboard/StatusChip";
import { Icon } from "@/components/ui/Icon";
import {
  AUTH_ERROR,
  PORTAL_BTN_ACCENT,
  PORTAL_BTN_GHOST,
  PORTAL_BTN_SECONDARY,
  PORTAL_CARD,
  PORTAL_INPUT,
  PORTAL_LABEL,
} from "@/constants/classNames";
import { ENROLLMENT_STATUS } from "@/constants/labels";
import { ROUTES } from "@/constants/routes";
import { useMyEnrollments, useRefreshMine } from "@/hooks/useManagementData";
import { useMySessions } from "@/hooks/usePortalData";
import { cancelEnrollment } from "@/services/managementService";
import { formatVnd } from "@/utils/currency";
import { formatDate } from "@/utils/date";
import { portalErrorMessage } from "@/utils/errors";
import { formatTimeRange, nextSession, splitSessions } from "@/utils/sessions";
import type { EnrollmentResponse, EnrollmentStatus } from "@/interfaces/api";

/**
 * Các lớp học viên đã đóng học phí: học phí, ưu đãi, tiến độ buổi học, buổi kế tiếp và hủy ghi danh.
 * API: GET /enrollments/my, DELETE /enrollments/{id} (kèm lý do), GET /me/sessions để ghép tiến độ.
 */
export function StudentEnrollmentsPage() {
  const [filter, setFilter] = useState<EnrollmentStatus | "ALL">("ALL");
  const [cancelling, setCancelling] = useState<EnrollmentResponse | null>(null);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const enrollments = useMyEnrollments();
  const sessions = useMySessions();
  const refreshMine = useRefreshMine();
  const now = new Date();

  const cancel = useMutation({
    mutationFn: () => cancelEnrollment((cancelling as EnrollmentResponse).enrollmentId, reason.trim()),
    onSuccess: (result) => {
      setCancelling(null);
      setNotice(
        result.status === "REFUNDED"
          ? "Đã hủy ghi danh. Học phí sẽ được hoàn theo quy định."
          : result.status === "ACTIVE"
            ? "Đã gửi yêu cầu hoàn tiền qua VNPay. Lớp sẽ được hủy khi VNPay xác nhận hoàn tiền."
            : "Đã hủy ghi danh lớp học.",
      );
      void refreshMine();
    },
    onError: (err) => setError(portalErrorMessage(err, "Chưa hủy được ghi danh. Vui lòng thử lại.")),
  });

  const all = enrollments.data?.content ?? [];
  const shown = filter === "ALL" ? all : all.filter((item) => item.status === filter);
  const active = all.filter((item) => item.status === "ACTIVE");
  const paid = all.reduce((sum, item) => sum + item.feeCharged, 0);

  /** Tiến độ và buổi kế tiếp của một lớp, lấy từ lịch học của tôi */
  function progressOf(classGroupId: number) {
    const mine = (sessions.data ?? []).filter((session) => session.classGroupId === classGroupId && session.status !== "CANCELLED");
    const { upcoming, past } = splitSessions(mine, now);
    return { done: past.length, total: mine.length, next: nextSession(upcoming) };
  }

  return (
    <div>
      <PortalPageHeader
        icon="local_library"
        title="Lớp của tôi"
        description="Các lớp bạn đã đóng học phí, tiến độ học và buổi học kế tiếp."
        action={
          <Link to={ROUTES.studentCatalog} className={PORTAL_BTN_ACCENT}>
            <Icon name="add_shopping_cart" className="text-[19px]" />
            Đăng ký thêm lớp
          </Link>
        }
      />

      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <StatTile icon="school" label="Lớp đang học" value={enrollments.data ? String(active.length) : "–"} />
        <StatTile icon="payments" tone="orange" label="Tổng học phí đã đóng" value={enrollments.data ? formatVnd(paid) : "–"} />
        <StatTile
          icon="event_available"
          tone="green"
          label="Buổi học sắp tới"
          value={sessions.data ? String(splitSessions(sessions.data, now).upcoming.length) : "–"}
        />
      </div>

      <div className="mb-5">
        <FilterTabs
          label="Trạng thái ghi danh"
          value={filter}
          onChange={setFilter}
          tabs={[
            { value: "ALL", label: "Tất cả", count: all.length },
            { value: "ACTIVE", label: ENROLLMENT_STATUS.ACTIVE.label, count: active.length },
            { value: "CANCELLED", label: ENROLLMENT_STATUS.CANCELLED.label },
            { value: "REFUNDED", label: ENROLLMENT_STATUS.REFUNDED.label },
          ]}
        />
      </div>

      {notice && (
        <p
          role="status"
          className="mb-4 flex items-center gap-2 rounded-xl bg-emerald-50 px-4 py-3 text-[14px] font-medium text-emerald-800"
        >
          <Icon name="check_circle" className="text-[19px]" />
          {notice}
        </p>
      )}

      {enrollments.isPending ? (
        <PortalLoading label="Đang tải lớp của tôi" rows={3} />
      ) : enrollments.isError ? (
        <PortalError message="Không tải được danh sách lớp của bạn." onRetry={() => void enrollments.refetch()} />
      ) : shown.length === 0 ? (
        <PortalEmpty
          icon="local_library"
          title={all.length === 0 ? "Bạn chưa đăng ký lớp nào" : "Không có lớp ở trạng thái này"}
          description="Chọn một khóa học đang mở và thanh toán qua VNPay để giữ chỗ trong lớp."
          action={
            <Link to={ROUTES.studentCatalog} className={PORTAL_BTN_ACCENT}>
              Xem khóa học đang mở
            </Link>
          }
        />
      ) : (
        <ul className="grid gap-4 lg:grid-cols-2">
          {shown.map((item) => {
            const status = ENROLLMENT_STATUS[item.status];
            const progress = progressOf(item.classGroupId);
            const percent = progress.total ? Math.round((progress.done / progress.total) * 100) : 0;
            return (
              <li key={item.enrollmentId} className={`flex flex-col overflow-hidden ${PORTAL_CARD}`}>
                <div className="flex items-start justify-between gap-3 border-b border-dashed border-brand-sandLine bg-gradient-to-br from-brand-tint to-white px-5 py-4">
                  <div className="flex items-center gap-3">
                    <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-navy text-white">
                      <Icon name="school" className="text-[23px]" />
                    </span>
                    <div>
                      <p className="text-[12.5px] font-bold uppercase tracking-wide text-brand-orangeHover">
                        Mã ghi danh #{item.enrollmentId}
                      </p>
                      <h2 className="text-[17px] font-bold text-brand-ink">Lớp #{item.classGroupId}</h2>
                    </div>
                  </div>
                  <StatusChip tone={status.tone} icon={status.icon}>
                    {status.label}
                  </StatusChip>
                </div>

                <div className="flex-1 space-y-4 px-5 py-4">
                  <div className="flex flex-wrap items-end justify-between gap-2">
                    <div>
                      <p className="text-[12.5px] font-semibold text-brand-muted">Học phí đã đóng</p>
                      <p className="text-[21px] font-extrabold tabular-nums text-brand-navy">{formatVnd(item.feeCharged)}</p>
                    </div>
                    {item.discountRate > 0 && (
                      <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[12.5px] font-bold text-emerald-700 ring-1 ring-inset ring-emerald-600/15">
                        Ưu đãi lớp nhóm −{Math.round(item.discountRate * 100)}%
                      </span>
                    )}
                  </div>

                  {item.status === "ACTIVE" && progress.total > 0 && (
                    <div>
                      <div className="flex justify-between text-[13px]">
                        <span className="font-semibold text-brand-ink">Tiến độ</span>
                        <span className="tabular-nums text-brand-muted">
                          {progress.done}/{progress.total} buổi
                        </span>
                      </div>
                      <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-brand-sand" aria-hidden="true">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-brand-orange to-[#F7C24A]"
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {item.status === "ACTIVE" && progress.next && (
                    <p className="flex flex-wrap items-center gap-x-1.5 rounded-xl bg-brand-sand px-3 py-2.5 text-[14px]">
                      <Icon name="event" className="text-[19px] text-brand-navy" />
                      Buổi kế tiếp: <b>{formatDate(new Date(`${progress.next.date}T00:00:00`))}</b>, {formatTimeRange(progress.next)}
                    </p>
                  )}

                  {item.status !== "ACTIVE" && item.cancellationReason && (
                    <p className="text-[13.5px] text-brand-muted">
                      Lý do hủy: <span className="text-brand-ink">{item.cancellationReason}</span>
                    </p>
                  )}
                </div>

                <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1 border-t border-brand-sandLine px-3 py-2 text-[13px] text-brand-muted">
                  <span className="whitespace-nowrap px-2">Ghi danh ngày {formatDate(new Date(item.enrolledAt))}</span>
                  <div className="flex gap-1">
                    {item.status === "ACTIVE" && (
                      <>
                        <Link to={ROUTES.studentSchedule} className={PORTAL_BTN_GHOST}>
                          <Icon name="calendar_month" className="text-[18px]" />
                          Lịch học
                        </Link>
                        <button
                          type="button"
                          onClick={() => {
                            setReason("");
                            setError(null);
                            setCancelling(item);
                          }}
                          className={`${PORTAL_BTN_GHOST} text-red-600 hover:bg-red-50`}
                        >
                          Hủy ghi danh
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <PortalDialog
        open={cancelling !== null}
        onClose={() => setCancelling(null)}
        title="Hủy ghi danh lớp học?"
        description="Bạn sẽ không còn thấy lịch học của lớp này. Học phí được hoàn theo quy định của trung tâm."
      >
        <form
          noValidate
          onSubmit={(event) => {
            event.preventDefault();
            if (!reason.trim()) return setError("Hãy cho trung tâm biết lý do hủy.");
            setError(null);
            cancel.mutate();
          }}
          className="space-y-4"
        >
          <div>
            <label htmlFor="cancel-reason" className={PORTAL_LABEL}>
              Lý do hủy
            </label>
            <textarea
              id="cancel-reason"
              rows={3}
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              className={`${PORTAL_INPUT} h-auto py-2`}
            />
          </div>
          {error && (
            <p role="alert" className={`${AUTH_ERROR} flex items-center gap-1.5`}>
              <Icon name="error" className="text-[17px]" />
              {error}
            </p>
          )}
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setCancelling(null)} className={PORTAL_BTN_SECONDARY}>
              Giữ lớp
            </button>
            <button
              type="submit"
              disabled={cancel.isPending}
              className="inline-flex h-10 items-center justify-center gap-1.5 rounded-xl bg-red-600 px-4 text-[14px] font-semibold text-white hover:bg-red-700 disabled:opacity-50"
            >
              {cancel.isPending ? "Đang hủy…" : "Hủy ghi danh"}
            </button>
          </div>
        </form>
      </PortalDialog>
    </div>
  );
}
