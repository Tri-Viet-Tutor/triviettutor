import { useEffect, useState } from "react";
import { AdminToast } from "@/components/admin/AdminToast";
import type { AdminNotice } from "@/interfaces/ui";
import { ClassDetailSheet } from "@/components/admin/ClassDetailSheet";
import { AssignmentPanel } from "@/components/admin/AssignmentPanel";
import { PortalDialog } from "@/components/dashboard/PortalDialog";
import { ClassFormDialog } from "@/components/admin/ClassFormDialog";
import { ClassStatusDialog } from "@/components/admin/ClassStatusDialog";
import { RowMenu } from "@/components/admin/RowMenu";
import { UserAvatar } from "@/components/ui/UserAvatar";
import { ConfirmDeleteDialog } from "@/components/admin/ConfirmDeleteDialog";
import { deleteClass } from "@/services/managementService";
import { Pager } from "@/components/dashboard/Pager";
import { PortalPageHeader } from "@/components/dashboard/PortalPageHeader";
import { PortalEmpty, PortalError, PortalLoading } from "@/components/dashboard/PortalState";
import { StatusChip } from "@/components/dashboard/StatusChip";
import { Icon } from "@/components/ui/Icon";
import { FOCUS_RING, PORTAL_BTN_SECONDARY } from "@/constants/classNames";
import { CLASS_STATUS, CLASS_TYPE_LABEL } from "@/constants/labels";
import { patternLabel } from "@/constants/management";
import { useRefreshAdmin } from "@/hooks/useAdminData";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { useAdminClasses, useAdminCourses, useClassSummary } from "@/hooks/useManagementData";
import type { AdminClassResponse, ClassStatus, ClassType } from "@/interfaces/dto";
import { classNextStep, classStatusActions, displayCode } from "@/utils/classes";
import { formatDayMonth, parseIsoDate } from "@/utils/date";

const PAGE_SIZE = 12;

// "02/11" từ "2026-11-02"
const isoToShort = (iso: string) => formatDayMonth(parseIsoDate(iso));

// Vòng đời chính của lớp (BR-04), hiển thị nối tiếp nhau trên thanh trạng thái
const MAIN_FLOW: ClassStatus[] = ["DRAFT", "PUBLISHED", "ENROLLING", "ASSIGNED", "IN_PROGRESS", "COMPLETED"];
// Hai trạng thái ngoại lệ, tách riêng
const EXCEPTIONS: ClassStatus[] = ["FAILED_TO_OPEN", "CANCELLED"];

// Khung chung của các điều khiển trên thanh công cụ
const CONTROL = "h-12 rounded-xl border border-brand-sandLine bg-white shadow-[0_1px_2px_rgba(20,33,61,0.05)]";
const STRIP_SELECT = `h-full min-w-0 cursor-pointer appearance-none bg-transparent pl-3 pr-8 text-[14px] font-medium text-brand-ink outline-none ${FOCUS_RING}`;

const TOAST_MS = 4000;

// Quản lý lớp học: lớp là đợt mở thực tế của một khóa (lịch cố định, gia sư, học viên, học phí theo sĩ số).
// - Thanh công cụ: tìm theo mã lớp / tên khóa, lọc khóa, loại lớp; mở lớp mới.
// - Tab trạng thái: chỉ hiện các trạng thái đang có lớp, kèm số lớp.
// - Mỗi lớp một dòng gọn: tên + mã, lịch, sĩ số, gia sư, trạng thái và việc cần làm tiếp.
// - Bấm lớp mở ngăn chi tiết: thông tin đầy đủ, học viên đã ghi danh, lịch từng buổi kèm gia sư.
// API: GET/POST /admin/classes (lọc q, courseId, status, classType), GET /admin/classes/summary,
// PATCH /admin/classes/{id}/status, POST /admin/classes/{id}/reopen, GET /admin/classes/{id}/enrollments.
export function AdminClassesPage() {
  const [status, setStatus] = useState<ClassStatus | "">("");
  const [classType, setClassType] = useState<ClassType | "">("");
  const [courseId, setCourseId] = useState<number | "">("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [creating, setCreating] = useState(false);
  const [viewing, setViewing] = useState<AdminClassResponse | null>(null);
  const [statusTarget, setStatusTarget] = useState<{ item: AdminClassResponse; mode: "status" | "reopen" } | null>(null);
  const [notice, setNotice] = useState<AdminNotice | null>(null);
  // Lớp đang phân công gia sư chính (lớp cũ chưa có gia sư hoặc đã nhả gia sư)
  const [assigning, setAssigning] = useState<AdminClassResponse | null>(null);
  const [removing, setRemoving] = useState<AdminClassResponse | null>(null);
  const refresh = useRefreshAdmin();

  const keyword = useDebouncedValue(search.trim());
  const classes = useAdminClasses({
    q: keyword || undefined,
    courseId: courseId === "" ? undefined : courseId,
    status: status || undefined,
    classType: classType || undefined,
    page,
    size: PAGE_SIZE,
  });
  const summary = useClassSummary();
  const courses = useAdminCourses({ size: 100 });
  const rows = classes.data?.content ?? [];
  // Ngăn chi tiết luôn hiện bản mới nhất sau khi đổi trạng thái
  const viewingFresh = viewing ? (rows.find((item) => item.id === viewing.id) ?? viewing) : null;
  // Khung phân công cũng đọc bản mới nhất: phân công xong thì hiện gia sư mới và chuyển sang "Đổi gia sư"
  const assigningFresh = assigning ? (rows.find((item) => item.id === assigning.id) ?? assigning) : null;

  useEffect(() => setPage(0), [keyword]);

  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(null), TOAST_MS);
    return () => window.clearTimeout(timer);
  }, [notice]);

  // Đổi bộ lọc và quay về trang 1
  function changeFilter(apply: () => void) {
    apply();
    setPage(0);
  }

  // Xóa hết bộ lọc
  function clearFilters() {
    changeFilter(() => {
      setStatus("");
      setClassType("");
      setCourseId("");
      setSearch("");
    });
  }

  // Báo đã lưu, đóng hộp thoại và tải lại danh sách
  function saved(text: string) {
    setNotice({ tone: "ok", text });
    setCreating(false);
    setStatusTarget(null);
    void refresh();
  }

  const narrowed = status !== "" || classType !== "" || courseId !== "" || search.trim() !== "";
  // Số lớp ở một trạng thái (để hiện trên tab)
  const countOf = (value: ClassStatus | "") => (value === "" ? summary.data?.total : summary.data?.byStatus[value]);

  return (
    <div>
      <PortalPageHeader
        icon="school"
        title="Lớp học"
        description="Mỗi lớp là một đợt mở thực tế của khóa học: lịch cố định, gia sư, học viên và học phí theo sĩ số."
      />

      {
        // Thanh công cụ
      }
      <div className="mb-4 flex flex-col gap-4 xl:flex-row xl:items-center">
        <div className={`flex min-w-0 flex-1 items-stretch focus-within:border-brand-navy/40 ${CONTROL}`}>
          <label className="relative flex min-w-0 flex-1 items-center">
            <span className="sr-only">Tìm lớp theo mã lớp hoặc tên khóa</span>
            <Icon name="search" className="pointer-events-none absolute left-4 text-[21px] text-brand-muted" />
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Mã lớp hoặc tên khóa"
              className="h-full w-full min-w-0 rounded-l-xl bg-transparent pl-11 pr-2 text-[14.5px] outline-none placeholder:text-slate-400"
            />
          </label>
          <StripSelect
            label="Khóa học"
            value={courseId === "" ? "" : String(courseId)}
            onChange={(value) => changeFilter(() => setCourseId(value === "" ? "" : Number(value)))}
            options={[
              { value: "", label: "Mọi khóa" },
              ...(courses.data?.content ?? []).map((course) => ({ value: String(course.id), label: course.name })),
            ]}
            className="hidden max-w-[220px] md:flex"
          />
          <StripSelect
            label="Loại lớp"
            value={classType}
            onChange={(value) => changeFilter(() => setClassType(value as ClassType | ""))}
            options={[
              { value: "", label: "Mọi loại" },
              { value: "GROUP", label: CLASS_TYPE_LABEL.GROUP },
              { value: "ONE_ON_ONE", label: CLASS_TYPE_LABEL.ONE_ON_ONE },
            ]}
            last
          />
        </div>
        <button
          type="button"
          onClick={() => setCreating(true)}
          className={`inline-flex h-12 shrink-0 items-center justify-center gap-2 rounded-xl bg-brand-navy px-6 text-[14px] font-semibold text-white shadow-[0_1px_2px_rgba(20,33,61,0.12)] transition-colors hover:bg-brand-navyDeep ${FOCUS_RING}`}
        >
          <Icon name="add" className="text-[20px]" />
          Mở lớp mới
        </button>
      </div>

      {
        // Trạng thái lớp: chỉ hiện các trạng thái đang có lớp, theo thứ tự vòng đời
      }
      <div role="tablist" aria-label="Trạng thái lớp" className="-mx-1 mb-8 flex items-center gap-2 overflow-x-auto px-1 pb-1">
        <StatusTab label="Tất cả" count={countOf("")} selected={status === ""} onClick={() => changeFilter(() => setStatus(""))} />
        {[...MAIN_FLOW, ...EXCEPTIONS]
          .filter((value) => status === value || (countOf(value) ?? 0) > 0)
          .map((value) => (
            <StatusTab
              key={value}
              label={CLASS_STATUS[value].label}
              count={countOf(value)}
              selected={status === value}
              danger={EXCEPTIONS.includes(value)}
              onClick={() => changeFilter(() => setStatus(value))}
            />
          ))}
      </div>

      {classes.isPending ? (
        <PortalLoading label="Đang tải lớp học" rows={5} />
      ) : classes.isError ? (
        <PortalError message="Không tải được danh sách lớp." onRetry={() => void classes.refetch()} />
      ) : rows.length === 0 ? (
        <PortalEmpty
          icon="school"
          title={narrowed ? "Không có lớp nào khớp." : "Chưa có lớp học nào."}
          description={narrowed ? "Bỏ bớt bộ lọc hoặc đổi từ khóa tìm kiếm." : "Mở lớp đầu tiên từ một khóa học đang bán."}
          action={
            narrowed ? (
              <button type="button" onClick={clearFilters} className={PORTAL_BTN_SECONDARY}>
                Xóa bộ lọc
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setCreating(true)}
                className={`inline-flex h-10 items-center gap-1.5 rounded-xl bg-brand-navy px-4 text-[14px] font-semibold text-white ${FOCUS_RING}`}
              >
                <Icon name="add" className="text-[20px]" />
                Mở lớp mới
              </button>
            )
          }
        />
      ) : (
        <>
          <div className="overflow-x-auto rounded-sm border border-brand-sandLine bg-white">
            <table className="w-full min-w-[1040px] table-fixed border-collapse text-left">
              <thead className="bg-brand-sand/70 text-[11.5px] font-bold uppercase tracking-wide text-brand-muted">
                <tr>
                  <th scope="col" className="w-[9%] px-4 py-3">Mã</th>
                  <th scope="col" className="w-[24%] border-l border-brand-sandLine px-4 py-3">Lớp học</th>
                  <th scope="col" className="w-[19%] border-l border-brand-sandLine px-4 py-3">Lịch học</th>
                  <th scope="col" className="w-[14%] border-l border-brand-sandLine px-4 py-3">Sĩ số</th>
                  <th scope="col" className="w-[16%] border-l border-brand-sandLine px-4 py-3">Gia sư</th>
                  <th scope="col" className="w-[13%] border-l border-brand-sandLine px-4 py-3">Trạng thái</th>
                  <th scope="col" className="w-[5%] border-l border-brand-sandLine px-2 py-3">
                    <span className="sr-only">Thao tác</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((item) => (
                  <ClassRowCard
                    key={item.id}
                    item={item}
                    selected={viewingFresh?.id === item.id}
                    onOpen={() => setViewing(item)}
                    onChangeStatus={(mode) => setStatusTarget({ item, mode })}
                    onAssign={() => setAssigning(item)}
                    onDelete={() => setRemoving(item)}
                  />
                ))}
              </tbody>
            </table>
          </div>
          <Pager page={page} totalPages={classes.data.totalPages} onChange={setPage} label="Phân trang lớp học" />
        </>
      )}

      <AdminToast notice={notice} onClose={() => setNotice(null)} />
      <ConfirmDeleteDialog
        open={removing !== null}
        title="Xóa lớp học"
        message={removing ? `Xóa lớp ${displayCode("class", removing.id)} (${removing.courseName})? Lịch các buổi và phân công gia sư của lớp cũng bị xóa.` : ""}
        onClose={() => setRemoving(null)}
        onConfirm={async () => {
          if (!removing) return;
          await deleteClass(removing.id);
          setNotice({ tone: "ok", text: `Đã xóa lớp ${displayCode("class", removing.id)}.` });
          setViewing((current) => (current?.id === removing.id ? null : current));
          setRemoving(null);
          void refresh();
        }}
      />
      <ClassDetailSheet
        classItem={viewingFresh}
        onClose={() => setViewing(null)}
        onChangeStatus={(item, mode) => setStatusTarget({ item, mode })}
        onAssign={(item) => setAssigning(item)}
      />
      <PortalDialog
        open={assigning !== null}
        title="Phân công gia sư phụ trách"
        description="Chỉ gia sư không trùng lịch với các buổi của lớp mới phân công được."
        onClose={() => setAssigning(null)}
        widthClassName="max-w-[880px]"
      >
        {assigningFresh && (
          <AssignmentPanel key={assigningFresh.id} classId={assigningFresh.id} currentTutorId={assigningFresh.tutorId ?? null} info={assigningFresh} />
        )}
      </PortalDialog>
      <ClassFormDialog
        open={creating}
        onClose={() => setCreating(false)}
        onSaved={(created) => saved(`Đã tạo lớp ${created.classCode} (bản nháp). Chọn "Cập nhật lớp" → "Mở đăng ký" để học viên đăng ký.`)}
      />
      <ClassStatusDialog
        classItem={statusTarget?.item ?? null}
        mode={statusTarget?.mode ?? "status"}
        onClose={() => setStatusTarget(null)}
        onSaved={(updated) => {
          setViewing((current) => (current?.id === updated.id ? updated : current));
          saved(`Lớp ${updated.classCode}: ${CLASS_STATUS[updated.status].label}.`);
        }}
      />
    </div>
  );
}

// Ô chọn nằm trong dải công cụ
function StripSelect({
  label,
  value,
  onChange,
  options,
  className = "flex",
  last = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
  className?: string;
  last?: boolean;
}) {
  return (
    <>
      <span aria-hidden="true" className={`my-2.5 w-px bg-brand-sandLine ${className.includes("hidden") ? "hidden md:block" : ""}`} />
      <div className={`relative items-center ${className}`}>
        <select
          aria-label={label}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className={`${STRIP_SELECT} ${last ? "rounded-r-xl" : ""} w-full truncate`}
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <Icon name="expand_more" className="pointer-events-none absolute right-2 text-[19px] text-brand-muted" />
      </div>
    </>
  );
}

// Một bước trên thanh vòng đời lớp, kèm số lớp
function StatusTab({
  label,
  count,
  selected,
  danger = false,
  onClick,
}: {
  label: string;
  count?: number;
  selected: boolean;
  danger?: boolean;
  onClick: () => void;
}) {
  const empty = count === 0;
  return (
    <button
      type="button"
      role="tab"
      aria-selected={selected}
      onClick={onClick}
      className={`inline-flex h-10 shrink-0 items-center gap-2 whitespace-nowrap rounded-xl px-3.5 text-[13.5px] font-semibold transition-colors ${FOCUS_RING} ${
        selected
          ? danger
            ? "bg-red-600 text-white"
            : "bg-brand-navy text-white"
          : `border border-brand-sandLine bg-white hover:border-brand-navy/30 ${empty ? "text-brand-muted/70" : danger ? "text-red-700" : "text-brand-ink"}`
      }`}
    >
      {label}
      <span className={`text-[12px] tabular-nums ${selected ? "text-white/75" : "text-brand-muted"}`}>{count ?? "–"}</span>
    </button>
  );
}

// Một lớp ở dạng dòng gọn: tên khóa + mã lớp, lịch, sĩ số, gia sư, trạng thái và việc cần làm tiếp (nếu có).
// Bấm vào dòng mở chi tiết; học phí, học viên và lịch từng buổi nằm trong chi tiết.
function ClassRowCard({
  item,
  selected,
  onOpen,
  onChangeStatus,
  onAssign,
  onDelete,
}: {
  item: AdminClassResponse;
  onDelete: () => void;
  selected: boolean;
  onOpen: () => void;
  onChangeStatus: (mode: "status" | "reopen") => void;
  onAssign: () => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const style = CLASS_STATUS[item.status];
  const closed = item.status === "COMPLETED" || item.status === "CANCELLED";
  const next = classNextStep(item, new Date());
  const canUpdate = classStatusActions(item, new Date()).length > 0;
  const percent = Math.min(100, Math.round((item.currentStudents / Math.max(1, item.maxStudents)) * 100));
  const tutor = item.tutorName ?? (item.tutorId ? `Gia sư ${displayCode("tutor", item.tutorId)}` : null);

  return (
    <tr className={`border-t border-brand-sandLine ${selected ? "bg-brand-tint/50" : "hover:bg-brand-sand/50"}`}>
      <td className="h-14 px-4 py-2 align-middle">
        <span className={`text-[14px] font-bold tabular-nums ${closed ? "text-brand-muted" : "text-brand-navy"}`}>
          {displayCode("class", item.id)}
        </span>
      </td>

      <td className="border-l border-brand-sandLine px-4 py-2 align-middle">
        <button
          type="button"
          onClick={onOpen}
          className="block max-w-full truncate text-left text-[14.5px] font-semibold leading-tight text-brand-ink hover:text-brand-navy focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-navy"
        >
          {item.courseName}
        </button>
        <span className="mt-0.5 block truncate text-[12.5px] leading-tight text-brand-muted">
          {item.classCode} - {CLASS_TYPE_LABEL[item.classType]} - {item.deliveryMode === "ONLINE" ? "Online" : "Tại trung tâm"}
        </span>
      </td>

      <td className="border-l border-brand-sandLine px-4 py-2 align-middle">
        <span className="block text-[13.5px] leading-tight text-brand-ink">{patternLabel(item.schedulePattern)}</span>
        <span className="block text-[12.5px] leading-tight tabular-nums text-brand-muted">
          {item.timeSlotLabel} - từ {isoToShort(item.startDate)}
        </span>
      </td>

      <td className="border-l border-brand-sandLine px-4 py-2 align-middle">
        <span className="block text-[13.5px] font-semibold tabular-nums text-brand-ink">
          {item.currentStudents}/{item.maxStudents} học viên
        </span>
        <span aria-hidden="true" className="mt-1.5 block h-1.5 overflow-hidden bg-brand-sand">
          <span className={`block h-full ${item.full ? "bg-emerald-500" : "bg-brand-navy"}`} style={{ width: `${percent}%` }} />
        </span>
      </td>

      <td className="border-l border-brand-sandLine px-4 py-2 align-middle">
        <span className={`flex min-w-0 items-center gap-2 text-[13.5px] ${tutor ? "text-brand-ink" : "text-brand-muted"}`}>
          {tutor && <UserAvatar userId={item.tutorId} name={tutor} size={24} />}
          <span className="truncate">{tutor ?? "Chưa phân công"}</span>
        </span>
      </td>

      <td className="border-l border-brand-sandLine px-4 py-2 align-middle">
        <StatusChip tone={style.tone} icon={style.icon}>
          {style.label}
        </StatusChip>
        {next && <span className="mt-1.5 block text-[12px] leading-snug text-amber-700">{next.text}</span>}
      </td>

      <td className="border-l border-brand-sandLine px-2 py-2 text-center align-middle">
      <RowMenu
        label={`lớp ${item.classCode}`}
        open={menuOpen}
        onOpenChange={setMenuOpen}
        items={[
          { icon: "visibility", label: "Xem chi tiết", onSelect: onOpen },
          ...(item.status === "FAILED_TO_OPEN"
            ? [{ icon: "restart_alt", label: "Mở lại lớp", onSelect: () => onChangeStatus("reopen") }]
            : canUpdate
              ? [{ icon: "update", label: "Cập nhật lớp", onSelect: () => onChangeStatus("status") }]
              : []),
          ...(!item.tutorId && !closed && item.status !== "FAILED_TO_OPEN"
            ? [{ icon: "assignment_ind", label: "Phân công gia sư", onSelect: onAssign }]
            : []),
          // Chỉ lớp chưa từng có học viên (Bản nháp, Chưa mở đăng ký, Đã hủy) mới xóa được
          ...(["DRAFT", "PUBLISHED", "CANCELLED"].includes(item.status) && item.currentStudents === 0
            ? [{ icon: "delete", label: "Xóa lớp", onSelect: onDelete, tone: "danger" as const }]
            : []),
        ]}
      />
      </td>
    </tr>
  );
}
