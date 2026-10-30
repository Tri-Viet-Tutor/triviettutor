import { useEffect, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { ClassFormDialog } from "@/components/admin/ClassFormDialog";
import { ClassStatusDialog } from "@/components/admin/ClassStatusDialog";
import { AdminToast } from "@/components/admin/AdminToast";
import { CourseDetailSheet } from "@/components/admin/CourseDetailSheet";
import { CourseFormDialog } from "@/components/admin/CourseFormDialog";
import { RowMenu } from "@/components/admin/RowMenu";
import { Pager } from "@/components/dashboard/Pager";
import { PortalPageHeader } from "@/components/dashboard/PortalPageHeader";
import { PortalEmpty, PortalError, PortalLoading } from "@/components/dashboard/PortalState";
import { Icon } from "@/components/ui/Icon";
import { FOCUS_RING, PORTAL_BTN_PRIMARY, PORTAL_BTN_SECONDARY } from "@/constants/classNames";
import { GRADE_OPTIONS } from "@/constants/classOptions";
import { CLASS_STATUS } from "@/constants/labels";
import { coursePricePerSession, coursePriceTiers, gradeLabel, subjectIcon, subjectLabel, subjectOptionsFrom } from "@/constants/management";
import { useRefreshAdmin } from "@/hooks/useAdminData";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { useAdminCourses, useCourseSummary, useSubjects } from "@/hooks/useManagementData";
import type { AdminClassResponse, CourseResponse, GradeLevel } from "@/interfaces/api";
import { deleteCourse, setCourseActive } from "@/services/managementService";
import { ConfirmDeleteDialog } from "@/components/admin/ConfirmDeleteDialog";
import { displayCode } from "@/utils/classes";
import { portalErrorMessage } from "@/utils/errors";

/** Bộ lọc trạng thái bán */
type ActiveFilter = "all" | "active" | "inactive";

const PAGE_SIZE = 12;

/** Khung chung của mọi điều khiển trên thanh công cụ: cùng chiều cao 48px, cùng bo góc, cùng viền và bóng */
const CONTROL = "h-12 rounded-xl border border-brand-sandLine bg-white shadow-[0_1px_2px_rgba(20,33,61,0.05)]";

/** Thông báo nổi tự tắt sau (ms) */
const TOAST_MS = 4000;

/** Ô chọn nằm trong dải công cụ (không viền riêng) */
const STRIP_SELECT = `h-full min-w-0 cursor-pointer appearance-none bg-transparent pl-3 pr-8 text-[14px] font-medium text-brand-ink outline-none ${FOCUS_RING}`;

/**
 * Quản lý khóa học:
 * - Dải công cụ: ô tìm theo tên, lọc khối, lọc môn; nút trượt Tất cả / Đang bán / Ngừng bán.
 * - Mỗi khóa là một dòng gọn: tên, môn - khối, số buổi, học phí 1 kèm 1, trạng thái.
 * - Bấm một khóa mở ngăn chi tiết bên phải (học phí theo sĩ số, các lớp, sửa, mở / ngừng bán, tạo lớp).
 * API: GET/POST /admin/courses, PUT /admin/courses/{id}, PATCH /admin/courses/{id}/toggle.
 */
export function AdminCoursesPage() {
  const [subject, setSubject] = useState("");
  const [grade, setGrade] = useState<GradeLevel | "">("");
  const [activeFilter, setActiveFilter] = useState<ActiveFilter>("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  // Khóa đang mở ngăn chi tiết
  const [viewing, setViewing] = useState<CourseResponse | null>(null);
  const [editing, setEditing] = useState<CourseResponse | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [notice, setNotice] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  // Khóa đang tạo lớp (hộp thoại tạo lớp); null là đóng
  const [classFor, setClassFor] = useState<CourseResponse | null>(null);
  // Lớp đang đổi trạng thái / mở lại
  const [statusTarget, setStatusTarget] = useState<{ item: AdminClassResponse; mode: "status" | "reopen" } | null>(null);
  const refresh = useRefreshAdmin();

  // Tìm theo tên ở server (tham số q), chờ người dùng ngừng gõ rồi mới gọi API
  const keyword = useDebouncedValue(search.trim());
  const courses = useAdminCourses({
    q: keyword || undefined,
    subject: subject || undefined,
    gradeLevel: grade || undefined,
    active: activeFilter === "all" ? undefined : activeFilter === "active",
    page,
    size: PAGE_SIZE,
  });
  // Số khóa theo trạng thái cho nút trượt, và các môn đang có để dựng bộ lọc môn
  const summary = useCourseSummary();
  const subjectOptions = subjectOptionsFrom(useSubjects().data?.map((item) => item.code));

  // Thông báo nổi tự tắt
  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(null), TOAST_MS);
    return () => window.clearTimeout(timer);
  }, [notice]);

  const rows = courses.data?.content ?? [];

  // Đổi từ khóa tìm thì về trang đầu
  useEffect(() => setPage(0), [keyword]);

  // Ngăn chi tiết luôn hiện bản mới nhất của khóa sau khi sửa / bật tắt
  const viewingFresh = viewing ? (courses.data?.content.find((course) => course.id === viewing.id) ?? viewing) : null;

  const toggle = useMutation({
    mutationFn: (course: CourseResponse) => setCourseActive(course.id, !course.active),
    onSuccess: (course) => {
      setNotice({ tone: "ok", text: `${course.active ? "Đã mở bán" : "Đã ngừng bán"} khóa "${course.name}".` });
      setViewing((current) => (current?.id === course.id ? course : current));
      void refresh();
    },
    onError: (error) => setNotice({ tone: "error", text: portalErrorMessage(error, "Chưa đổi được trạng thái khóa học.") }),
  });

  const [removing, setRemoving] = useState<CourseResponse | null>(null);

  function openForm(course: CourseResponse | null) {
    setEditing(course);
    setDialogOpen(true);
  }

  function changeFilter(apply: () => void) {
    apply();
    setPage(0);
  }

  function clearFilters() {
    changeFilter(() => {
      setSubject("");
      setGrade("");
      setActiveFilter("all");
      setSearch("");
    });
  }

  const statusTabs: { value: ActiveFilter; label: string; count?: number }[] = [
    { value: "all", label: "Tất cả", count: summary.data?.total },
    { value: "active", label: "Đang bán", count: summary.data?.active },
    { value: "inactive", label: "Ngừng bán", count: summary.data?.inactive },
  ];
  const selectedTab = statusTabs.findIndex((tab) => tab.value === activeFilter);
  const narrowed = subject !== "" || grade !== "" || activeFilter !== "all" || search.trim() !== "";

  return (
    <div>
      <PortalPageHeader
        icon="menu_book"
        title="Khóa học"
        description="Khung chương trình theo môn và khối. Mỗi lớp học được mở từ một khóa đang bán."
      />

      {/* Dải công cụ */}
      <div className="mb-8 flex flex-col gap-4 xl:flex-row xl:items-center">
        <div className={`flex min-w-0 flex-1 items-stretch focus-within:border-brand-navy/40 ${CONTROL}`}>
          <label className="relative flex min-w-0 flex-1 items-center">
            <span className="sr-only">Lọc khóa học theo tên</span>
            <Icon name="search" className="pointer-events-none absolute left-4 text-[21px] text-brand-muted" />
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Tìm tên khóa học"
              className="h-full w-full min-w-0 rounded-l-xl bg-transparent pl-11 pr-2 text-[14.5px] outline-none placeholder:text-slate-400"
            />
          </label>
          <span aria-hidden="true" className="my-2.5 w-px bg-brand-sandLine" />
          <div className="relative flex items-center">
            <select
              aria-label="Khối lớp"
              value={grade}
              onChange={(event) => changeFilter(() => setGrade(event.target.value as GradeLevel | ""))}
              className={STRIP_SELECT}
            >
              <option value="">Mọi khối</option>
              {GRADE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <Icon name="expand_more" className="pointer-events-none absolute right-2 text-[19px] text-brand-muted" />
          </div>
          <span aria-hidden="true" className="my-2.5 w-px bg-brand-sandLine" />
          <div className="relative flex items-center">
            <select
              aria-label="Môn học"
              value={subject}
              onChange={(event) => changeFilter(() => setSubject(event.target.value))}
              className={`${STRIP_SELECT} rounded-r-xl`}
            >
              <option value="">Mọi môn</option>
              {subjectOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <Icon name="expand_more" className="pointer-events-none absolute right-2 text-[19px] text-brand-muted" />
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-4 xl:justify-start">
          {/* Nút trượt trạng thái bán */}
          <div role="tablist" aria-label="Trạng thái bán" className={`relative grid shrink-0 grid-cols-3 p-1 ${CONTROL}`}>
            <span
              aria-hidden="true"
              style={{ transform: `translateX(${selectedTab * 100}%)` }}
              className="absolute inset-y-1 left-1 w-[calc((100%-0.5rem)/3)] rounded-lg bg-brand-navy transition-transform duration-300 ease-[cubic-bezier(0.3,0.9,0.3,1)] motion-reduce:transition-none"
            />
            {statusTabs.map((tab) => {
              const selected = activeFilter === tab.value;
              return (
                <button
                  key={tab.value}
                  type="button"
                  role="tab"
                  aria-selected={selected}
                  onClick={() => changeFilter(() => setActiveFilter(tab.value))}
                  className={`relative z-10 inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg px-4 text-[13.5px] font-semibold transition-colors duration-200 ${FOCUS_RING} ${
                    selected ? "text-white" : "text-brand-muted hover:text-brand-navy"
                  }`}
                >
                  {tab.label}
                  <span className={`text-[12px] tabular-nums ${selected ? "text-white/70" : "text-brand-muted/70"}`}>
                    {tab.count ?? "–"}
                  </span>
                </button>
              );
            })}
          </div>
          <button
            type="button"
            onClick={() => openForm(null)}
            className={`inline-flex h-12 shrink-0 items-center gap-2 rounded-xl bg-brand-navy px-6 text-[14px] font-semibold text-white shadow-[0_1px_2px_rgba(20,33,61,0.12)] transition-colors hover:bg-brand-navyDeep ${FOCUS_RING}`}
          >
            <Icon name="add" className="text-[20px]" />
            Thêm khóa học
          </button>
        </div>
      </div>

      {courses.isPending ? (
        <PortalLoading label="Đang tải khóa học" rows={5} />
      ) : courses.isError ? (
        <PortalError message="Không tải được danh sách khóa học." onRetry={() => void courses.refetch()} />
      ) : rows.length === 0 ? (
        <PortalEmpty
          icon="menu_book"
          title={narrowed ? "Không có khóa nào khớp." : "Chưa có khóa học nào."}
          description={narrowed ? "Bỏ bớt bộ lọc hoặc đổi từ khóa tìm kiếm." : "Thêm khóa học đầu tiên để bắt đầu mở lớp cho học viên."}
          action={
            narrowed ? (
              <button type="button" onClick={clearFilters} className={PORTAL_BTN_SECONDARY}>
                Xóa bộ lọc
              </button>
            ) : (
              <button type="button" onClick={() => openForm(null)} className={PORTAL_BTN_PRIMARY}>
                <Icon name="add" className="text-[20px]" />
                Thêm khóa học
              </button>
            )
          }
        />
      ) : (
        <>
          <div className="overflow-x-auto rounded-2xl border border-brand-sandLine bg-white shadow-[0_1px_2px_rgba(20,33,61,0.05)]">
            <table className="w-full min-w-[860px] border-collapse text-left">
              <thead>
                <tr className="border-b border-brand-sandLine bg-brand-sand/60 text-[12px] font-bold uppercase tracking-wide text-brand-muted">
                  <th scope="col" className="w-[88px] px-5 py-3">Mã</th>
                  <th scope="col" className="px-4 py-3">Khóa học</th>
                  <th scope="col" className="w-[170px] px-4 py-3 text-right">1 kèm 1 / buổi (VNĐ)</th>
                  <th scope="col" className="w-[190px] px-4 py-3 text-right">Lớp nhóm / buổi (VNĐ)</th>
                  <th scope="col" className="w-[140px] px-4 py-3">Trạng thái</th>
                  <th scope="col" className="w-[64px] px-4 py-3 text-right">
                    <span className="sr-only">Thao tác</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-sandLine">
                {rows.map((course) => (
                  <CourseRow
                    key={course.id}
                    course={course}
                    selected={viewingFresh?.id === course.id}
                    toggling={toggle.isPending && toggle.variables?.id === course.id}
                    onOpen={() => setViewing(course)}
                    onEdit={() => openForm(course)}
                    onCreateClass={() => setClassFor(course)}
                    onToggle={() => toggle.mutate(course)}
                    onDelete={() => setRemoving(course)}
                  />
                ))}
              </tbody>
            </table>
          </div>
          <Pager page={page} totalPages={courses.data.totalPages} onChange={setPage} label="Phân trang khóa học" />
        </>
      )}

      <AdminToast notice={notice} onClose={() => setNotice(null)} />
      <ConfirmDeleteDialog
        open={removing !== null}
        title="Xóa khóa học"
        message={removing ? `Xóa khóa "${removing.name}"? Chỉ xóa được khóa chưa từng mở lớp hay có đơn hàng.` : ""}
        onClose={() => setRemoving(null)}
        onConfirm={async () => {
          if (!removing) return;
          await deleteCourse(removing.id);
          setNotice({ tone: "ok", text: `Đã xóa khóa "${removing.name}".` });
          setViewing((current) => (current?.id === removing.id ? null : current));
          setRemoving(null);
          void refresh();
        }}
      />
      <CourseDetailSheet
        course={viewingFresh}
        onClose={() => setViewing(null)}
        toggling={toggle.isPending && toggle.variables?.id === viewingFresh?.id}
        onEdit={openForm}
        onToggle={(course) => toggle.mutate(course)}
        onCreateClass={setClassFor}
        onChangeStatus={(item, mode) => setStatusTarget({ item, mode })}
      />
      <CourseFormDialog
        open={dialogOpen}
        course={editing}
        onClose={() => setDialogOpen(false)}
        onSaved={(saved, { createClass }) => {
          const isNew = editing === null;
          setDialogOpen(false);
          void refresh();
          setViewing(saved);
          if (isNew) {
            setNotice({
              tone: "ok",
              text: createClass
                ? `Đã tạo khóa "${saved.name}". Chọn lịch học cho lớp đầu tiên.`
                : `Đã tạo khóa "${saved.name}". Bạn có thể tạo lớp bất cứ lúc nào trong phần chi tiết khóa.`,
            });
            if (createClass) setClassFor(saved);
          } else {
            setNotice({ tone: "ok", text: `Đã lưu khóa "${saved.name}".` });
          }
        }}
      />
      <ClassFormDialog
        open={classFor !== null}
        initialCourseId={classFor?.id}
        onClose={() => setClassFor(null)}
        onSaved={(saved) => {
          setClassFor(null);
          setNotice({
            tone: "ok",
            text: `Đã tạo lớp ${saved.classCode} ở dạng nháp. Chuyển lớp sang "Đang tuyển sinh" để học viên thấy và đăng ký.`,
          });
          void refresh();
        }}
      />
      <ClassStatusDialog
        classItem={statusTarget?.item ?? null}
        mode={statusTarget?.mode ?? "status"}
        onClose={() => setStatusTarget(null)}
        onSaved={(saved) => {
          setStatusTarget(null);
          setNotice({ tone: "ok", text: `Lớp ${saved.classCode}: ${CLASS_STATUS[saved.status].label}.` });
          void refresh();
        }}
      />
    </div>
  );
}

/**
 * Một khóa ở dạng dòng gọn: ảnh bìa, tên, môn - khối, số buổi, học phí 1 kèm 1, trạng thái, menu ⋮.
 * Bấm vào thẻ mở ngăn chi tiết. Màn hình hẹp: các cột gộp thành hai dòng dưới tên khóa.
 */
function CourseRow({
  course,
  selected,
  toggling,
  onOpen,
  onEdit,
  onCreateClass,
  onToggle,
  onDelete,
}: {
  course: CourseResponse;
  onDelete: () => void;
  selected: boolean;
  toggling: boolean;
  onOpen: () => void;
  onEdit: () => void;
  onCreateClass: () => void;
  onToggle: () => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const number = (amount: number) => new Intl.NumberFormat("vi-VN").format(amount);

  return (
    <tr className={`transition-colors ${selected ? "bg-brand-tint/60" : "hover:bg-brand-sand/30"} ${menuOpen ? "relative z-20" : ""}`}>
      <td className="px-5 py-3.5">
        <span className={`font-mono text-[13px] font-bold ${course.active ? "text-brand-navy" : "text-brand-muted"}`}>{displayCode("course", course.id)}</span>
      </td>
      <td className="px-4 py-3.5">
        <span className="flex min-w-0 items-center gap-3">
          <span
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${course.active ? "bg-brand-tint text-brand-navy" : "bg-slate-100 text-slate-500"}`}
          >
            <Icon name={subjectIcon(course.subject)} className="text-[21px]" />
          </span>
          <span className="min-w-0">
            <button
              type="button"
              onClick={onOpen}
              className="block truncate text-left text-[15px] font-bold text-brand-ink hover:text-brand-navy focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-navy"
            >
              {course.name}
            </button>
            <span className="block text-[13px] text-brand-muted">
              {subjectLabel(course.subject)} - {gradeLabel(course.gradeLevel)}
            </span>
          </span>
        </span>
      </td>
      <td className="px-4 py-3.5 text-right text-[15px] font-bold tabular-nums text-brand-ink">{number(coursePricePerSession(course))}</td>
      <td className="px-4 py-3.5 text-right">
        <span className="text-[12px] text-brand-muted">từ </span>
        <span className="text-[15px] font-bold tabular-nums text-brand-navy">{number(groupFrom(course))}</span>
      </td>
      <td className="px-4 py-3.5">
        <SaleBadge active={course.active} />
      </td>
      <td className="relative px-4 py-3.5 text-right">
        <RowMenu
          label={`khóa ${course.name}`}
          open={menuOpen}
          onOpenChange={setMenuOpen}
          items={[
            { icon: "edit", label: "Sửa", onSelect: onEdit },
            {
              icon: "add_circle",
              label: "Tạo lớp",
              onSelect: onCreateClass,
              disabled: !course.active,
              hint: course.active ? undefined : "Mở bán khóa trước",
            },
            {
              icon: course.active ? "pause_circle" : "play_circle",
              label: course.active ? "Ngừng bán" : "Mở bán",
              onSelect: onToggle,
              disabled: toggling,
              tone: course.active ? "danger" : undefined,
            },
            { icon: "delete", label: "Xóa", onSelect: onDelete, tone: "danger" },
          ]}
        />
      </td>
    </tr>
  );
}

/**
 * Nhãn trạng thái bán màu pastel.
 * Ngừng bán: nền xám có viền và chấm rỗng để đọc ra ngay là đang tắt.
 */
function SaleBadge({ active }: { active: boolean }) {
  return active ? (
    <span className="inline-flex items-center gap-2 whitespace-nowrap rounded-full bg-emerald-50 px-3 py-1 text-[12.5px] font-semibold text-emerald-800 ring-1 ring-inset ring-emerald-600/15">
      <span aria-hidden="true" className="h-2 w-2 rounded-full bg-emerald-500" />
      Đang bán
    </span>
  ) : (
    <span className="inline-flex items-center gap-2 whitespace-nowrap rounded-full bg-slate-100 px-3 py-1 text-[12.5px] font-semibold text-slate-700 ring-1 ring-inset ring-slate-300">
      <span aria-hidden="true" className="h-2 w-2 rounded-full border-[1.5px] border-slate-500" />
      Ngừng bán
    </span>
  );
}

/** Học phí mỗi buổi thấp nhất của lớp nhóm (bậc sĩ số đông nhất) */
function groupFrom(course: CourseResponse): number {
  const group = coursePriceTiers(course).filter((tier) => tier.discountRate > 0).map((tier) => tier.price);
  return group.length > 0 ? Math.min(...group) : coursePricePerSession(course);
}
