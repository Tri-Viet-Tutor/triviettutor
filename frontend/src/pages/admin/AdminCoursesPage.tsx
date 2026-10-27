import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { ClassFormDialog } from "@/components/admin/ClassFormDialog";
import { ClassStatusDialog } from "@/components/admin/ClassStatusDialog";
import { CourseClassesPanel } from "@/components/admin/CourseClassesPanel";
import { CourseFormDialog } from "@/components/admin/CourseFormDialog";
import { FilterTabs } from "@/components/dashboard/FilterTabs";
import { Pager } from "@/components/dashboard/Pager";
import { PortalPageHeader } from "@/components/dashboard/PortalPageHeader";
import { PortalEmpty, PortalError, PortalLoading } from "@/components/dashboard/PortalState";
import { StatTile } from "@/components/dashboard/StatTile";
import { StatusChip } from "@/components/dashboard/StatusChip";
import { Icon } from "@/components/ui/Icon";
import { PORTAL_BTN_ACCENT, PORTAL_BTN_GHOST, PORTAL_CARD, PORTAL_INPUT } from "@/constants/classNames";
import { GRADE_OPTIONS } from "@/constants/classOptions";
import { SUBJECT_OPTIONS, gradeLabel, subjectIcon, subjectLabel } from "@/constants/management";
import { useAdminCourses } from "@/hooks/useManagementData";
import { useRefreshAdmin } from "@/hooks/useAdminData";
import { toggleCourse } from "@/services/managementService";
import { formatVnd } from "@/utils/currency";
import { portalErrorMessage } from "@/utils/errors";
import { CLASS_STATUS } from "@/constants/labels";
import type { AdminClassResponse, CourseResponse, GradeLevel } from "@/interfaces/api";

/** Bộ lọc trạng thái bán */
type ActiveFilter = "all" | "active" | "inactive";

const PAGE_SIZE = 12;

/**
 * Quản lý khóa học: danh sách theo môn / khối / trạng thái bán, tạo, sửa và bật / tắt bán.
 * Mỗi khóa có phần "Lớp học" để xem và tạo lớp ngay trong khóa; tạo khóa mới xong thì mở luôn bước tạo lớp.
 * API: GET/POST /admin/courses, PUT /admin/courses/{id}, PATCH /admin/courses/{id}/toggle.
 */
export function AdminCoursesPage() {
  const [subject, setSubject] = useState("");
  const [grade, setGrade] = useState<GradeLevel | "">("");
  const [activeFilter, setActiveFilter] = useState<ActiveFilter>("all");
  const [page, setPage] = useState(0);
  const [editing, setEditing] = useState<CourseResponse | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [notice, setNotice] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  // Khóa đang mở phần "Lớp học"
  const [expandedCourse, setExpandedCourse] = useState<number | null>(null);
  // Khóa đang tạo lớp (hộp thoại tạo lớp); null là đóng
  const [classFor, setClassFor] = useState<CourseResponse | null>(null);
  // Lớp đang đổi trạng thái / mở lại
  const [statusTarget, setStatusTarget] = useState<{ item: AdminClassResponse; mode: "status" | "reopen" } | null>(null);
  const refresh = useRefreshAdmin();

  const courses = useAdminCourses({
    subject: subject || undefined,
    gradeLevel: grade || undefined,
    active: activeFilter === "all" ? undefined : activeFilter === "active",
    page,
    size: PAGE_SIZE,
  });
  // Đếm nhanh cho các ô số liệu
  const activeCount = useAdminCourses({ active: true, size: 1 });
  const inactiveCount = useAdminCourses({ active: false, size: 1 });

  const toggle = useMutation({
    mutationFn: (course: CourseResponse) => toggleCourse(course.id),
    onSuccess: (course) => {
      setNotice({ tone: "ok", text: `${course.active ? "Đã mở bán" : "Đã ngừng bán"} khóa "${course.name}".` });
      void refresh();
    },
    onError: (error) => setNotice({ tone: "error", text: portalErrorMessage(error, "Chưa đổi được trạng thái khóa học.") }),
  });

  function openForm(course: CourseResponse | null) {
    setEditing(course);
    setDialogOpen(true);
  }

  const count = (value: number | undefined) => (value === undefined ? "–" : String(value));

  return (
    <div>
      <PortalPageHeader
        icon="menu_book"
        title="Khóa học"
        description="Khung chương trình của từng môn và khối lớp. Lớp học mở ra từ khóa đang bán."
        action={
          <button type="button" onClick={() => openForm(null)} className={PORTAL_BTN_ACCENT}>
            <Icon name="add" className="text-[20px]" />
            Thêm khóa học
          </button>
        }
      />

      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <StatTile
          icon="library_books"
          label="Tổng số khóa"
          value={count(
            courses.data && activeCount.data && inactiveCount.data
              ? activeCount.data.totalElements + inactiveCount.data.totalElements
              : undefined,
          )}
        />
        <StatTile icon="storefront" tone="green" label="Đang bán" value={count(activeCount.data?.totalElements)} />
        <StatTile icon="pause_circle" tone="orange" label="Ngừng bán" value={count(inactiveCount.data?.totalElements)} />
      </div>

      {/* Bộ lọc */}
      <div className={`mb-5 flex flex-col gap-3 p-3 sm:p-4 lg:flex-row lg:items-center lg:justify-between ${PORTAL_CARD}`}>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => {
              setSubject("");
              setPage(0);
            }}
            className={`inline-flex h-9 items-center gap-1.5 rounded-full px-3.5 text-[13.5px] font-semibold transition-colors ${
              subject === "" ? "bg-brand-navy text-white" : "bg-brand-sand text-brand-muted hover:text-brand-navy"
            }`}
          >
            Tất cả môn
          </button>
          {SUBJECT_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => {
                setSubject(option.value);
                setPage(0);
              }}
              className={`inline-flex h-9 items-center gap-1.5 rounded-full px-3.5 text-[13.5px] font-semibold transition-colors ${
                subject === option.value ? "bg-brand-navy text-white" : "bg-brand-sand text-brand-muted hover:text-brand-navy"
              }`}
            >
              <Icon name={option.icon} className="text-[17px]" />
              {option.label}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select
            aria-label="Khối lớp"
            value={grade}
            onChange={(event) => {
              setGrade(event.target.value as GradeLevel | "");
              setPage(0);
            }}
            className={`${PORTAL_INPUT} w-auto min-w-[130px]`}
          >
            <option value="">Mọi khối</option>
            {GRADE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <FilterTabs
            label="Trạng thái bán"
            value={activeFilter}
            onChange={(value) => {
              setActiveFilter(value);
              setPage(0);
            }}
            tabs={[
              { value: "all", label: "Tất cả" },
              { value: "active", label: "Đang bán" },
              { value: "inactive", label: "Ngừng bán" },
            ]}
          />
        </div>
      </div>

      {notice && (
        <p
          role="status"
          className={`mb-4 flex items-center gap-2 rounded-xl px-4 py-3 text-[14px] font-medium ${
            notice.tone === "ok" ? "bg-emerald-50 text-emerald-800" : "bg-red-50 text-red-700"
          }`}
        >
          <Icon name={notice.tone === "ok" ? "check_circle" : "error"} className="text-[19px]" />
          {notice.text}
        </p>
      )}

      {courses.isPending ? (
        <PortalLoading label="Đang tải khóa học" rows={4} />
      ) : courses.isError ? (
        <PortalError message="Không tải được danh sách khóa học." onRetry={() => void courses.refetch()} />
      ) : courses.data.content.length === 0 ? (
        <PortalEmpty
          icon="menu_book"
          title="Chưa có khóa học phù hợp"
          description="Đổi bộ lọc hoặc thêm khóa học mới để bắt đầu mở lớp."
          action={
            <button type="button" onClick={() => openForm(null)} className={PORTAL_BTN_ACCENT}>
              <Icon name="add" className="text-[20px]" />
              Thêm khóa học
            </button>
          }
        />
      ) : (
        <>
          <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {courses.data.content.map((course) => (
              <li
                key={course.id}
                className={`group flex flex-col overflow-hidden transition-shadow ${expandedCourse === course.id ? "md:col-span-2 xl:col-span-3" : ""} hover:shadow-[0_20px_40px_-24px_rgba(11,58,140,0.45)] ${PORTAL_CARD}`}
              >
                <div className="relative flex items-start gap-3 bg-gradient-to-br from-brand-tint to-white px-5 pb-4 pt-5">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-navy text-white">
                    <Icon name={subjectIcon(course.subject)} className="text-[23px]" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[12.5px] font-bold uppercase tracking-wide text-brand-orangeHover">
                      {subjectLabel(course.subject)} · {gradeLabel(course.gradeLevel)}
                    </p>
                    <h2 className="mt-0.5 line-clamp-2 text-[16.5px] font-bold leading-snug text-brand-ink">{course.name}</h2>
                  </div>
                  <StatusChip tone={course.active ? "green" : "slate"} icon={course.active ? "storefront" : "pause_circle"}>
                    {course.active ? "Đang bán" : "Ngừng bán"}
                  </StatusChip>
                </div>

                <div className="flex flex-1 flex-col px-5 pb-4">
                  <p className="text-[22px] font-extrabold tracking-tight text-brand-navy tabular-nums">
                    {formatVnd(course.basePrice1on1)}
                    <span className="ml-1 text-[13px] font-medium text-brand-muted">/ khóa 1 kèm 1</span>
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2 text-[13.5px] text-brand-muted">
                    <span className="inline-flex items-center gap-1 rounded-lg bg-brand-sand px-2.5 py-1">
                      <Icon name="event_repeat" className="text-[16px] text-brand-navy" />
                      {course.totalSessions} buổi
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-lg bg-brand-sand px-2.5 py-1">
                      <Icon name="timer" className="text-[16px] text-brand-navy" />
                      {course.durationMinutes} phút / buổi
                    </span>
                  </div>
                  {course.description && (
                    <p className="mt-3 line-clamp-2 text-[14px] leading-relaxed text-brand-muted">{course.description}</p>
                  )}
                </div>

                <div className="flex items-center justify-between gap-2 border-t border-brand-sandLine px-3 py-2">
                  <div className="flex items-center gap-1">
                    <button type="button" onClick={() => openForm(course)} className={PORTAL_BTN_GHOST}>
                      <Icon name="edit" className="text-[18px]" />
                      Sửa
                    </button>
                    <button
                      type="button"
                      aria-expanded={expandedCourse === course.id}
                      onClick={() => setExpandedCourse(expandedCourse === course.id ? null : course.id)}
                      className={PORTAL_BTN_GHOST}
                    >
                      <Icon name="school" className="text-[18px]" />
                      Lớp học
                      <Icon name={expandedCourse === course.id ? "expand_less" : "expand_more"} className="text-[18px]" />
                    </button>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={course.active}
                    disabled={toggle.isPending && toggle.variables?.id === course.id}
                    onClick={() => toggle.mutate(course)}
                    className="inline-flex items-center gap-2 rounded-lg px-2 py-1.5 text-[13.5px] font-semibold text-brand-muted hover:text-brand-navy disabled:opacity-50"
                  >
                    {course.active ? "Ngừng bán" : "Mở bán"}
                    <span
                      aria-hidden="true"
                      className={`relative h-6 w-11 rounded-full transition-colors ${course.active ? "bg-emerald-500" : "bg-slate-300"}`}
                    >
                      <span
                        className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-[left] ${course.active ? "left-[22px]" : "left-0.5"}`}
                      />
                    </span>
                  </button>
                </div>
                {expandedCourse === course.id && (
                  <CourseClassesPanel
                    course={course}
                    onCreate={() => setClassFor(course)}
                    onChangeStatus={(item, mode) => setStatusTarget({ item, mode })}
                  />
                )}
              </li>
            ))}
          </ul>
          <Pager page={page} totalPages={courses.data.totalPages} onChange={setPage} label="Phân trang khóa học" />
        </>
      )}

      <CourseFormDialog
        open={dialogOpen}
        course={editing}
        onClose={() => setDialogOpen(false)}
        onSaved={(saved) => {
          const isNew = editing === null;
          setDialogOpen(false);
          void refresh();
          if (isNew && saved.active) {
            setNotice({ tone: "ok", text: `Đã tạo khóa "${saved.name}". Tạo lớp đầu tiên cho khóa này để học viên đăng ký.` });
            setExpandedCourse(saved.id);
            setClassFor(saved);
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
          setExpandedCourse(saved.courseId);
          setNotice({
            tone: "ok",
            text: `Đã tạo lớp ${saved.classCode} (bản nháp). Bấm "Đổi trạng thái" để mở tuyển sinh thì học viên mới thấy lớp.`,
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
