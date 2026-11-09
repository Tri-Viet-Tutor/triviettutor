import { useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQueries, useQueryClient } from "@tanstack/react-query";
import { FilterTabs } from "@/components/dashboard/FilterTabs";
import { PortalDialog } from "@/components/dashboard/PortalDialog";
import { PortalPageHeader } from "@/components/dashboard/PortalPageHeader";
import { PortalEmpty, PortalError, PortalLoading } from "@/components/dashboard/PortalState";
import { StatTile } from "@/components/dashboard/StatTile";
import { StatusChip } from "@/components/dashboard/StatusChip";
import { TransferClassDialog } from "@/components/student/TransferClassDialog";
import { TutorRatingBadge, TutorRatingDialog } from "@/components/student/TutorRatingDialog";
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
import { getTuitionClass } from "@/services/tuitionPaymentService";
import { UserAvatar } from "@/components/ui/UserAvatar";
import { formatVnd } from "@/utils/currency";
import { formatDate } from "@/utils/date";
import { portalErrorMessage } from "@/utils/errors";
import { formatTimeRange, nextSession, splitSessions, teacherOf } from "@/utils/sessions";
import type { EnrollmentResponse, EnrollmentStatus } from "@/interfaces/api";
import { displayCode } from "@/utils/classes";

/** Câu báo đúng với kết quả hủy: hoàn ngay (ví/mock) hay đang chờ VNPay hoàn tiền */
function cancelNotice(result: EnrollmentResponse): string {
  if (result.status === "REFUNDED") return "Đã hủy ghi danh và hoàn học phí.";
  if (result.refundStatus === "PENDING") return "Đã gửi yêu cầu hủy. VNPay đang hoàn tiền; lớp sẽ chuyển sang “Đã hoàn tiền” khi hoàn tất.";
  if (result.refundStatus === "FAILED") return "Đã gửi yêu cầu hủy nhưng hoàn tiền chưa thành công. Trung tâm sẽ liên hệ để xử lý.";
  return "Đã hủy ghi danh lớp học.";
}

/**
 * Các lớp học viên đã đóng học phí: học phí, ưu đãi, tiến độ buổi học, buổi kế tiếp, đổi lớp và hủy ghi danh.
 * Đổi lớp: trước hạn chốt, sang lớp khác cùng khóa còn trước hạn chốt, mỗi lớp một lần (POST /enrollments/{id}/transfer).
 * API: GET /enrollments/my, DELETE /enrollments/{id} (kèm lý do), GET /me/sessions để ghép tiến độ.
 * Lớp đã có buổi học hoàn tất thì đánh giá được gia sư dạy gần nhất (POST /tutors/{id}/ratings, PUT /ratings/{id}).
 */
export function StudentEnrollmentsPage() {
  const [filter, setFilter] = useState<EnrollmentStatus | "ALL">("ALL");
  const [cancelling, setCancelling] = useState<EnrollmentResponse | null>(null);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [ratingTutorId, setRatingTutorId] = useState<number | null>(null);
  const [transferring, setTransferring] = useState<EnrollmentResponse | null>(null);
  const queryClient = useQueryClient();
  const enrollments = useMyEnrollments();
  const sessions = useMySessions();
  const refreshMine = useRefreshMine();
  const now = new Date();

  const cancel = useMutation({
    mutationFn: () => cancelEnrollment((cancelling as EnrollmentResponse).enrollmentId, reason.trim()),
    onSuccess: (result) => {
      setCancelling(null);
      setNotice(cancelNotice(result));
      void refreshMine();
    },
    onError: (err) => setError(portalErrorMessage(err, "Chưa hủy được ghi danh. Vui lòng thử lại.")),
  });

  const all = enrollments.data?.content ?? [];
  // Tên khóa và gia sư của từng lớp đã ghi danh (GET /catalog/classes/{id})
  const classIds = [...new Set(all.map((item) => item.classGroupId))];
  const classDetails = useQueries({
    queries: classIds.map((id) => ({
      queryKey: ["catalog-class", id],
      queryFn: () => getTuitionClass(id),
      staleTime: 60_000,
      retry: false,
    })),
  });
  const classById = new Map(classIds.map((id, index) => [id, classDetails[index]?.data]));
  const shown = filter === "ALL" ? all : all.filter((item) => item.status === filter);
  const active = all.filter((item) => item.status === "ACTIVE");
  const paid = all.reduce((sum, item) => sum + item.feeCharged, 0);

  /**
   * Còn đổi lớp được: còn tự hủy được (trước hạn chốt), lớp đang tuyển sinh và chưa từng đổi.
   * Chỉ hiện khi backend báo rõ transferable = true: máy chủ chưa có POST /enrollments/{id}/transfer thì nút sẽ báo lỗi 404.
   */
  function canTransfer(item: EnrollmentResponse) {
    return (
      item.status === "ACTIVE" &&
      item.cancellable &&
      item.transferable === true &&
      !item.transferredFromEnrollmentId &&
      classById.get(item.classGroupId)?.status === "ENROLLING"
    );
  }

  /** Tiến độ và buổi kế tiếp của một lớp, lấy từ lịch học của tôi */
  function progressOf(classGroupId: number) {
    const mine = (sessions.data ?? []).filter((session) => session.classGroupId === classGroupId && session.status !== "CANCELLED");
    const { upcoming, past } = splitSessions(mine, now);
    return { done: past.length, total: mine.length, next: nextSession(upcoming) };
  }

  /** Gia sư dạy buổi hoàn tất gần nhất của lớp — người học viên được đánh giá; chưa học xong buổi nào thì null */
  function ratedTutorOf(classGroupId: number): number | null {
    const completed = (sessions.data ?? [])
      .filter((session) => session.classGroupId === classGroupId && session.status === "COMPLETED" && teacherOf(session) !== null)
      .sort((a, b) => `${b.date}${b.startTime}`.localeCompare(`${a.date}${a.startTime}`));
    return completed.length ? teacherOf(completed[0]) : null;
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
          title={all.length === 0 ? "Bạn chưa đăng ký lớp nào." : "Không có lớp ở trạng thái này."}
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
            const tutorId = ratedTutorOf(item.classGroupId);
            return (
              <li key={item.enrollmentId} className={`flex flex-col overflow-hidden ${PORTAL_CARD}`}>
                <div className="flex items-start justify-between gap-3 border-b border-dashed border-brand-sandLine bg-gradient-to-br from-brand-tint to-white px-5 py-4">
                  <div className="flex items-center gap-3">
                    <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-navy text-white">
                      <Icon name="school" className="text-[23px]" />
                    </span>
                    <div>
                      <p className="text-[12.5px] font-bold uppercase tracking-wide text-brand-orangeHover">
                        Mã ghi danh {displayCode("enrollment", item.enrollmentId)}
                      </p>
                      <h2 className="text-[17px] font-bold text-brand-ink">
                        {classById.get(item.classGroupId)?.courseName ?? `Lớp ${displayCode("class", item.classGroupId)}`}
                      </h2>
                      {classById.get(item.classGroupId)?.tutorName && (
                        <p className="mt-0.5 flex items-center gap-1.5 text-[13.5px] text-brand-muted">
                          <UserAvatar
                            userId={classById.get(item.classGroupId)?.tutorId}
                            name={classById.get(item.classGroupId)?.tutorName ?? ""}
                            size={20}
                          />
                          Gia sư <span className="font-semibold text-brand-ink">{classById.get(item.classGroupId)?.tutorName}</span>
                        </p>
                      )}
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
                        Đã hoàn {Math.round(item.discountRate * 100)}% vào ví
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

                  {item.status === "ACTIVE" && item.refundStatus === "PENDING" && (
                    <p className="flex items-center gap-1.5 rounded-xl bg-amber-50 px-3 py-2.5 text-[13.5px] font-medium text-amber-800">
                      <Icon name="hourglass_top" className="text-[18px]" />
                      Đang hoàn tiền qua VNPay. Lớp sẽ được hủy khi hoàn tiền xong.
                    </p>
                  )}
                  {item.status === "ACTIVE" && item.refundStatus === "FAILED" && (
                    <p className="flex items-center gap-1.5 rounded-xl bg-red-50 px-3 py-2.5 text-[13.5px] font-medium text-red-700">
                      <Icon name="error" className="text-[18px]" />
                      Hoàn tiền chưa thành công. Trung tâm sẽ liên hệ để xử lý.
                    </p>
                  )}

                  {item.status === "ACTIVE" && item.refundStatus === "COMPLETED" && (
                    <p className="flex items-center gap-1.5 rounded-xl bg-sky-50 px-3 py-2.5 text-[13.5px] font-medium text-sky-800">
                      <Icon name="info" className="text-[18px]" />
                      Đã hoàn tiền một phần. Bạn vẫn tiếp tục học lớp này.
                    </p>
                  )}

                  {tutorId !== null && (
                    <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-brand-sandLine px-3 py-2">
                      <span className="flex flex-wrap items-center gap-x-2 text-[14px] text-brand-ink">
                        <Icon name="person" className="text-[19px] text-brand-navy" />
                        <TutorRatingBadge tutorId={tutorId} />
                      </span>
                      <button type="button" onClick={() => setRatingTutorId(tutorId)} className={PORTAL_BTN_GHOST}>
                        <Icon name="star" className="text-[18px]" />
                        Đánh giá gia sư
                      </button>
                    </div>
                  )}

                  {item.status !== "ACTIVE" && item.cancellationReason && (
                    <p className="text-[13.5px] text-brand-muted">
                      Lý do hủy: <span className="text-brand-ink">{item.cancellationReason}</span>
                    </p>
                  )}
                </div>

                <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1 border-t border-brand-sandLine px-3 py-2 text-[13px] text-brand-muted">
                  <span className="whitespace-nowrap px-2">Ghi danh ngày {formatDate(new Date(item.enrolledAt))}</span>
                  <div className="flex flex-wrap justify-end gap-1">
                    {item.status === "ACTIVE" && (
                      <>
                        <Link to={ROUTES.studentSchedule} className={PORTAL_BTN_GHOST}>
                          <Icon name="calendar_month" className="text-[18px]" />
                          Lịch học
                        </Link>
                        {canTransfer(item) && (
                          <button type="button" onClick={() => setTransferring(item)} className={PORTAL_BTN_GHOST}>
                            <Icon name="swap_horiz" className="text-[18px]" />
                            Đổi lớp
                          </button>
                        )}
                        {item.cancellable ? (
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
                        ) : (
                          (!item.refundStatus || item.refundStatus === "COMPLETED") && (
                            <span className="self-center px-2 text-[12.5px]">Liên hệ admin để hủy</span>
                          )
                        )}
                      </>
                    )}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <TutorRatingDialog tutorId={ratingTutorId} onClose={() => setRatingTutorId(null)} />

      <TransferClassDialog
        enrollment={transferring}
        current={transferring ? classById.get(transferring.classGroupId) : undefined}
        onClose={() => setTransferring(null)}
        onDone={(message) => {
          setTransferring(null);
          setNotice(message);
          void refreshMine();
          void queryClient.invalidateQueries({ queryKey: ["catalog-class"] });
          void queryClient.invalidateQueries({ queryKey: ["transfer-options"] });
        }}
      />

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
