import { useEffect, useRef, useState } from "react";
import { CourseCover } from "@/components/admin/CourseCover";
import { StatusChip } from "@/components/dashboard/StatusChip";
import { Icon } from "@/components/ui/Icon";
import { FOCUS_RING } from "@/constants/classNames";
import { CLASS_STATUS, CLASS_TYPE_LABEL, ENROLLMENT_STATUS, SESSION_STATUS } from "@/constants/labels";
import { patternLabel } from "@/constants/management";
import { useAdminSessions, useUserDirectory } from "@/hooks/useAdminData";
import { useClassEnrollments } from "@/hooks/useManagementData";
import type { AdminClassResponse } from "@/interfaces/dto";
import { formatVnd } from "@/utils/currency";
import { classNextStep, classStatusActions, discountForSize, estimatedEndDate, sizeTierLabel, displayCode } from "@/utils/classes";
import { formatDate, parseIsoDate } from "@/utils/date";

// "02/11/2026" từ "2026-11-02"
const isoToText = (iso: string | null | undefined) => (iso ? formatDate(parseIsoDate(iso)) : "–");

interface ClassDetailSheetProps {
  // Lớp đang xem; null là đóng ngăn
  classItem: AdminClassResponse | null;
  onClose: () => void;
  onChangeStatus: (item: AdminClassResponse, mode: "status" | "reopen") => void;
  // Mở hộp thoại phân công gia sư chính cho lớp chưa có gia sư
  onAssign?: (item: AdminClassResponse) => void;
}

// Ngăn chi tiết lớp học trượt từ cạnh phải (thẻ <dialog> gốc: giữ tiêu điểm, Esc để đóng):
// trạng thái và việc cần làm tiếp, thông tin chính, sĩ số và học phí, học viên, lịch từng buổi (thu gọn).
// Hộp thoại đổi trạng thái / mở lại mở chồng lên trên ngăn này.
export function ClassDetailSheet({ classItem, onClose, onChangeStatus, onAssign }: ClassDetailSheetProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const open = classItem !== null;

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-label={classItem ? `Lớp ${classItem.classCode}` : "Chi tiết lớp học"}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => {
        if (event.target === ref.current) onClose();
      }}
      className="fixed inset-y-0 left-auto right-0 m-0 h-dvh max-h-dvh w-full max-w-[640px] border-0 bg-transparent p-0 backdrop:bg-brand-navyDeep/35 backdrop:backdrop-blur-[1px] open:animate-[sheet-in_220ms_cubic-bezier(0.2,0.8,0.2,1)] motion-reduce:open:animate-none"
    >
      <style>{"@keyframes sheet-in{from{transform:translateX(24px);opacity:0}to{transform:none;opacity:1}}"}</style>
      {classItem && <SheetBody item={classItem} onClose={onClose} onChangeStatus={onChangeStatus} onAssign={onAssign} />}
    </dialog>
  );
}

// Nội dung ngăn chi tiết lớp: thông tin lớp, việc cần làm tiếp, học viên và lịch từng buổi
function SheetBody({ item, onClose, onChangeStatus, onAssign }: { item: AdminClassResponse } & Omit<ClassDetailSheetProps, "classItem">) {
  const [activeTab, setActiveTab] = useState<"overview" | "students" | "sessions">("overview");
  const style = CLASS_STATUS[item.status];
  const next = classNextStep(item, new Date());
  const actions = classStatusActions(item, new Date());
  const reopen = item.status === "FAILED_TO_OPEN";
  // Nút chính: bước tiến (không phải Hủy); chỉ có Hủy thì để trong hộp thoại "Cập nhật lớp"
  const primary = actions.find((action) => !action.danger);
  const closed = item.status === "COMPLETED" || item.status === "CANCELLED";
  const percent = Math.min(100, Math.round((item.currentStudents / Math.max(1, item.maxStudents)) * 100));
  const directory = useUserDirectory();
  const enrollments = useClassEnrollments(item.id);
  const sessions = useAdminSessions({ classGroupId: item.id, size: 100 });
  const sessionList = [...(sessions.data?.content ?? [])].sort((a, b) => (a.date + a.startTime).localeCompare(b.date + b.startTime));
  // Ngày kết thúc: buổi cuối thật nếu đã có lịch, chưa có thì ước tính theo mẫu lịch
  const lastSession = sessionList.filter((s) => s.status !== "CANCELLED").slice(-1)[0];
  const endDate = lastSession?.date ?? estimatedEndDate(item.startDate, item.schedulePattern, item.totalSessions);
  // Học phí mỗi học viên theo sĩ số hiện tại (người đã đóng giữ giá đã chốt)
  const size = Math.max(1, item.currentStudents);
  const discount = discountForSize(item.classType, size);
  const tutor = item.tutorName ?? (item.tutorId ? `Gia sư ${displayCode("tutor", item.tutorId)}` : null);
  const showDeadline = ["DRAFT", "PUBLISHED", "ENROLLING"].includes(item.status);

  return (
    <div className="flex h-full flex-col bg-white text-brand-ink shadow-[-30px_0_80px_-30px_rgba(8,42,102,0.45)]">
      <header className="shrink-0 border-b border-brand-sandLine p-6">
        <div className="flex items-start gap-4">
          <CourseCover subject={item.subject} gradeLevel={item.gradeLevel} size="lg" muted={closed} />
          <div className="min-w-0 flex-1 pt-0.5">
            <p className="text-[12.5px] font-medium text-brand-muted">{item.classCode}</p>
            <h2 className="mt-0.5 text-[20px] font-bold leading-snug text-brand-navy">{item.courseName}</h2>
            <div className="mt-2">
              <StatusChip tone={style.tone} icon={style.icon}>
                {style.label}
              </StatusChip>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng"
            className={`-mr-2 -mt-2 flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-slate-500 transition-colors hover:bg-brand-sand hover:text-brand-navy ${FOCUS_RING}`}
          >
            <Icon name="close" className="text-[22px]" />
          </button>
        </div>

        {
          // Việc cần làm tiếp và thao tác chính (lớp đã đóng thì không hiện)
        }
        {!closed && (next || actions.length > 0 || reopen) && (
          <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-brand-sand/60 py-2 pl-4 pr-2">
            <p className={`min-w-0 text-[13.5px] font-medium ${next ? "text-amber-800" : "text-brand-muted"}`}>
              {next ? next.text : "Không có việc cần làm."}
            </p>
            <div className="flex shrink-0 gap-2">
              {next?.action === "assign" && !item.tutorId && onAssign && (
                <button
                  type="button"
                  onClick={() => onAssign(item)}
                  className={`inline-flex h-10 items-center gap-1.5 rounded-xl bg-brand-navy px-4 text-[14px] font-semibold text-white hover:bg-brand-navyDeep ${FOCUS_RING}`}
                >
                  Phân công gia sư
                </button>
              )}
              {(reopen || actions.length > 0) && (
                <button
                  type="button"
                  onClick={() => onChangeStatus(item, reopen ? "reopen" : "status")}
                  className={`inline-flex h-10 items-center gap-1.5 rounded-xl border border-brand-sandLine bg-white px-4 text-[14px] font-semibold text-brand-navy hover:border-brand-navy/40 hover:bg-brand-tint ${FOCUS_RING}`}
                >
                  {reopen ? "Mở lại lớp" : (primary?.label ?? "Cập nhật lớp")}
                </button>
              )}
            </div>
          </div>
        )}
        {/* Thanh chuyển Tab */}
        <div className="mt-5 flex border-b border-brand-sandLine">
          <button
            type="button"
            onClick={() => setActiveTab("overview")}
            className={`flex items-center gap-1.5 border-b-2 px-4 py-2.5 text-[13.5px] font-bold transition-colors ${
              activeTab === "overview"
                ? "border-brand-navy text-brand-navy"
                : "border-transparent text-brand-muted hover:text-brand-ink"
            }`}
          >
            <Icon name="info" className="text-[17px]" />
            Tổng quan
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("students")}
            className={`flex items-center gap-1.5 border-b-2 px-4 py-2.5 text-[13.5px] font-bold transition-colors ${
              activeTab === "students"
                ? "border-brand-navy text-brand-navy"
                : "border-transparent text-brand-muted hover:text-brand-ink"
            }`}
          >
            <Icon name="group" className="text-[17px]" />
            Danh sách học viên
            <span className="ml-1 rounded-full bg-brand-sand px-2 py-0.5 text-[11px] font-extrabold text-brand-navy">
              {item.currentStudents}
            </span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("sessions")}
            className={`flex items-center gap-1.5 border-b-2 px-4 py-2.5 text-[13.5px] font-bold transition-colors ${
              activeTab === "sessions"
                ? "border-brand-navy text-brand-navy"
                : "border-transparent text-brand-muted hover:text-brand-ink"
            }`}
          >
            <Icon name="calendar_month" className="text-[17px]" />
            Lịch từng buổi
            {sessionList.length > 0 && (
              <span className="ml-1 rounded-full bg-brand-sand px-2 py-0.5 text-[11px] font-extrabold text-brand-navy">
                {sessionList.length}
              </span>
            )}
          </button>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto overscroll-contain">
        {/* Tab 1: Tổng quan */}
        {activeTab === "overview" && (
          <div>
            <dl className="grid grid-cols-2 gap-x-6 gap-y-4 border-b border-brand-sandLine p-6">
              <Fact label="Lịch học" value={patternLabel(item.schedulePattern)} sub={item.timeSlotLabel} />
              <Fact label="Thời gian" value={`${isoToText(item.startDate)} → ${isoToText(endDate)}`} sub={`${item.totalSessions} buổi`} />
              <Fact
                label="Hình thức"
                value={`${CLASS_TYPE_LABEL[item.classType]} - ${item.deliveryMode === "ONLINE" ? "Online" : "Tại trung tâm"}`}
                sub={item.deliveryMode === "ONLINE" && item.meetingUrl ? item.meetingUrl : undefined}
              />
              <Fact label="Gia sư" value={tutor ?? "Chưa phân công"} muted={!tutor} />
              {showDeadline && <Fact label="Hạn đăng ký" value={isoToText(item.enrollmentDeadline)} />}
            </dl>

            <section className="p-6">
              <h3 className="text-[15px] font-bold text-brand-navy mb-3">Sĩ số & Học phí theo quy mô</h3>
              <div className="flex items-baseline justify-between gap-4">
                <p className="text-[22px] font-extrabold tabular-nums text-brand-ink">
                  {item.currentStudents}
                  <span className="text-[14px] font-semibold text-brand-muted">/{item.maxStudents} học viên</span>
                </p>
                <p className="text-right text-[13.5px] text-brand-muted">
                  <strong className="font-semibold tabular-nums text-brand-ink">
                    {formatVnd(Math.round(item.basePrice1on1 * (1 - discount)))}
                  </strong>
                  /người - {sizeTierLabel(item.classType, size)}
                  {discount > 0 && `, −${Math.round(discount * 100)}%`}
                </p>
              </div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-brand-sand" aria-hidden="true">
                <div className={`h-full rounded-full ${item.full ? "bg-emerald-500" : "bg-brand-navy"}`} style={{ width: `${percent}%` }} />
              </div>
            </section>
          </div>
        )}

        {/* Tab 2: Danh sách học viên */}
        {activeTab === "students" && (
          <section className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[16px] font-bold text-brand-navy">Danh sách học viên ghi danh</h3>
              <span className="text-[13px] text-brand-muted">Tổng cộng: {item.currentStudents} học viên</span>
            </div>
            {enrollments.isPending ? (
              <p className="text-[14px] text-brand-muted py-8 text-center">Đang tải danh sách học viên…</p>
            ) : enrollments.isError ? (
              <p className="text-[14px] text-red-700 py-8 text-center">Không tải được danh sách học viên.</p>
            ) : enrollments.data.content.length === 0 ? (
              <div className="rounded-2xl border border-brand-sandLine bg-brand-sand/30 p-8 text-center text-brand-muted">
                <Icon name="person_off" className="text-[32px] mb-2" />
                <p className="text-[14px]">Chưa có học viên nào ghi danh vào lớp này.</p>
              </div>
            ) : (
              <div className="overflow-hidden rounded-xl border border-brand-sandLine">
                <table className="w-full text-left text-[13.5px]">
                  <thead className="bg-brand-sand/50 text-[12.5px] font-bold text-brand-muted border-b border-brand-sandLine">
                    <tr>
                      <th className="py-2.5 pl-4 pr-2">Học viên</th>
                      <th className="py-2.5 px-2">Trạng thái</th>
                      <th className="py-2.5 pl-2 pr-4 text-right">Học phí</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-brand-sandLine">
                    {enrollments.data.content.map((enrollment) => {
                      const status = ENROLLMENT_STATUS[enrollment.status];
                      return (
                        <tr key={enrollment.enrollmentId} className="hover:bg-brand-sand/20 transition-colors">
                          <td className="py-3 pl-4 pr-2">
                            <div className="font-semibold text-brand-ink">
                              {directory.nameOf(enrollment.studentId) ?? `Học viên ${displayCode("student", enrollment.studentId)}`}
                            </div>
                            <div className="text-[11.5px] text-brand-muted">
                              Mã HV: {displayCode("student", enrollment.studentId)}
                            </div>
                          </td>
                          <td className="py-3 px-2">
                            <StatusChip tone={status.tone} icon={status.icon}>
                              {status.label}
                            </StatusChip>
                          </td>
                          <td className="py-3 pl-2 pr-4 text-right tabular-nums font-semibold text-brand-ink">
                            {formatVnd(enrollment.feeCharged)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}

        {/* Tab 3: Lịch từng buổi */}
        {activeTab === "sessions" && (
          <div className="p-6">
            <h3 className="text-[16px] font-bold text-brand-navy mb-4">Lịch trình các buổi học</h3>
            {sessions.isPending ? (
              <p className="text-[14px] text-brand-muted py-8 text-center">Đang tải lịch học…</p>
            ) : sessionList.length === 0 ? (
              <div className="rounded-2xl border border-brand-sandLine bg-brand-sand/30 p-8 text-center text-brand-muted">
                <Icon name="event_busy" className="text-[32px] mb-2" />
                <p className="text-[14px]">Lịch sẽ được tự động tạo khi lớp mở đăng ký.</p>
              </div>
            ) : (
              <ol className="divide-y divide-brand-sandLine rounded-xl border border-brand-sandLine">
                {sessionList.map((session) => {
                  const status = SESSION_STATUS[session.status] ?? SESSION_STATUS.SCHEDULED;
                  return (
                    <li key={session.sessionId} className="flex items-center gap-3 px-4 py-3 text-[13.5px] hover:bg-brand-sand/20 transition-colors">
                      <span className="w-8 shrink-0 text-right font-mono font-bold text-brand-muted">
                        #{session.sessionNumber}
                      </span>
                      <span className="flex-1 tabular-nums text-brand-ink">
                        {isoToText(session.date)} • {session.startTime.slice(0, 5)}–{session.endTime.slice(0, 5)}
                        {session.originalSessionId !== null && (
                          <span className="ml-2 rounded bg-amber-100 px-1.5 py-0.5 text-[11px] font-bold text-amber-800">
                            học bù
                          </span>
                        )}
                      </span>
                      <StatusChip tone={status.tone} icon={status.icon}>
                        {status.label}
                      </StatusChip>
                    </li>
                  );
                })}
              </ol>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// Một dòng thông tin dạng nhãn - giá trị trong ngăn chi tiết
function Fact({ label, value, sub, muted = false }: { label: string; value: string; sub?: string; muted?: boolean }) {
  return (
    <div className="min-w-0">
      <dt className="text-[12.5px] text-brand-muted">{label}</dt>
      <dd className={`mt-0.5 truncate text-[14.5px] font-semibold ${muted ? "text-brand-muted" : "text-brand-ink"}`}>{value}</dd>
      {sub && <dd className="truncate text-[12.5px] text-brand-muted">{sub}</dd>}
    </div>
  );
}
