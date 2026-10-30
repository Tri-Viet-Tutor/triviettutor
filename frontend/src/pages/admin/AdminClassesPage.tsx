import { useState } from "react";
import { ClassFormDialog } from "@/components/admin/ClassFormDialog";
import { ClassStatusDialog } from "@/components/admin/ClassStatusDialog";
import { FilterTabs } from "@/components/dashboard/FilterTabs";
import { Pager } from "@/components/dashboard/Pager";
import { PortalPageHeader } from "@/components/dashboard/PortalPageHeader";
import { PortalEmpty, PortalError, PortalLoading } from "@/components/dashboard/PortalState";
import { StatTile } from "@/components/dashboard/StatTile";
import { StatusChip } from "@/components/dashboard/StatusChip";
import { Icon } from "@/components/ui/Icon";
import { PORTAL_BTN_ACCENT, PORTAL_BTN_GHOST, PORTAL_CARD, PORTAL_INPUT } from "@/constants/classNames";
import { SCHEDULE_PATTERN_OPTIONS } from "@/constants/classOptions";
import { CLASS_STATUS, CLASS_STATUS_ORDER, CLASS_TYPE_LABEL, ENROLLMENT_STATUS } from "@/constants/labels";
import { gradeLabel, patternLabel, subjectIcon, subjectLabel } from "@/constants/management";
import { useRefreshAdmin, useUserDirectory } from "@/hooks/useAdminData";
import { useAdminClasses, useClassEnrollments } from "@/hooks/useManagementData";
import { formatVnd } from "@/utils/currency";
import { formatDate, parseIsoDate } from "@/utils/date";
import type { AdminClassResponse, ClassStatus, ClassType, SchedulePattern } from "@/interfaces/api";
import type { ClassEnrollmentsPanelProps } from "@/interfaces/admin";

const PAGE_SIZE = 10;

/** "02/11/2026" từ "2026-11-02" */
const isoToText = (iso: string | null) => (iso ? formatDate(parseIsoDate(iso)) : "–");

/** Danh sách học viên đã đóng học phí của một lớp (GET /admin/classes/{id}/enrollments) */
function ClassEnrollmentsPanel({ classId, nameOf }: ClassEnrollmentsPanelProps) {
  const enrollments = useClassEnrollments(classId);
  if (enrollments.isPending) return <p className="px-5 py-4 text-[14px] text-brand-muted">Đang tải danh sách học viên…</p>;
  if (enrollments.isError) return <p className="px-5 py-4 text-[14px] text-red-700">Không tải được danh sách học viên.</p>;
  if (enrollments.data.content.length === 0)
    return <p className="px-5 py-4 text-[14px] text-brand-muted">Chưa có học viên nào đóng học phí cho lớp này.</p>;
  return (
    <ul className="divide-y divide-brand-sandLine">
      {enrollments.data.content.map((enrollment) => {
        const status = ENROLLMENT_STATUS[enrollment.status];
        return (
          <li key={enrollment.enrollmentId} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-5 py-3 text-[14px]">
            <span className="min-w-[180px] flex-1 font-semibold text-brand-ink">
              {nameOf(enrollment.studentId) ?? `Học viên #${enrollment.studentId}`}
            </span>
            <span className="tabular-nums text-brand-muted">
              {formatVnd(enrollment.feeCharged)}
              {enrollment.discountRate > 0 && (
                <span className="ml-1 text-emerald-700">(−{Math.round(enrollment.discountRate * 100)}%)</span>
              )}
            </span>
            <span className="text-brand-muted">Ghi danh {formatDate(new Date(enrollment.enrolledAt))}</span>
            <StatusChip tone={status.tone} icon={status.icon}>
              {status.label}
            </StatusChip>
          </li>
        );
      })}
    </ul>
  );
}

/**
 * Quản lý lớp học: lọc theo trạng thái / loại lớp / lịch, mở lớp mới, đổi trạng thái,
 * mở lại lớp không đủ sĩ số và xem học viên đã ghi danh.
 * API: GET/POST /admin/classes, PATCH /admin/classes/{id}/status, POST /admin/classes/{id}/reopen,
 * GET /admin/classes/{id}/enrollments.
 */
export function AdminClassesPage() {
  const [status, setStatus] = useState<ClassStatus | "">("");
  const [classType, setClassType] = useState<ClassType | "ALL">("ALL");
  const [pattern, setPattern] = useState<SchedulePattern | "">("");
  const [page, setPage] = useState(0);
  const [creating, setCreating] = useState(false);
  const [statusTarget, setStatusTarget] = useState<{ item: AdminClassResponse; mode: "status" | "reopen" } | null>(null);
  const [expanded, setExpanded] = useState<number | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const refresh = useRefreshAdmin();
  const directory = useUserDirectory();

  const classes = useAdminClasses({
    status: status || undefined,
    classType: classType === "ALL" ? undefined : classType,
    schedulePattern: pattern || undefined,
    page,
    size: PAGE_SIZE,
  });
  // Ô số liệu: tổng số lớp theo vài trạng thái chính
  const enrolling = useAdminClasses({ status: "ENROLLING", size: 1 });
  const running = useAdminClasses({ status: "IN_PROGRESS", size: 1 });
  const all = useAdminClasses({ size: 1 });

  const count = (value: number | undefined) => (value === undefined ? "–" : String(value));

  function handleSaved(text: string) {
    setNotice(text);
    setCreating(false);
    setStatusTarget(null);
    void refresh();
  }

  return (
    <div>
      <PortalPageHeader
        icon="school"
        title="Lớp học"
        description="Mở lớp từ khóa học, theo dõi sĩ số và đưa lớp qua từng giai đoạn: tuyển sinh, phân công, khai giảng."
        action={
          <button type="button" onClick={() => setCreating(true)} className={PORTAL_BTN_ACCENT}>
            <Icon name="add" className="text-[20px]" />
            Mở lớp mới
          </button>
        }
      />

      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <StatTile icon="school" label="Tổng số lớp" value={count(all.data?.totalElements)} />
        <StatTile icon="how_to_reg" tone="orange" label="Đang tuyển sinh" value={count(enrolling.data?.totalElements)} />
        <StatTile icon="play_circle" tone="green" label="Đang học" value={count(running.data?.totalElements)} />
      </div>

      <div className={`mb-5 flex flex-col gap-3 p-3 sm:p-4 lg:flex-row lg:items-center lg:justify-between ${PORTAL_CARD}`}>
        <FilterTabs
          label="Loại lớp"
          value={classType}
          onChange={(value) => {
            setClassType(value);
            setPage(0);
          }}
          tabs={[
            { value: "ALL", label: "Mọi loại lớp" },
            { value: "GROUP", label: CLASS_TYPE_LABEL.GROUP },
            { value: "ONE_ON_ONE", label: CLASS_TYPE_LABEL.ONE_ON_ONE },
          ]}
        />
        <div className="grid grid-cols-2 gap-2 sm:flex">
          <select
            aria-label="Trạng thái lớp"
            value={status}
            onChange={(event) => {
              setStatus(event.target.value as ClassStatus | "");
              setPage(0);
            }}
            className={`${PORTAL_INPUT} sm:w-[190px]`}
          >
            <option value="">Mọi trạng thái</option>
            {CLASS_STATUS_ORDER.map((value) => (
              <option key={value} value={value}>
                {CLASS_STATUS[value].label}
              </option>
            ))}
          </select>
          <select
            aria-label="Lịch học"
            value={pattern}
            onChange={(event) => {
              setPattern(event.target.value as SchedulePattern | "");
              setPage(0);
            }}
            className={`${PORTAL_INPUT} sm:w-[170px]`}
          >
            <option value="">Mọi lịch học</option>
            {SCHEDULE_PATTERN_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
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

      {classes.isPending ? (
        <PortalLoading label="Đang tải lớp học" rows={4} />
      ) : classes.isError ? (
        <PortalError message="Không tải được danh sách lớp." onRetry={() => void classes.refetch()} />
      ) : classes.data.content.length === 0 ? (
        <PortalEmpty
          icon="school"
          title="Chưa có lớp phù hợp"
          description="Đổi bộ lọc, hoặc mở lớp mới từ một khóa học đang bán."
          action={
            <button type="button" onClick={() => setCreating(true)} className={PORTAL_BTN_ACCENT}>
              <Icon name="add" className="text-[20px]" />
              Mở lớp mới
            </button>
          }
        />
      ) : (
        <>
          <ul className="space-y-3">
            {classes.data.content.map((item) => {
              const style = CLASS_STATUS[item.status];
              const filled = item.currentStudents + item.reservedStudents;
              const percent = Math.min(100, Math.round((filled / Math.max(1, item.maxStudents)) * 100));
              const isOpen = expanded === item.id;
              return (
                <li key={item.id} className={`overflow-hidden ${PORTAL_CARD}`}>
                  <div className="grid gap-4 p-4 sm:p-5 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)_minmax(0,0.9fr)_auto] lg:items-center">
                    {/* Tên lớp */}
                    <div className="flex min-w-0 items-start gap-3">
                      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-tint text-brand-navy">
                        <Icon name={subjectIcon(item.subject)} className="text-[23px]" />
                      </span>
                      <div className="min-w-0">
                        <p className="font-mono text-[12.5px] font-semibold text-brand-orangeHover">{item.classCode}</p>
                        <h2 className="truncate text-[16px] font-bold text-brand-ink">{item.courseName}</h2>
                        <p className="text-[13px] text-brand-muted">
                          {subjectLabel(item.subject)} · {gradeLabel(item.gradeLevel)} · {CLASS_TYPE_LABEL[item.classType]} ·{" "}
                          {item.deliveryMode === "ONLINE" ? "Trực tuyến" : "Tại trung tâm"}
                        </p>
                      </div>
                    </div>

                    {/* Lịch */}
                    <div className="text-[13.5px] text-brand-ink">
                      <p className="flex items-center gap-1.5">
                        <Icon name="calendar_month" className="text-[17px] text-brand-navy" />
                        {patternLabel(item.schedulePattern)} · {item.timeSlotLabel}
                      </p>
                      <p className="mt-1 flex items-center gap-1.5 text-brand-muted">
                        <Icon name="flag" className="text-[17px] text-brand-orange" />
                        Khai giảng {isoToText(item.startDate)}
                      </p>
                      {item.enrollmentDeadline && (
                        <p className="mt-0.5 pl-[23px] text-[12.5px] text-brand-muted">Hạn đăng ký {isoToText(item.enrollmentDeadline)}</p>
                      )}
                    </div>

                    {/* Sĩ số */}
                    <div>
                      <div className="flex items-baseline justify-between text-[13px]">
                        <span className="font-semibold text-brand-ink tabular-nums">
                          {item.currentStudents}/{item.maxStudents} học viên
                        </span>
                        {item.reservedStudents > 0 && <span className="text-brand-muted">+{item.reservedStudents} giữ chỗ</span>}
                      </div>
                      <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-brand-sand" aria-hidden="true">
                        <div
                          className={`h-full rounded-full ${item.full ? "bg-emerald-500" : "bg-gradient-to-r from-brand-navy to-[#1F63D8]"}`}
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                      {/* Backend trả estimatedFee = null khi lớp đã đủ chỗ (không còn ghế để báo giá) */}
                      <p className="mt-1 text-[12.5px] text-brand-muted tabular-nums">
                        {item.estimatedFee != null ? `Học phí ước tính ${formatVnd(item.estimatedFee)}` : "Lớp đã đủ chỗ"}
                      </p>
                    </div>

                    {/* Trạng thái + thao tác */}
                    <div className="flex flex-wrap items-center gap-2 lg:flex-col lg:items-end">
                      <StatusChip tone={style.tone} icon={style.icon}>
                        {style.label}
                      </StatusChip>
                      <div className="flex flex-wrap gap-1">
                        {item.status === "FAILED_TO_OPEN" ? (
                          <>
                            <button type="button" onClick={() => setStatusTarget({ item, mode: "reopen" })} className={PORTAL_BTN_GHOST}>
                              <Icon name="restart_alt" className="text-[18px]" />
                              Mở lại
                            </button>
                            {/* Backend từ chối hủy lớp còn học viên (CLASS_REFUND_REQUIRED); span giữ tooltip khi nút bị khóa */}
                            <span title={item.currentStudents > 0 ? "Hoàn tiền cho học viên trước khi hủy lớp" : undefined}>
                              <button
                                type="button"
                                onClick={() => setStatusTarget({ item, mode: "status" })}
                                disabled={item.currentStudents > 0}
                                aria-label={item.currentStudents > 0 ? "Hủy lớp (hoàn tiền cho học viên trước khi hủy lớp)" : undefined}
                                className={PORTAL_BTN_GHOST}
                              >
                                <Icon name="cancel" className="text-[18px]" />
                                Hủy lớp
                              </button>
                            </span>
                          </>
                        ) : (
                          item.status !== "COMPLETED" &&
                          item.status !== "CANCELLED" && (
                            <button type="button" onClick={() => setStatusTarget({ item, mode: "status" })} className={PORTAL_BTN_GHOST}>
                              <Icon name="swap_horiz" className="text-[18px]" />
                              Đổi trạng thái
                            </button>
                          )
                        )}
                        <button
                          type="button"
                          aria-expanded={isOpen}
                          onClick={() => setExpanded(isOpen ? null : item.id)}
                          className={PORTAL_BTN_GHOST}
                        >
                          <Icon name="groups" className="text-[18px]" />
                          Học viên
                          <Icon name={isOpen ? "expand_less" : "expand_more"} className="text-[18px]" />
                        </button>
                      </div>
                    </div>
                  </div>
                  {isOpen && (
                    <div className="border-t border-brand-sandLine bg-brand-sand/40">
                      <ClassEnrollmentsPanel classId={item.id} nameOf={directory.nameOf} />
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
          <Pager page={page} totalPages={classes.data.totalPages} onChange={setPage} label="Phân trang lớp học" />
        </>
      )}

      <ClassFormDialog
        open={creating}
        onClose={() => setCreating(false)}
        onSaved={(saved) => handleSaved(`Đã mở lớp ${saved.classCode}.`)}
      />
      <ClassStatusDialog
        classItem={statusTarget?.item ?? null}
        mode={statusTarget?.mode ?? "status"}
        onClose={() => setStatusTarget(null)}
        onSaved={(saved) => handleSaved(`Lớp ${saved.classCode}: ${CLASS_STATUS[saved.status].label}.`)}
      />
    </div>
  );
}
